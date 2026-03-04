import { type NextRequest } from 'next/server';
import createMiddleware from "next-intl/middleware";

import { updateSession } from '@/lib/supabase/proxy';
import { LANGUAGE_COOKIE, LANGUAGE_HEADER } from '@/lib/i18n/constants';
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  type LanguageCode,
} from '@/lib/i18n/locales';
import { routing } from "@/i18n/routing";

const PASSTHROUGH_PATHS = ['/api', '/auth/callback', '/auth/logout', '/_next', '/favicon.ico'];
const PUBLIC_FILE_REGEX = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$/i;
const handleI18nRouting = createMiddleware(routing);

function shouldBypassI18n(pathname: string): boolean {
  if (PUBLIC_FILE_REGEX.test(pathname)) {
    return true;
  }

  return PASSTHROUGH_PATHS.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypassI18n(pathname)) {
    return await updateSession(request);
  }

  const i18nResponse = handleI18nRouting(request);
  const languageFromPath = getLanguageFromPathname(pathname);
  const language: LanguageCode = languageFromPath ?? DEFAULT_LANGUAGE;

  i18nResponse.cookies.set(LANGUAGE_COOKIE, language, {
    path: '/',
    sameSite: 'lax',
  });
  i18nResponse.headers.set(LANGUAGE_HEADER, language);

  return await updateSession(request, i18nResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};

export default proxy;
