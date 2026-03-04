import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { LANGUAGE_HEADER } from "@/lib/i18n/constants";
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  type LanguageCode,
} from "@/lib/i18n/locales";

export async function getRequestLanguage(): Promise<LanguageCode> {
  try {
    const locale = await getLocale();
    if (isLanguageCode(locale)) {
      return locale;
    }
  } catch {
    // Fallback to headers for routes where next-intl locale is unavailable.
  }

  const headersList = await headers();
  const requestLanguage = headersList.get(LANGUAGE_HEADER);

  if (requestLanguage && isLanguageCode(requestLanguage)) {
    return requestLanguage;
  }

  return DEFAULT_LANGUAGE;
}
