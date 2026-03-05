import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
  replacePathLanguage,
  resolveRegionalLocale,
  stripLanguagePrefix,
} from "@/lib/i18n/locales";

describe("i18n locales utilities", () => {
  it("resolves language from pathname prefix", () => {
    expect(getLanguageFromPathname("/en/pricing")).toBe("en");
    expect(getLanguageFromPathname("/ja")).toBe("ja");
    expect(getLanguageFromPathname("/pricing")).toBeNull();
  });

  it("strips language prefix safely", () => {
    expect(stripLanguagePrefix("/en/pricing")).toBe("/pricing");
    expect(stripLanguagePrefix("/ja")).toBe("/");
    expect(stripLanguagePrefix("/pricing")).toBe("/pricing");
  });

  it("localizes path and switches language", () => {
    expect(localizePath("/pricing", "en")).toBe("/en/pricing");
    expect(localizePath("/ja/pricing", "en")).toBe("/en/pricing");
    expect(replacePathLanguage("/en/faq", "ja")).toBe("/ja/faq");
  });

  it("resolves regional locale with language fallback", () => {
    expect(resolveRegionalLocale("en", "US")).toBe("en-US");
    expect(resolveRegionalLocale("ja", "JP")).toBe("ja-JP");
    expect(resolveRegionalLocale("en", "0033")).toBe("en-US");
    expect(resolveRegionalLocale(DEFAULT_LANGUAGE, "JP")).toBe("ja-JP");
  });
});
