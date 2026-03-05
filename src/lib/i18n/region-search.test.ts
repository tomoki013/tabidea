import { describe, expect, it } from "vitest";
import { getInitialRegionOptions, searchRegionOptions } from "@/lib/i18n/region-search";

describe("region-search", () => {
  it("returns prioritized initial options with limit", () => {
    const options = getInitialRegionOptions("en", 20);
    expect(options).toHaveLength(20);
    expect(options[0]?.value).toBe("JP");
    expect(options[1]?.value).toBe("US");
  });

  it("prioritizes exact region code matches", () => {
    const options = searchRegionOptions("en", "0033", 10);
    expect(options[0]?.value).toBe("0033");
  });

  it("ranks prefix matches above partial matches", () => {
    const options = searchRegionOptions("en", "ger", 20);
    const germanyIndex = options.findIndex((option) => option.value === "0049");
    const nigerIndex = options.findIndex((option) => option.value === "0227");

    expect(germanyIndex).toBeGreaterThanOrEqual(0);
    expect(nigerIndex).toBeGreaterThanOrEqual(0);
    expect(germanyIndex).toBeLessThan(nigerIndex);
  });

  it("falls back to initial list when query is empty", () => {
    const bySearch = searchRegionOptions("en", "   ", 20).map((option) => option.value);
    const initial = getInitialRegionOptions("en", 20).map((option) => option.value);
    expect(bySearch).toEqual(initial);
  });
});
