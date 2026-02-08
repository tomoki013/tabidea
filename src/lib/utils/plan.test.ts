import { describe, it, expect } from "vitest";
import { extractDuration, splitDaysIntoChunks, extractStartDate, getDayCheckInOutDates } from "./plan";

describe("extractDuration", () => {
  it("extracts duration from X日間 format", () => {
    expect(extractDuration("3日間")).toBe(3);
    expect(extractDuration("10日間")).toBe(10);
  });

  it("extracts duration from X泊Y日 format", () => {
    expect(extractDuration("2泊3日")).toBe(3);
    expect(extractDuration("1泊2日")).toBe(2);
    expect(extractDuration("4泊5日")).toBe(5);
  });

  it("prioritizes X日間 format over X泊Y日 format when both present", () => {
    // "2泊3日間" contains both patterns, but X日間 is checked first
    expect(extractDuration("2泊3日間")).toBe(3);
  });

  it("returns 0 for invalid string", () => {
    expect(extractDuration("invalid")).toBe(0);
    expect(extractDuration("")).toBe(0);
  });
});

describe("splitDaysIntoChunks", () => {
  it("splits short trip into single chunk", () => {
    const chunks = splitDaysIntoChunks(1);
    expect(chunks).toEqual([{ start: 1, end: 1 }]);
  });

  it("splits longer trip into 1-day chunks", () => {
    const chunks = splitDaysIntoChunks(5);
    expect(chunks).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 3, end: 3 },
      { start: 4, end: 4 },
      { start: 5, end: 5 },
    ]);
  });

  it("splits trip correctly", () => {
    const chunks = splitDaysIntoChunks(3);
    expect(chunks).toEqual([
        { start: 1, end: 1 },
        { start: 2, end: 2 },
        { start: 3, end: 3 }
    ]);
  });
});

describe("extractStartDate", () => {
  it("extracts date from Japanese format", () => {
    expect(extractStartDate("2024年6月15日〜6月17日")).toBe("2024-06-15");
  });

  it("extracts date from ISO format", () => {
    expect(extractStartDate("2024-06-15")).toBe("2024-06-15");
  });

  it("extracts date from slash format", () => {
    expect(extractStartDate("2024/6/15〜2024/6/17")).toBe("2024-06-15");
  });

  it("returns null for no recognizable date", () => {
    expect(extractStartDate("3日間")).toBeNull();
    expect(extractStartDate("2泊3日")).toBeNull();
  });
});

describe("getDayCheckInOutDates", () => {
  it("calculates correct dates for day 1", () => {
    const result = getDayCheckInOutDates("2024-06-15", 1);
    expect(result.checkIn).toBe("2024-06-15");
    expect(result.checkOut).toBe("2024-06-16");
  });

  it("calculates correct dates for day 3", () => {
    const result = getDayCheckInOutDates("2024-06-15", 3);
    expect(result.checkIn).toBe("2024-06-17");
    expect(result.checkOut).toBe("2024-06-18");
  });

  it("handles month boundary", () => {
    const result = getDayCheckInOutDates("2024-06-30", 1);
    expect(result.checkIn).toBe("2024-06-30");
    expect(result.checkOut).toBe("2024-07-01");
  });
});
