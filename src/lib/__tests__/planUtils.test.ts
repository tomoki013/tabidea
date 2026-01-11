import { describe, it, expect } from "vitest";
import { extractDuration, splitDaysIntoChunks } from "../planUtils";

describe("extractDuration", () => {
  it("extracts duration correctly from valid string", () => {
    expect(extractDuration("2泊3日間")).toBe(3);
    expect(extractDuration("10日間")).toBe(10);
  });

  it("returns 0 for invalid string", () => {
    expect(extractDuration("invalid")).toBe(0);
    expect(extractDuration("")).toBe(0);
  });
});

describe("splitDaysIntoChunks", () => {
  it("splits short trip into single chunk", () => {
    const chunks = splitDaysIntoChunks(2);
    expect(chunks).toEqual([{ start: 1, end: 2 }]);
  });

  it("splits longer trip into 2-day chunks", () => {
    const chunks = splitDaysIntoChunks(5);
    // 1-2, 3-4, 5
    expect(chunks).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 4 },
      { start: 5, end: 5 },
    ]);
  });

  it("splits trip correctly", () => {
    const chunks = splitDaysIntoChunks(4);
    // 1-2, 3-4
    expect(chunks).toEqual([
        { start: 1, end: 2 },
        { start: 3, end: 4 }
    ]);
  });
});
