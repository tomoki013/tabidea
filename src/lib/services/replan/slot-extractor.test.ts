import { describe, it, expect, vi } from "vitest";

import type { Activity, DayPlan, Itinerary } from "@/types";

import { extractSlots } from "./slot-extractor";

// ============================================================================
// crypto.randomUUID mock
// ============================================================================

let uuidCounter = 0;
vi.stubGlobal("crypto", {
  ...globalThis.crypto,
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// ============================================================================
// Helpers
// ============================================================================

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    time: "10:00",
    activity: "金閣寺",
    description: "京都の有名な寺院",
    ...overrides,
  };
}

function makeDay(day: number, activities: Activity[]): DayPlan {
  return {
    day,
    title: `Day ${day}`,
    activities,
  };
}

function makeItinerary(days: DayPlan[]): Itinerary {
  return {
    id: "test-itinerary",
    destination: "京都",
    description: "京都旅行",
    days,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("extractSlots", () => {
  it("空の Itinerary から空配列を返す", () => {
    const itinerary = makeItinerary([]);
    const slots = extractSlots(itinerary);
    expect(slots).toEqual([]);
  });

  it("1日1アクティビティを1スロットに変換する", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity()]),
    ]);

    const slots = extractSlots(itinerary);

    expect(slots).toHaveLength(1);
    expect(slots[0].dayNumber).toBe(1);
    expect(slots[0].slotIndex).toBe(0);
    expect(slots[0].activity.activity).toBe("金閣寺");
    expect(slots[0].startTime).toBe("10:00");
    expect(slots[0].endTime).toBeUndefined();
    expect(slots[0].bufferMinutes).toBe(15);
  });

  it("複数日のアクティビティを正しくマッピングする", () => {
    const itinerary = makeItinerary([
      makeDay(1, [
        makeActivity({ time: "9:00", activity: "伏見稲荷大社" }),
        makeActivity({ time: "14:00", activity: "清水寺" }),
      ]),
      makeDay(2, [
        makeActivity({ time: "10:00", activity: "嵐山" }),
      ]),
    ]);

    const slots = extractSlots(itinerary);

    expect(slots).toHaveLength(3);
    expect(slots[0].dayNumber).toBe(1);
    expect(slots[0].slotIndex).toBe(0);
    expect(slots[1].dayNumber).toBe(1);
    expect(slots[1].slotIndex).toBe(1);
    expect(slots[2].dayNumber).toBe(2);
    expect(slots[2].slotIndex).toBe(0);
  });

  it("時間範囲 (10:00〜12:00) をパースできる", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity({ time: "10:00〜12:00" })]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].startTime).toBe("10:00");
    expect(slots[0].endTime).toBe("12:00");
  });

  it("ハイフン区切り (10:00-12:00) もパースできる", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity({ time: "10:00-12:00" })]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].startTime).toBe("10:00");
    expect(slots[0].endTime).toBe("12:00");
  });

  it("パースできない時刻は undefined を返す", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity({ time: "午前中" })]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].startTime).toBeUndefined();
    expect(slots[0].endTime).toBeUndefined();
  });

  it("isLocked=true のアクティビティは must・スキップ不可になる", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity({ isLocked: true })]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].priority).toBe("must");
    expect(slots[0].isSkippable).toBe(false);
  });

  it("検証済みアクティビティは should になる", () => {
    const itinerary = makeItinerary([
      makeDay(1, [
        makeActivity({
          validation: {
            spotName: "金閣寺",
            isVerified: true,
            confidence: "high",
          },
        }),
      ]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].priority).toBe("should");
    expect(slots[0].isSkippable).toBe(true);
  });

  it("通常のアクティビティは nice・スキップ可能になる", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity()]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].priority).toBe("nice");
    expect(slots[0].isSkippable).toBe(true);
  });

  it("isLocked=true のアクティビティに booking 制約が付与される", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity({ isLocked: true, activity: "茶道体験" })]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].constraints).toHaveLength(1);
    expect(slots[0].constraints[0].type).toBe("booking");
    expect(slots[0].constraints[0].priority).toBe("hard");
  });

  it("営業時間情報があるアクティビティに opening_hours 制約が付与される", () => {
    const itinerary = makeItinerary([
      makeDay(1, [
        makeActivity({
          validation: {
            spotName: "金閣寺",
            isVerified: true,
            confidence: "high",
            details: {
              openingHours: ["9:00 - 17:00"],
            },
          },
        }),
      ]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].constraints).toHaveLength(1);
    expect(slots[0].constraints[0].type).toBe("opening_hours");
    expect(slots[0].constraints[0].priority).toBe("soft");
  });

  it("各スロットに一意のIDが割り振られる", () => {
    const itinerary = makeItinerary([
      makeDay(1, [makeActivity(), makeActivity({ activity: "銀閣寺" })]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].id).not.toBe(slots[1].id);
  });

  it("isLocked + openingHours の両方がある場合、2つの制約が付与される", () => {
    const itinerary = makeItinerary([
      makeDay(1, [
        makeActivity({
          isLocked: true,
          validation: {
            spotName: "茶道教室",
            isVerified: true,
            confidence: "high",
            details: {
              openingHours: ["10:00 - 16:00"],
            },
          },
        }),
      ]),
    ]);

    const slots = extractSlots(itinerary);
    expect(slots[0].constraints).toHaveLength(2);
    const types = slots[0].constraints.map((c) => c.type);
    expect(types).toContain("booking");
    expect(types).toContain("opening_hours");
  });
});
