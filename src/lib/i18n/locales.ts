import {
  DEFAULT_LANGUAGE as GENERATED_DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES as GENERATED_SUPPORTED_LANGUAGES,
} from "@/lib/i18n/generated-locales";
import {
  SUPPORTED_REGIONS,
  getDefaultHomeBaseCityForRegion,
  getDefaultRegionForLanguage,
  isRegionCode,
  type RegionCode,
} from "@/lib/i18n/regions";

export const SUPPORTED_LANGUAGES = GENERATED_SUPPORTED_LANGUAGES;
export type LanguageCode = (typeof GENERATED_SUPPORTED_LANGUAGES)[number];
export type RegionalLocale = string;

export const DEFAULT_LANGUAGE: LanguageCode = GENERATED_DEFAULT_LANGUAGE as LanguageCode;
export const DEFAULT_REGION: RegionCode = getDefaultRegionForLanguage(DEFAULT_LANGUAGE);
export const DEFAULT_REGIONAL_LOCALE: RegionalLocale = "ja-JP";

const REGIONAL_LOCALE_BY_LANGUAGE_AND_REGION: Record<
  string,
  Partial<Record<RegionCode, RegionalLocale>>
> = {
  en: {
    US: "en-US",
  },
  ja: {
    JP: "ja-JP",
  },
};

const OPEN_GRAPH_LOCALE_BY_LANGUAGE: Record<string, string> = {
  en: "en_US",
  ja: "ja_JP",
};

export const SUPPORTED_REGIONAL_LOCALES = Object.freeze(
  Array.from(
    new Set(
      Object.values(REGIONAL_LOCALE_BY_LANGUAGE_AND_REGION).flatMap((regionMap) =>
        Object.values(regionMap)
      )
    )
  )
) as readonly string[];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveSupportedLanguage(value: string): LanguageCode | null {
  const normalized = value.trim().toLowerCase();
  for (const supportedLanguage of SUPPORTED_LANGUAGES) {
    if (supportedLanguage.toLowerCase() === normalized) {
      return supportedLanguage;
    }
  }
  return null;
}

function resolveFromLanguageTag(tag: string): LanguageCode | null {
  const normalizedTag = tag.trim().toLowerCase();
  const exact = resolveSupportedLanguage(normalizedTag);
  if (exact) {
    return exact;
  }

  const baseLanguage = normalizedTag.split("-")[0];
  if (!baseLanguage) {
    return null;
  }

  const baseMatch = resolveSupportedLanguage(baseLanguage);
  if (baseMatch) {
    return baseMatch;
  }

  for (const supportedLanguage of SUPPORTED_LANGUAGES) {
    if (supportedLanguage.toLowerCase().startsWith(`${baseLanguage}-`)) {
      return supportedLanguage;
    }
  }

  return null;
}

function isIsoRegion(value: string): boolean {
  return /^[A-Z]{2}$/.test(value);
}

export function isLanguageCode(value: string): value is LanguageCode {
  return SUPPORTED_LANGUAGES.includes(value as LanguageCode);
}

export function isRegionalLocale(value: string): value is RegionalLocale {
  return /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value);
}

export function resolveRegionalLocale(
  language: LanguageCode,
  region?: RegionCode
): RegionalLocale {
  const resolvedRegion = region ?? getDefaultRegionForLanguage(language);
  const languageMap = REGIONAL_LOCALE_BY_LANGUAGE_AND_REGION[language];

  const mapped =
    languageMap?.[resolvedRegion] ??
    languageMap?.[getDefaultRegionForLanguage(language)];
  if (mapped) {
    return mapped;
  }

  if (/^[a-z]{2,3}-[A-Z]{2}$/.test(language)) {
    return language;
  }

  const regionForLocale = isIsoRegion(resolvedRegion) ? resolvedRegion : "US";
  return `${language}-${regionForLocale}`;
}

export function resolveOpenGraphLocale(language: LanguageCode): string {
  const mapped = OPEN_GRAPH_LOCALE_BY_LANGUAGE[language];
  if (mapped) {
    return mapped;
  }

  const regionalLocale = resolveRegionalLocale(language);
  const [lang, region] = regionalLocale.split("-");
  if (lang && region) {
    return `${lang}_${region}`;
  }

  return "en_US";
}

export function resolveLanguageFromAcceptLanguage(
  acceptLanguage: string | null | undefined
): LanguageCode {
  if (!acceptLanguage) {
    return DEFAULT_LANGUAGE;
  }

  const languageTags = acceptLanguage
    .split(",")
    .map((item) => item.split(";")[0]?.trim())
    .filter((item): item is string => Boolean(item));

  for (const languageTag of languageTags) {
    const matched = resolveFromLanguageTag(languageTag);
    if (matched) {
      return matched;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function resolveRegionFromGeoHeaders(params: {
  vercelCountry?: string | null;
  cloudflareCountry?: string | null;
  fallbackLanguage?: LanguageCode;
}): RegionCode {
  const fallbackLanguage = params.fallbackLanguage ?? DEFAULT_LANGUAGE;
  const candidates = [params.vercelCountry, params.cloudflareCountry];

  for (const candidate of candidates) {
    const normalized = candidate?.trim().toUpperCase();
    if (normalized && isRegionCode(normalized)) {
      return normalized;
    }
  }

  return getDefaultRegionForLanguage(fallbackLanguage);
}

export function getLanguageFromPathname(pathname: string): LanguageCode | null {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[0];

  if (!candidate) {
    return null;
  }

  return resolveSupportedLanguage(candidate);
}

export function stripLanguagePrefix(pathname: string): string {
  const language = getLanguageFromPathname(pathname);
  if (!language) {
    return pathname || "/";
  }

  const withoutPrefix = pathname.replace(
    new RegExp(`^/${escapeRegExp(language)}`),
    ""
  );
  return withoutPrefix.length > 0 ? withoutPrefix : "/";
}

export function localizePath(pathname: string, language: LanguageCode): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const strippedPath = stripLanguagePrefix(normalizedPath);

  if (strippedPath === "/") {
    return `/${language}`;
  }

  return `/${language}${strippedPath}`;
}

export function replacePathLanguage(
  pathname: string,
  targetLanguage: LanguageCode
): string {
  return localizePath(pathname, targetLanguage);
}

export {
  SUPPORTED_REGIONS,
  getDefaultHomeBaseCityForRegion,
  getDefaultRegionForLanguage,
  isRegionCode,
  type RegionCode,
};
