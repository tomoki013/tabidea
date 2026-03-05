import { createTranslator } from "next-intl";
import type { LanguageCode } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/lib/replan.json";
import jaMessages from "@/messages/ja/lib/replan.json";

const REPLAN_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

function resolveLocale(locale?: string): LanguageCode {
  return locale === "en" ? "en" : "ja";
}

export function createReplanTranslator(locale?: string) {
  const resolvedLocale = resolveLocale(locale);
  return createTranslator({
    locale: resolvedLocale,
    messages: REPLAN_MESSAGES[resolvedLocale],
    namespace: "lib.replan",
  });
}

