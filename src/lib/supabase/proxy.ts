/**
 * Supabase proxy utilities
 * For use in Next.js proxy to handle session refresh
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getDefaultRegionForLanguage,
  isLanguageCode,
  isRegionCode,
  resolveRegionalLocale,
  type LanguageCode,
  type RegionCode,
} from '@/lib/i18n/locales';

type UserMetadata = Record<string, unknown>;

type ProxyI18nPreferences = {
  language?: LanguageCode;
  region?: RegionCode;
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
    detectedLanguage: LanguageCode;
    detectedRegion: RegionCode;
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
        language: options.detectedLanguage,
        region: options.detectedRegion,
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
        language: options.detectedLanguage,
        region: options.detectedRegion,
      },
    };
  }

  const { data } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', user.id)
    .maybeSingle();

  const metadata = (isPlainObject(data?.metadata) ? data.metadata : {}) as UserMetadata;

  const storedLanguage = isLanguageCode(String(metadata.preferredLanguage))
    ? (metadata.preferredLanguage as LanguageCode)
    : undefined;
  const storedRegion = isRegionCode(String(metadata.preferredRegion))
    ? (metadata.preferredRegion as RegionCode)
    : undefined;

  const resolvedLanguage = storedLanguage ?? options.detectedLanguage;
  const resolvedRegion =
    storedRegion ??
    options.detectedRegion ??
    getDefaultRegionForLanguage(resolvedLanguage);

  if (!storedLanguage || !storedRegion) {
    const nextMetadata: UserMetadata = { ...metadata };
    if (!storedLanguage) {
      nextMetadata.preferredLanguage = resolvedLanguage;
    }
    if (!storedRegion) {
      nextMetadata.preferredRegion = resolvedRegion;
    }
    nextMetadata.preferredLocale = resolveRegionalLocale(
      resolvedLanguage,
      resolvedRegion
    );

    await supabase
      .from('users')
      .update({ metadata: nextMetadata })
      .eq('id', user.id);
  }

  return {
    response: supabaseResponse,
    preferences: {
      language: resolvedLanguage,
      region: resolvedRegion,
    },
  };
}
