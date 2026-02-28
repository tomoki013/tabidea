import { describe, it, expect } from "vitest";

import type { PlanSlot } from "@/types/replan";

import { scoreHumanResolution } from "./score-human-resolution";
import type { HumanResolutionInput, ScoringSignal } from "./types";

// ============================================================================
// Helpers
// ============================================================================

function makeSlot(overrides: Partial<PlanSlot> = {}): PlanSlot {
  return {
    id: "slot-1",
    dayNumber: 1,
    slotIndex: 0,
    activity: { time: "10:00", activity: "金閣寺", description: "寺院" },
    bufferMinutes: 15,
    isSkippable: true,
    priority: "nice",
    constraints: [],
    ...overrides,
  };
}

function makeInput(overrides: Partial<HumanResolutionInput> = {}): HumanResolutionInput {
  return {
    context: {
      city: "京都",
      currentTime: "14:00",
      bookings: [],
      companionType: "友人",
      budget: "普通",
      weather: { condition: "rainy" },
      ...overrides.context,
    },
    state: {
      estimatedFatigue: 0.3,
      walkingDistanceKm: 5,
      delayMinutes: 0,
      currentTime: "14:00",
      currentLocation: { lat: 35.0, lng: 135.7 },
      triggerType: "rain",
      ...overrides.state,
    },
    option: {
      id: "opt-1",
      replacementSlots: [makeSlot()],
      explanation: "雨宿りしながらゆっくり美術館を楽しむことができます",
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

describe("scoreHumanResolution", () => {
  // ---- 基本動作 ----

  it("基本入力で ScoreBreakdown を返す", () => {
    const result = scoreHumanResolution(makeInput());
    expect(result.hardPass).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(1);
  });

  it("全シグナルのスコアが 0 以上", () => {
    const result = scoreHumanResolution(makeInput());
    expect(result.safetyMargin).toBeGreaterThanOrEqual(0);
    expect(result.timeFeasibility).toBeGreaterThanOrEqual(0);
    expect(result.physicalLoadFit).toBeGreaterThanOrEqual(0);
    expect(result.recoveryMargin).toBeGreaterThanOrEqual(0);
    expect(result.preferenceFit).toBeGreaterThanOrEqual(0);
    expect(result.optionality).toBeGreaterThanOrEqual(0);
    expect(result.narrativePotential).toBeGreaterThanOrEqual(0);
    expect(result.explainability).toBeGreaterThanOrEqual(0);
    expect(result.regretRisk).toBeGreaterThanOrEqual(0);
    expect(result.contextMismatch).toBeGreaterThanOrEqual(0);
    expect(result.uncertaintyPenalty).toBeGreaterThanOrEqual(0);
  });

  // ---- Hard Constraint 違反 ----

  it("Hard Constraint 違反時は hardPass=false, total=-Infinity", () => {
    const input = makeInput({
      state: {
        estimatedFatigue: 0.9,
        walkingDistanceKm: 20, // 上限超過
        delayMinutes: 0,
        currentTime: "14:00",
        triggerType: "fatigue",
      },
    });
    const result = scoreHumanResolution(input);
    expect(result.hardPass).toBe(false);
    expect(result.total).toBe(-Infinity);
  });

  it("終電超過で hardPass=false", () => {
    const input = makeInput({
      context: {
        city: "京都",
        currentTime: "22:00",
        bookings: [],
        companionType: "友人",
        budget: "普通",
        returnConstraint: "最終電車 22:30",
      },
      state: {
        estimatedFatigue: 0.3,
        walkingDistanceKm: 5,
        delayMinutes: 0,
        currentTime: "22:00",
        triggerType: "delay",
      },
      option: {
        id: "opt-1",
        replacementSlots: [],
        explanation: "夜景スポット",
        estimatedDuration: "2時間",
        category: "outdoor",
      },
    });
    const result = scoreHumanResolution(input);
    expect(result.hardPass).toBe(false);
    expect(result.total).toBe(-Infinity);
  });

  // ---- モード別重み ----

  it("rain モードでは indoor が outdoor より高スコア", () => {
    const indoorInput = makeInput({
      mode: "rain",
      option: {
        id: "opt-indoor",
        replacementSlots: [makeSlot()],
        explanation: "雨宿りしながら美術館を楽しめます",
        estimatedDuration: "1時間30分",
        category: "indoor",
      },
    });
    const outdoorInput = makeInput({
      mode: "rain",
      option: {
        id: "opt-outdoor",
        replacementSlots: [makeSlot()],
        explanation: "公園を散策するプランです",
        estimatedDuration: "1時間30分",
        category: "outdoor",
      },
    });

    const indoorResult = scoreHumanResolution(indoorInput);
    const outdoorResult = scoreHumanResolution(outdoorInput);
    expect(indoorResult.total).toBeGreaterThan(outdoorResult.total);
  });

  it("fatigue モードでは rest が outdoor より高スコア", () => {
    const restInput = makeInput({
      mode: "fatigue",
      state: {
        estimatedFatigue: 0.7,
        walkingDistanceKm: 8,
        delayMinutes: 0,
        currentTime: "15:00",
        currentLocation: { lat: 35.0, lng: 135.7 },
        triggerType: "fatigue",
      },
      option: {
        id: "opt-rest",
        replacementSlots: [makeSlot()],
        explanation: "近くの温泉で疲れを癒すことができます",
        estimatedDuration: "1時間30分",
        category: "rest",
      },
    });
    const outdoorInput = makeInput({
      mode: "fatigue",
      state: {
        estimatedFatigue: 0.7,
        walkingDistanceKm: 8,
        delayMinutes: 0,
        currentTime: "15:00",
        currentLocation: { lat: 35.0, lng: 135.7 },
        triggerType: "fatigue",
      },
      option: {
        id: "opt-outdoor",
        replacementSlots: [makeSlot()],
        explanation: "山頂からの絶景を楽しめるハイキングコース",
        estimatedDuration: "1時間30分",
        category: "outdoor",
      },
    });

    const restResult = scoreHumanResolution(restInput);
    const outdoorResult = scoreHumanResolution(outdoorInput);
    expect(restResult.total).toBeGreaterThan(outdoorResult.total);
  });

  // ---- カスタムシグナル注入 ----

  it("カスタムシグナルを注入できる", () => {
    const customSignal: ScoringSignal = {
      name: "custom",
      calculate: () => 0.9,
    };

    const result = scoreHumanResolution(
      makeInput(),
      [customSignal],
      { custom: 1.0 }
    );
    expect(result.hardPass).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  // ---- 重みオーバーライド ----

  it("重みオーバーライドが反映される", () => {
    const input = makeInput();

    const defaultResult = scoreHumanResolution(input);
    const overrideResult = scoreHumanResolution(input, undefined, {
      safetyMargin: 0.5,
    });

    // 重みが変わるので total が異なるはず
    expect(defaultResult.total).not.toBe(overrideResult.total);
  });

  // ---- エッジケース ----

  it("total は 0-1 にクランプされる", () => {
    const result = scoreHumanResolution(makeInput());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(1);
  });

  it("全てのシグナルが 0 でも crash しない", () => {
    const zeroSignal: ScoringSignal = {
      name: "zero",
      calculate: () => 0,
    };

    const result = scoreHumanResolution(
      makeInput(),
      [zeroSignal],
      { zero: 1.0 }
    );
    expect(result.hardPass).toBe(true);
    expect(result.total).toBe(0);
  });

  it("説明文が長い提案はexplainabilityが高い", () => {
    const shortInput = makeInput({
      option: {
        id: "opt-short",
        replacementSlots: [makeSlot()],
        explanation: "カフェ",
        estimatedDuration: "1時間",
        category: "food",
      },
    });
    const longInput = makeInput({
      option: {
        id: "opt-long",
        replacementSlots: [makeSlot()],
        explanation: "雨の日にぴったりの落ち着いたカフェで、地元の和菓子と抹茶を楽しみながらゆっくりとした時間を過ごせます",
        estimatedDuration: "1時間",
        category: "food",
      },
    });

    const shortResult = scoreHumanResolution(shortInput);
    const longResult = scoreHumanResolution(longInput);
    expect(longResult.explainability).toBeGreaterThan(shortResult.explainability);
  });

  it("must priority スロットを含む提案は regretRisk が高い", () => {
    const mustSlot = makeSlot({ priority: "must" });
    const niceSlot = makeSlot({ priority: "nice" });

    const mustInput = makeInput({
      option: {
        id: "opt-must",
        replacementSlots: [mustSlot],
        explanation: "予約済みスポットの変更を含むプランです",
        estimatedDuration: "1時間",
        category: "culture",
      },
    });
    const niceInput = makeInput({
      option: {
        id: "opt-nice",
        replacementSlots: [niceSlot],
        explanation: "気軽に変更できるスポットだけの変更です",
        estimatedDuration: "1時間",
        category: "culture",
      },
    });

    const mustResult = scoreHumanResolution(mustInput);
    const niceResult = scoreHumanResolution(niceInput);
    expect(mustResult.regretRisk).toBeGreaterThan(niceResult.regretRisk);
  });
});
