import { describe, it, expect } from "vitest";

import type { HumanResolutionInput } from "./types";
import { passesHardConstraints } from "./hard-constraints";

// ============================================================================
// Helpers
// ============================================================================

function makeInput(overrides: Partial<HumanResolutionInput> = {}): HumanResolutionInput {
  return {
    context: {
      city: "京都",
      currentTime: "14:00",
      bookings: [],
      companionType: "友人",
      budget: "普通",
      ...overrides.context,
    },
    state: {
      estimatedFatigue: 0.3,
      walkingDistanceKm: 5,
      delayMinutes: 0,
      currentTime: "14:00",
      triggerType: "rain",
      ...overrides.state,
    },
    option: {
      id: "opt-1",
      replacementSlots: [],
      explanation: "雨宿りできるカフェでゆっくり過ごす",
      estimatedDuration: "1時間30分",
      category: "indoor",
      ...overrides.option,
    },
    mode: overrides.mode ?? "rain",
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("passesHardConstraints", () => {
  it("制約なしの場合 pass=true を返す", () => {
    const result = passesHardConstraints(makeInput());
    expect(result.pass).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  // ---- 終電チェック ----

  it("終電に間に合う場合は pass=true", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "14:00",
        bookings: [],
        companionType: "友人",
        budget: "普通",
        returnConstraint: "最終電車 22:30",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "14:00",
        triggerType: "rain",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "カフェでゆっくり",
        estimatedDuration: "1時間",
        category: "indoor",
      },
    });
    expect(passesHardConstraints(input).pass).toBe(true);
  });

  it("終電に間に合わない場合は pass=false", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "21:00",
        bookings: [],
        companionType: "友人",
        budget: "普通",
        returnConstraint: "最終電車 22:00",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "21:00",
        triggerType: "delay",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "遅くまで楽しめるスポット",
        estimatedDuration: "2時間",
        category: "culture",
      },
    });
    const result = passesHardConstraints(input);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("帰路制約");
  });

  // ---- 予約チェック ----

  it("予約に間に合う場合は pass=true", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "14:00",
        bookings: [
          { name: "懐石料理", time: "18:00", isCancellable: false },
        ],
        companionType: "カップル",
        budget: "普通",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "14:00",
        triggerType: "rain",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "近くの美術館",
        estimatedDuration: "2時間",
        category: "culture",
      },
    });
    expect(passesHardConstraints(input).pass).toBe(true);
  });

  it("キャンセル不可の予約に間に合わない場合は pass=false", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "16:00",
        bookings: [
          { name: "懐石料理", time: "17:00", isCancellable: false },
        ],
        companionType: "カップル",
        budget: "普通",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "16:00",
        triggerType: "delay",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "遠方の観光スポット",
        estimatedDuration: "2時間",
        category: "outdoor",
      },
    });
    const result = passesHardConstraints(input);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("懐石料理");
  });

  it("キャンセル可能な予約は衝突してもパスする", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "16:00",
        bookings: [
          { name: "オプショナルツアー", time: "17:00", isCancellable: true },
        ],
        companionType: "友人",
        budget: "普通",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "16:00",
        triggerType: "delay",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "別の場所",
        estimatedDuration: "2時間",
        category: "outdoor",
      },
    });
    expect(passesHardConstraints(input).pass).toBe(true);
  });

  // ---- 歩行距離チェック ----

  it("歩行距離が上限内なら pass=true", () => {
    const input = makeInput({
      state: {
        estimatedFatigue: 0.5,
        walkingDistanceKm: 14,
        delayMinutes: 0,
        currentTime: "14:00",
        triggerType: "fatigue",
      },
    });
    expect(passesHardConstraints(input).pass).toBe(true);
  });

  it("歩行距離が上限超過なら pass=false", () => {
    const input = makeInput({
      state: {
        estimatedFatigue: 0.8,
        walkingDistanceKm: 16,
        delayMinutes: 0,
        currentTime: "14:00",
        triggerType: "fatigue",
      },
    });
    const result = passesHardConstraints(input);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("歩行距離");
  });

  // ---- 複合チェック ----

  it("終電 OK + 予約 NG の場合は pass=false を返す", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "15:00",
        bookings: [
          { name: "ディナー", time: "16:00", isCancellable: false },
        ],
        companionType: "友人",
        budget: "普通",
        returnConstraint: "最終電車 23:00",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "15:00",
        triggerType: "delay",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "のんびり散策",
        estimatedDuration: "2時間",
        category: "outdoor",
      },
    });
    const result = passesHardConstraints(input);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain("ディナー");
  });
});
