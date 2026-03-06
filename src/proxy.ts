import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from "next-intl/middleware";

import {
  resolveUserI18nPreferences,
  updateSession,
} from '@/lib/supabase/proxy';
import {
  LANGUAGE_COOKIE,
  LANGUAGE_HEADER,
  REGION_COOKIE,
  REGION_HEADER,
} from '@/lib/i18n/constants';
import {
  getDefaultRegionForLanguage,
  getLanguageFromPathname,
  isLanguageCode,
  isRegionCode,
  localizePath,
  resolveLanguageFromAcceptLanguage,
  resolveRegionFromGeoHeaders,
  type LanguageCode,
  type RegionCode,
} from '@/lib/i18n/locales';
import {
  resolveDetectedLanguageForProxy,
  resolveRoutingLanguageForProxy,
} from '@/lib/i18n/proxy-language';
import { routing } from "@/i18n/routing";

const PASSTHROUGH_PATHS = ['/api', '/auth/callback', '/auth/logout', '/_next', '/favicon.ico'];
const PUBLIC_FILE_REGEX = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$/i;
const I18N_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const handleI18nRouting = createMiddleware(routing);

function shouldBypassI18n(pathname: string): boolean {
  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return true;
  }

  return PASSTHROUGH_PATHS.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function resolveLanguageFromCookie(request: NextRequest): LanguageCode | null {
  const cookieLanguage = request.cookies.get(LANGUAGE_COOKIE)?.value;
  return cookieLanguage && isLanguageCode(cookieLanguage) ? cookieLanguage : null;
}

function resolveRegionFromCookie(request: NextRequest): RegionCode | null {
  const cookieRegion = request.cookies.get(REGION_COOKIE)?.value;
  return cookieRegion && isRegionCode(cookieRegion) ? cookieRegion : null;
}

function createRedirectResponse(
  request: NextRequest,
  responseWithCookies: NextResponse,
  pathname: string
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirectResponse = NextResponse.redirect(url);

  for (const cookie of responseWithCookies.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypassI18n(pathname)) {
    return await updateSession(request);
  }

  const i18nResponse = handleI18nRouting(request);
  const languageFromPath = getLanguageFromPathname(pathname);
  const cookieLanguage = resolveLanguageFromCookie(request);
  const acceptLanguage = resolveLanguageFromAcceptLanguage(
    request.headers.get('accept-language')
  );

  const detectedLanguage = resolveDetectedLanguageForProxy({
    languageFromPath,
    cookieLanguage,
    acceptLanguage,
  });
  const detectedRegion =
    resolveRegionFromCookie(request) ??
    resolveRegionFromGeoHeaders({
      vercelCountry: request.headers.get('x-vercel-ip-country'),
      cloudflareCountry: request.headers.get('cf-ipcountry'),
      fallbackLanguage: detectedLanguage,
    }) ??
    getDefaultRegionForLanguage(detectedLanguage);

  const { response: responseWithSession, preferences } =
    await resolveUserI18nPreferences(request, {
      existingResponse: i18nResponse,
      requestedLanguage: languageFromPath,
      detectedLanguage,
    });

  const persistedUiLanguage = preferences.uiLanguage ?? detectedLanguage;
  const resolvedLanguage = resolveRoutingLanguageForProxy({
    languageFromPath,
    persistedLanguage: persistedUiLanguage,
    detectedLanguage,
  });
  const resolvedRegion = detectedRegion;
  const localizedPath = localizePath(pathname, resolvedLanguage);

  const response =
    localizedPath !== pathname
      ? createRedirectResponse(request, responseWithSession, localizedPath)
      : responseWithSession;

  response.cookies.set(LANGUAGE_COOKIE, resolvedLanguage, {
    path: '/',
    sameSite: 'lax',
    maxAge: I18N_COOKIE_MAX_AGE,
  });
  response.cookies.set(REGION_COOKIE, resolvedRegion, {
    path: '/',
    sameSite: 'lax',
    maxAge: I18N_COOKIE_MAX_AGE,
  });
  response.headers.set(LANGUAGE_HEADER, resolvedLanguage);
  response.headers.set(REGION_HEADER, resolvedRegion);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};

export default proxy;
