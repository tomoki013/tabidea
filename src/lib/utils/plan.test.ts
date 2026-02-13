import { describe, it, expect } from "vitest";
import { extractDuration, splitDaysIntoChunks, extractStartDate, getDayCheckInOutDates, buildTimeline, getTimelineItemTime, parseTimeForSort } from "./plan";
import type { DayPlan, TransitInfo, Activity, TimelineItem } from "@/types";

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

describe("parseTimeForSort", () => {
  it("parses HH:MM format correctly", () => {
    expect(parseTimeForSort("09:00")).toBe(900);
    expect(parseTimeForSort("14:30")).toBe(1430);
    expect(parseTimeForSort("0:00")).toBe(0);
    expect(parseTimeForSort("23:59")).toBe(2359);
  });

  it("returns Infinity for undefined or invalid input", () => {
    expect(parseTimeForSort(undefined)).toBe(Infinity);
    expect(parseTimeForSort("")).toBe(Infinity);
    expect(parseTimeForSort("invalid")).toBe(Infinity);
  });
});

describe("buildTimeline", () => {
  const mockTransit: TransitInfo = {
    type: "flight",
    departure: { place: "Tokyo", time: "08:00" },
    arrival: { place: "Osaka", time: "09:30" },
    duration: "1h 30m",
  };

  const mockActivity: Activity = {
    time: "10:00",
    activity: "大阪城観光",
    description: "大阪城を訪問",
  };

  it("builds timeline from transit + activities when no timelineItems", () => {
    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      transit: mockTransit,
      activities: [mockActivity],
    };

    const timeline = buildTimeline(day);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].itemType).toBe("transit");
    expect(timeline[1].itemType).toBe("activity");
  });

  it("uses timelineItems when provided", () => {
    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      activities: [mockActivity],
      timelineItems: [
        { itemType: "activity", data: mockActivity },
      ],
    };

    const timeline = buildTimeline(day);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].itemType).toBe("activity");
  });

  it("handles day with no transit", () => {
    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      activities: [mockActivity],
    };

    const timeline = buildTimeline(day);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].itemType).toBe("activity");
  });

  it("places transit at correct chronological position based on departure time", () => {
    const afternoonTransit: TransitInfo = {
      type: "train",
      departure: { place: "City A", time: "14:00" },
      arrival: { place: "City B", time: "16:00" },
    };

    const day: DayPlan = {
      day: 3,
      title: "Day 3",
      transit: afternoonTransit,
      activities: [
        { time: "09:00", activity: "Morning spot", description: "..." },
        { time: "12:00", activity: "Lunch", description: "..." },
        { time: "17:00", activity: "Evening spot", description: "..." },
      ],
    };

    const timeline = buildTimeline(day);
    expect(timeline).toHaveLength(4);
    expect(timeline[0].itemType).toBe("activity"); // 09:00
    expect(timeline[1].itemType).toBe("activity"); // 12:00
    expect(timeline[2].itemType).toBe("transit");  // 14:00
    expect(timeline[3].itemType).toBe("activity"); // 17:00
  });

  it("places early morning transit before activities", () => {
    const earlyTransit: TransitInfo = {
      type: "flight",
      departure: { place: "Airport", time: "06:00" },
      arrival: { place: "Destination", time: "08:30" },
    };

    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      transit: earlyTransit,
      activities: [
        { time: "09:00", activity: "First spot", description: "..." },
        { time: "12:00", activity: "Lunch", description: "..." },
      ],
    };

    const timeline = buildTimeline(day);
    expect(timeline[0].itemType).toBe("transit");  // 06:00
    expect(timeline[1].itemType).toBe("activity"); // 09:00
    expect(timeline[2].itemType).toBe("activity"); // 12:00
  });

  it("sorts AI-generated timelineItems chronologically as safety net", () => {
    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      activities: [],
      timelineItems: [
        { itemType: "transit", data: { type: "train", departure: { place: "A", time: "14:00" }, arrival: { place: "B", time: "15:00" } }, time: "14:00" },
        { itemType: "activity", data: { time: "09:00", activity: "Morning", description: "..." } },
        { itemType: "activity", data: { time: "12:00", activity: "Lunch", description: "..." } },
      ],
    };

    const timeline = buildTimeline(day);
    expect(timeline[0].itemType).toBe("activity"); // 09:00
    expect(timeline[1].itemType).toBe("activity"); // 12:00
    expect(timeline[2].itemType).toBe("transit");  // 14:00
  });

  it("sorts items without time to the end", () => {
    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      activities: [
        { time: "10:00", activity: "Morning spot", description: "..." },
        { time: "", activity: "Free time", description: "..." },
        { time: "14:00", activity: "Afternoon spot", description: "..." },
      ],
    };

    const timeline = buildTimeline(day);
    expect(timeline[0].itemType).toBe("activity"); // 10:00
    expect(timeline[1].itemType).toBe("activity"); // 14:00
    expect(timeline[2].itemType).toBe("activity"); // no time → end
    expect((timeline[2].data as Activity).activity).toBe("Free time");
  });

  it("does not mutate original timelineItems array", () => {
    const originalItems: TimelineItem[] = [
      { itemType: "activity", data: { time: "14:00", activity: "Late", description: "..." } },
      { itemType: "activity", data: { time: "09:00", activity: "Early", description: "..." } },
    ];

    const day: DayPlan = {
      day: 1,
      title: "Day 1",
      activities: [],
      timelineItems: originalItems,
    };

    buildTimeline(day);
    // Original array should remain unchanged
    expect((originalItems[0].data as Activity).time).toBe("14:00");
    expect((originalItems[1].data as Activity).time).toBe("09:00");
  });
});

describe("getTimelineItemTime", () => {
  it("returns time for activity items", () => {
    const time = getTimelineItemTime({
      itemType: "activity",
      data: { time: "10:00", activity: "Test", description: "Test" },
    });
    expect(time).toBe("10:00");
  });

  it("returns departure time for transit items", () => {
    const time = getTimelineItemTime({
      itemType: "transit",
      data: {
        type: "train",
        departure: { place: "A", time: "08:00" },
        arrival: { place: "B", time: "09:00" },
      },
      time: "08:00",
    });
    expect(time).toBe("08:00");
  });
});
