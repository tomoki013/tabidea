import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getMessages } from "@/lib/i18n/messages";
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
} from "@/lib/i18n/locales";
import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const language = isLanguageCode(locale) ? locale : DEFAULT_LANGUAGE;

  return {
    locale,
    messages: getMessages(language),
  };
});

