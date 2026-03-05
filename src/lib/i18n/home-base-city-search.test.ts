import { describe, expect, it } from "vitest";
import {
  getInitialHomeBaseCityOptions,
  searchHomeBaseCityOptions,
} from "@/lib/i18n/home-base-city-search";

describe("home-base-city-search", () => {
  it("returns prioritized initial options for region", () => {
    const options = getInitialHomeBaseCityOptions("US", "en", 5);
    expect(options).toHaveLength(5);
    expect(options[0]?.value).toBe("Washington, D.C.");
  });

  it("prioritizes exact city matches", () => {
    const options = searchHomeBaseCityOptions("US", "en", "new york", 10);
    expect(options[0]?.value).toBe("New York");
  });

  it("matches by state name tokens", () => {
    const options = searchHomeBaseCityOptions("US", "en", "calif", 10);
    expect(options.some((option) => option.value === "Sacramento")).toBe(true);
  });

  it("falls back to initial options when query is empty", () => {
    const bySearch = searchHomeBaseCityOptions("JP", "ja", "   ", 10).map((option) => option.value);
    const initial = getInitialHomeBaseCityOptions("JP", "ja", 10).map((option) => option.value);
    expect(bySearch).toEqual(initial);
  });
});
