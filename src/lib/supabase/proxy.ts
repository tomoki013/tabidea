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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  const { supabase, supabaseResponse } = getSupabaseProxyClient(
    request,
    existingResponse
  );

  if (!supabase) {
    // If Supabase is not configured, just pass through
    return supabaseResponse;
  }

  // IMPORTANT: Do not run code between createServerClient and auth.getUser()
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.

  await supabase.auth.getUser();

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      response: supabaseResponse,
      preferences: {
        uiLanguage: options.detectedLanguage,
      },
    };
  }

  const { data } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', user.id)
    .maybeSingle();

  const metadata = (isPlainObject(data?.metadata) ? data.metadata : {}) as UserMetadata;

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

    await supabase
      .from('users')
      .update({ metadata: nextMetadata })
      .eq('id', user.id);
  }

  return {
    response: supabaseResponse,
    preferences: {
      uiLanguage: resolvedUiLanguage,
    },
  };
}
