import { describe, expect, it } from "vitest";
import {
  getHomeBaseCityOptionsForRegion,
  resolveHomeBaseCityForRegion,
} from "@/lib/i18n/home-base-cities";

describe("home-base-cities", () => {
  it("provides prefecture-level cities for Japan", () => {
    const options = getHomeBaseCityOptionsForRegion("JP", "ja");
    expect(options).toHaveLength(47);
    expect(options.some((option) => option.value === "東京")).toBe(true);
    expect(options.some((option) => option.value === "大阪")).toBe(true);
    expect(options.some((option) => option.value === "京都")).toBe(true);
  });

  it("provides state-level cities for the United States", () => {
    const options = getHomeBaseCityOptionsForRegion("US", "en");
    expect(options).toHaveLength(51);
    expect(options.some((option) => option.value === "Washington, D.C.")).toBe(true);
    expect(options.some((option) => option.value === "New York")).toBe(true);
  });

  it("falls back to a single city for non-major regions", () => {
    const options = getHomeBaseCityOptionsForRegion("0033", "en");
    expect(options).toHaveLength(1);
    expect(options[0]?.value).toBe("Paris");
  });

  it("resolves unsupported legacy city to region default", () => {
    expect(resolveHomeBaseCityForRegion("US", "en", "Los Angeles")).toBe("Washington, D.C.");
  });

  it("normalizes stored city to current language", () => {
    expect(resolveHomeBaseCityForRegion("JP", "ja", "Tokyo")).toBe("東京");
    expect(resolveHomeBaseCityForRegion("JP", "en", "東京")).toBe("Tokyo");
  });
});
