/**
 * Supabase proxy utilities
 * For use in Next.js proxy to handle session refresh
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  isLanguageCode,
  type LanguageCode,
} from '@/lib/i18n/locales';

type UserMetadata = Record<string, unknown>;

type ProxyI18nPreferences = {
  uiLanguage?: LanguageCode;
};

const SUPABASE_PROXY_TIMEOUT_MS = 1_500;
const SUPABASE_AUTH_COOKIE_MARKER = '-auth-token';
const SUPABASE_AUTH_COOKIE_PREFIX = 'sb-';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) =>
    name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) && name.includes(SUPABASE_AUTH_COOKIE_MARKER)
  );
}

async function withProxyDeadline<T>(task: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race<T | null>([
      task(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), SUPABASE_PROXY_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('The signal has been aborted'))
    ) {
      return null;
    }

    throw error;
  }
}

function createPassthroughResponse(
  request: NextRequest,
  existingResponse?: NextResponse
): NextResponse {
  return existingResponse ?? NextResponse.next({ request });
}

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getSupabaseProxyClient(
  request: NextRequest,
  existingResponse?: NextResponse
) {
  const supabaseResponse =
    existingResponse ??
    NextResponse.next({
      request,
    });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { supabase: null, supabaseResponse };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, supabaseResponse };
}

export async function updateSession(
  request: NextRequest,
  existingResponse?: NextResponse
) {
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookies(request)) {
    // If Supabase is not configured, or the visitor is anonymous, just pass through.
    return createPassthroughResponse(request, existingResponse);
  }

  const { supabase, supabaseResponse } = getSupabaseProxyClient(
    request,
    existingResponse
  );

  if (!supabase) {
    return supabaseResponse;
  }

  // IMPORTANT: Do not run code between createServerClient and auth.getUser()
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.

  await withProxyDeadline(() => supabase.auth.getUser());

  return supabaseResponse;
}

export async function resolveUserI18nPreferences(
  request: NextRequest,
  options: {
    existingResponse?: NextResponse;
    requestedLanguage?: LanguageCode | null;
    detectedLanguage: LanguageCode;
  }
): Promise<{ response: NextResponse; preferences: ProxyI18nPreferences }> {
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookies(request)) {
    return {
      response: createPassthroughResponse(request, options.existingResponse),
      preferences: {
        uiLanguage: options.detectedLanguage,
      },
    };
  }

  const { supabase, supabaseResponse } = getSupabaseProxyClient(
    request,
    options.existingResponse
  );

  if (!supabase) {
    return {
      response: supabaseResponse,
      preferences: {
        uiLanguage: options.detectedLanguage,
      },
    };
  }

  const userResult = await withProxyDeadline(() => supabase.auth.getUser());

  if (!userResult) {
    return {
      response: supabaseResponse,
      preferences: {
        uiLanguage: options.detectedLanguage,
      },
    };
  }

  const {
    data: { user },
    error: userError,
  } = userResult;

  if (userError || !user) {
    return {
      response: supabaseResponse,
      preferences: {
        uiLanguage: options.detectedLanguage,
      },
    };
  }

  const profileResult = await withProxyDeadline(async () =>
    await supabase
      .from('users')
      .select('metadata')
      .eq('id', user.id)
      .maybeSingle()
  );

  if (!profileResult) {
    return {
      response: supabaseResponse,
      preferences: {
        uiLanguage: options.detectedLanguage,
      },
    };
  }

  const metadata = (isPlainObject(profileResult.data?.metadata) ? profileResult.data.metadata : {}) as UserMetadata;

  const storedUiLanguage = isLanguageCode(String(metadata.uiLanguage))
    ? (metadata.uiLanguage as LanguageCode)
    : undefined;
  const legacyPreferredLanguage = isLanguageCode(String(metadata.preferredLanguage))
    ? (metadata.preferredLanguage as LanguageCode)
    : undefined;
  const resolvedUiLanguage =
    options.requestedLanguage ??
    storedUiLanguage ??
    legacyPreferredLanguage ??
    options.detectedLanguage;
  const shouldPersistUiLanguage =
    !storedUiLanguage ||
    (options.requestedLanguage !== null &&
      options.requestedLanguage !== undefined &&
      options.requestedLanguage !== storedUiLanguage);

  if (shouldPersistUiLanguage) {
    const nextMetadata: UserMetadata = { ...metadata };
    nextMetadata.uiLanguage = resolvedUiLanguage;

    await withProxyDeadline(async () =>
      await supabase
        .from('users')
        .update({ metadata: nextMetadata })
        .eq('id', user.id)
    );
  }

  return {
    response: supabaseResponse,
    preferences: {
      uiLanguage: resolvedUiLanguage,
    },
  };
}
