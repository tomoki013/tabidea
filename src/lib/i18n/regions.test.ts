import { describe, expect, it } from "vitest";
import {
  REGION_OPTIONS,
  getDefaultHomeBaseCityForRegion,
  getRegionOptions,
  isRegionCode,
} from "@/lib/i18n/regions";

describe("i18n regions", () => {
  it("provides 200+ region options with unique codes", () => {
    expect(REGION_OPTIONS.length).toBeGreaterThanOrEqual(207);
    expect(new Set(REGION_OPTIONS.map((option) => option.code)).size).toBe(
      REGION_OPTIONS.length
    );
  });

  it("validates region code and rejects unsupported values", () => {
    expect(isRegionCode("JP")).toBe(true);
    expect(isRegionCode("US")).toBe(true);
    expect(isRegionCode("0033")).toBe(true);
    expect(isRegionCode("ZZZZ")).toBe(false);
  });

  it("returns localized option labels", () => {
    const ja = getRegionOptions("ja");
    const en = getRegionOptions("en");

    expect(ja[0]?.label).toContain("日本");
    expect(en[0]?.label).toContain("Japan");
  });

  it("resolves default home base city with overrides", () => {
    expect(getDefaultHomeBaseCityForRegion("JP", "ja")).toBe("東京");
    expect(getDefaultHomeBaseCityForRegion("US", "en")).toBe("Washington, D.C.");
  });
});

