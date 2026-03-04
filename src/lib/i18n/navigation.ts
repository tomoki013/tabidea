import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
  replacePathLanguage,
  type LanguageCode,
} from "@/lib/i18n/locales";

export function resolveLanguageFromPathname(pathname: string | null): LanguageCode {
  if (!pathname) {
    return DEFAULT_LANGUAGE;
  }

  return getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
}

export function localizeHref(href: string, language: LanguageCode): string {
  if (!href.startsWith("/")) {
    return href;
  }

  return localizePath(href, language);
}

export function switchLanguagePath(
  pathname: string | null,
  targetLanguage: LanguageCode
): string {
  const current = pathname ?? "/";
  return replacePathLanguage(current, targetLanguage);
}

