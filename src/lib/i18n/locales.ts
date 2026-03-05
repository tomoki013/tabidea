export const SUPPORTED_LANGUAGES = ["ja", "en"] as const;
export const SUPPORTED_REGIONS = ["JP", "US"] as const;
export const SUPPORTED_REGIONAL_LOCALES = ["ja-JP", "en-US"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];
export type RegionCode = (typeof SUPPORTED_REGIONS)[number];
export type RegionalLocale = (typeof SUPPORTED_REGIONAL_LOCALES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "ja";
export const DEFAULT_REGION: RegionCode = "JP";
export const DEFAULT_REGIONAL_LOCALE: RegionalLocale = "ja-JP";

const DEFAULT_REGION_BY_LANGUAGE: Record<LanguageCode, RegionCode> = {
  en: "US",
  ja: "JP",
};

const DEFAULT_HOME_BASE_CITY_BY_REGION: Record<RegionCode, string> = {
  JP: "東京",
  US: "New York",
};

const REGIONAL_LOCALE_BY_LANGUAGE_AND_REGION: Record<
  LanguageCode,
  Partial<Record<RegionCode, RegionalLocale>>
> = {
  en: {
    US: "en-US",
  },
  ja: {
    JP: "ja-JP",
  },
};

export function isLanguageCode(value: string): value is LanguageCode {
  return SUPPORTED_LANGUAGES.includes(value as LanguageCode);
}

export function isRegionCode(value: string): value is RegionCode {
  return SUPPORTED_REGIONS.includes(value as RegionCode);
}

export function isRegionalLocale(value: string): value is RegionalLocale {
  return SUPPORTED_REGIONAL_LOCALES.includes(value as RegionalLocale);
}

export function getDefaultRegionForLanguage(language: LanguageCode): RegionCode {
  return DEFAULT_REGION_BY_LANGUAGE[language];
}

export function getDefaultHomeBaseCityForRegion(region: RegionCode): string {
  return DEFAULT_HOME_BASE_CITY_BY_REGION[region];
}

export function resolveRegionalLocale(
  language: LanguageCode,
  region?: RegionCode
): RegionalLocale {
  const resolvedRegion = region ?? getDefaultRegionForLanguage(language);
  return (
    REGIONAL_LOCALE_BY_LANGUAGE_AND_REGION[language][resolvedRegion] ??
    REGIONAL_LOCALE_BY_LANGUAGE_AND_REGION[language][
      getDefaultRegionForLanguage(language)
    ] ??
    DEFAULT_REGIONAL_LOCALE
  );
}

export function getLanguageFromPathname(pathname: string): LanguageCode | null {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[0];

  if (!candidate) {
    return null;
  }

  return isLanguageCode(candidate) ? candidate : null;
}

export function stripLanguagePrefix(pathname: string): string {
  const language = getLanguageFromPathname(pathname);
  if (!language) {
    return pathname || "/";
  }

  const withoutPrefix = pathname.replace(new RegExp(`^/${language}`), "");
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
