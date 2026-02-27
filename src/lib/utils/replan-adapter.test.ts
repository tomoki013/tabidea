import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildTripPlan, buildDefaultTravelerState, buildTripContext } from "./replan-adapter";
import type { Itinerary, UserInput } from "@/types";

const mockItinerary: Itinerary = {
  id: "test-plan-1",
  destination: "京都",
  description: "京都2日間の旅",
  days: [
    {
      day: 1,
      date: "2026-03-01",
      title: "東山エリア",
      activities: [
        {
          activity: "清水寺",
          description: "世界遺産の清水寺を訪問",
          time: "09:00",
          duration: "2時間",
          category: "観光",
          location: { name: "清水寺", address: "京都市東山区" },
        },
        {
          activity: "祇園散策",
          description: "花見小路を散策",
          time: "12:00",
          duration: "1時間30分",
          category: "散策",
          location: { name: "祇園", address: "京都市東山区" },
        },
      ],
    },
    {
      day: 2,
      date: "2026-03-02",
      title: "嵐山エリア",
      activities: [
        {
          activity: "竹林の道",
          description: "嵐山竹林を歩く",
          time: "10:00",
          duration: "1時間",
          category: "自然",
          location: { name: "竹林の道", address: "京都市右京区" },
        },
      ],
    },
  ],
};

const mockInput: UserInput = {
  destinations: ["京都"],
  region: "domestic",
  dates: "2日間",
  companions: "カップル",
  theme: ["観光", "グルメ"],
  budget: "standard",
  pace: "ゆったり",
  freeText: "",
  isDestinationDecided: true,
  hasMustVisitPlaces: false,
  mustVisitPlaces: [],
};

describe("buildTripPlan", () => {
  it("converts Itinerary to TripPlan with correct slots", () => {
    const result = buildTripPlan(mockItinerary, mockInput);

    expect(result.itinerary).toBe(mockItinerary);
    expect(result.slots).toHaveLength(3);

    // Day 1, slot 0
    expect(result.slots[0].id).toBe("day1-slot0");
    expect(result.slots[0].dayNumber).toBe(1);
    expect(result.slots[0].slotIndex).toBe(0);
    expect(result.slots[0].activity.activity).toBe("清水寺");
    expect(result.slots[0].startTime).toBe("09:00");

    // Day 1, slot 1
    expect(result.slots[1].id).toBe("day1-slot1");
    expect(result.slots[1].dayNumber).toBe(1);
    expect(result.slots[1].slotIndex).toBe(1);
    expect(result.slots[1].activity.activity).toBe("祇園散策");

    // Day 2, slot 0
    expect(result.slots[2].id).toBe("day2-slot0");
    expect(result.slots[2].dayNumber).toBe(2);
    expect(result.slots[2].slotIndex).toBe(0);
  });

  it("builds metadata from input", () => {
    const result = buildTripPlan(mockItinerary, mockInput);

    expect(result.metadata.city).toBe("京都");
    expect(result.metadata.totalDays).toBe(2);
    expect(result.metadata.companionType).toBe("カップル");
    expect(result.metadata.budget).toBe("standard");
  });

  it("initializes constraints as empty", () => {
    const result = buildTripPlan(mockItinerary, mockInput);
    expect(result.constraints).toEqual([]);
  });
});

describe("buildDefaultTravelerState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T14:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns high fatigue for fatigue trigger", () => {
    const state = buildDefaultTravelerState("fatigue");

    expect(state.triggerType).toBe("fatigue");
    expect(state.estimatedFatigue).toBe(0.7);
    expect(state.walkingDistanceKm).toBe(8);
    expect(state.delayMinutes).toBe(0);
    expect(state.currentTime).toBe("14:30");
  });

  it("returns rain defaults", () => {
    const state = buildDefaultTravelerState("rain");

    expect(state.triggerType).toBe("rain");
    expect(state.estimatedFatigue).toBe(0.3);
    expect(state.walkingDistanceKm).toBe(2);
  });

  it("returns delay with 30min default", () => {
    const state = buildDefaultTravelerState("delay");

    expect(state.triggerType).toBe("delay");
    expect(state.delayMinutes).toBe(30);
  });
});

describe("buildTripContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T14:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps itinerary and input to TripContext", () => {
    const ctx = buildTripContext(mockItinerary, mockInput);

    expect(ctx.city).toBe("京都");
    expect(ctx.companionType).toBe("カップル");
    expect(ctx.budget).toBe("standard");
    expect(ctx.currentTime).toBe("14:30");
    expect(ctx.bookings).toEqual([]);
  });
});
