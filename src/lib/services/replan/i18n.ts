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

type ReplanTranslator = {
  (key: string, values?: Record<string, unknown>): string;
  raw: (key: string) => unknown;
};

export function createReplanTranslator(locale?: string) {
  const resolvedLocale = resolveLocale(locale);
  const rawT = createTranslator({
    locale: resolvedLocale,
    messages: REPLAN_MESSAGES[resolvedLocale],
    namespace: "lib.replan",
  });

  const t = ((key: string, values?: Record<string, unknown>) => {
    if (values) {
      return rawT(key as never, values as never);
    }
    return rawT(key as never);
  }) as ReplanTranslator;

  t.raw = (key: string) => rawT.raw(key as never);

  return t;
}
