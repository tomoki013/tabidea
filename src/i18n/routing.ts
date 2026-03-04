import { defineRouting } from "next-intl/routing";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/locales";

export const routing = defineRouting({
  locales: [...SUPPORTED_LANGUAGES],
  defaultLocale: DEFAULT_LANGUAGE,
  localePrefix: "always",
  localeDetection: false,
});

