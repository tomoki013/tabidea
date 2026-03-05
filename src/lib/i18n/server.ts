import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import {
  LANGUAGE_COOKIE,
  LANGUAGE_HEADER,
  REGION_COOKIE,
  REGION_HEADER,
} from "@/lib/i18n/constants";
import {
  DEFAULT_LANGUAGE,
  getDefaultRegionForLanguage,
  isLanguageCode,
  isRegionCode,
  type LanguageCode,
  type RegionCode,
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

  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get(LANGUAGE_COOKIE)?.value;

  if (cookieLanguage && isLanguageCode(cookieLanguage)) {
    return cookieLanguage;
  }

  return DEFAULT_LANGUAGE;
}

export async function getRequestRegion(
  language?: LanguageCode
): Promise<RegionCode> {
  const headersList = await headers();
  const requestRegion = headersList.get(REGION_HEADER);

  if (requestRegion && isRegionCode(requestRegion)) {
    return requestRegion;
  }

  const cookieStore = await cookies();
  const cookieRegion = cookieStore.get(REGION_COOKIE)?.value;

  if (cookieRegion && isRegionCode(cookieRegion)) {
    return cookieRegion;
  }

  const fallbackLanguage = language ?? (await getRequestLanguage());
  return getDefaultRegionForLanguage(fallbackLanguage);
}
