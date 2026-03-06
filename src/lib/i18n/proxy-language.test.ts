import { describe, expect, it } from "vitest";
import {
  resolveDetectedLanguageForProxy,
  resolveRoutingLanguageForProxy,
} from "@/lib/i18n/proxy-language";

describe("proxy language resolution", () => {
  it("prefers URL language over cookie language during detection", () => {
    expect(
      resolveDetectedLanguageForProxy({
        languageFromPath: "en",
        cookieLanguage: "ja",
        acceptLanguage: "ja",
      })
    ).toBe("en");
  });

  it("uses cookie language when URL prefix is missing", () => {
    expect(
      resolveDetectedLanguageForProxy({
        languageFromPath: null,
        cookieLanguage: "en",
        acceptLanguage: "ja",
      })
    ).toBe("en");
  });

  it("keeps URL language even when stored preference differs", () => {
    expect(
      resolveRoutingLanguageForProxy({
        languageFromPath: "en",
        persistedLanguage: "ja",
        detectedLanguage: "ja",
      })
    ).toBe("en");
  });

  it("falls back to persisted display language when URL prefix is missing", () => {
    expect(
      resolveRoutingLanguageForProxy({
        languageFromPath: null,
        persistedLanguage: "ja",
        detectedLanguage: "en",
      })
    ).toBe("ja");
  });
});
