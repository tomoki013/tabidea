import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/i18n/locales";

interface ResolveDetectedLanguageParams {
  languageFromPath: LanguageCode | null;
  cookieLanguage: LanguageCode | null;
  acceptLanguage: LanguageCode | null;
}

interface ResolveRoutingLanguageParams {
  languageFromPath: LanguageCode | null;
  preferredLanguage: LanguageCode | null;
  detectedLanguage: LanguageCode;
}

export function resolveDetectedLanguageForProxy({
  languageFromPath,
  cookieLanguage,
  acceptLanguage,
}: ResolveDetectedLanguageParams): LanguageCode {
  return languageFromPath ?? cookieLanguage ?? acceptLanguage ?? DEFAULT_LANGUAGE;
}

export function resolveRoutingLanguageForProxy({
  languageFromPath,
  preferredLanguage,
  detectedLanguage,
}: ResolveRoutingLanguageParams): LanguageCode {
  return languageFromPath ?? preferredLanguage ?? detectedLanguage;
}
