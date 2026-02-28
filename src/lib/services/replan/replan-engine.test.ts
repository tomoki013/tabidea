import { describe, it, expect, vi } from "vitest";

import type {
  PlanSlot,
  RecoveryOption,
  ReplanTrigger,
  TravelerState,
  TripContext,
  TripPlan,
} from "@/types/replan";
import type { Itinerary } from "@/types";

import { ReplanEngine } from "./replan-engine";
import type { ReplanAIProvider } from "./replan-engine";

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

function makeItinerary(): Itinerary {
  return {
    id: "itin-1",
    destination: "京都",
    description: "京都旅行",
    days: [
      {
        day: 1,
        title: "Day 1",
        activities: [
          { time: "10:00", activity: "金閣寺", description: "寺院" },
          { time: "14:00", activity: "清水寺", description: "寺院" },
          { time: "17:00", activity: "祇園散策", description: "散策" },
        ],
      },
    ],
  };
}

function makeTripPlan(slots?: PlanSlot[]): TripPlan {
  return {
    itinerary: makeItinerary(),
    slots: slots ?? [
      makeSlot({ id: "slot-1", slotIndex: 0 }),
      makeSlot({
        id: "slot-2",
        slotIndex: 1,
        activity: { time: "14:00", activity: "清水寺", description: "寺院" },
      }),
      makeSlot({
        id: "slot-3",
        slotIndex: 2,
        activity: { time: "17:00", activity: "祇園散策", description: "散策" },
      }),
    ],
    constraints: [],
    metadata: {
      city: "京都",
      totalDays: 1,
      companionType: "友人",
      budget: "普通",
      createdAt: "2025-01-01",
    },
  };
}

function makeTrigger(overrides: Partial<ReplanTrigger> = {}): ReplanTrigger {
  return {
    type: "rain",
    slotId: "slot-2",
    timestamp: "2025-01-01T14:00:00Z",
    ...overrides,
  };
}

function makeState(overrides: Partial<TravelerState> = {}): TravelerState {
  return {
    estimatedFatigue: 0.3,
    walkingDistanceKm: 5,
    delayMinutes: 0,
    currentTime: "14:00",
    currentLocation: { lat: 35.0, lng: 135.7 },
    triggerType: "rain",
    ...overrides,
  };
}

function makeContext(overrides: Partial<TripContext> = {}): TripContext {
  return {
    city: "京都",
    currentTime: "14:00",
    bookings: [],
    companionType: "友人",
    budget: "普通",
    weather: { condition: "rainy" },
    ...overrides,
  };
}

function makeOption(overrides: Partial<RecoveryOption> = {}): RecoveryOption {
  return {
    id: "opt-1",
    replacementSlots: [makeSlot()],
    explanation: "雨宿りしながらゆっくり美術館を楽しめます",
    estimatedDuration: "1時間30分",
    category: "indoor",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ReplanEngine", () => {
  describe("基本動作", () => {
    it("AI プロバイダーなしでもフォールバックで結果を返す", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      expect(result.primaryOption).toBeDefined();
      expect(result.scoreBreakdown).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("rain トリガーで ReplanResult を返す", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger({ type: "rain" }),
        makeTripPlan(),
        makeState({ triggerType: "rain" }),
        makeContext()
      );

      expect(result.primaryOption).toBeDefined();
      expect(result.explanation).toBeTruthy();
    });

    it("fatigue トリガーで ReplanResult を返す", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger({ type: "fatigue" }),
        makeTripPlan(),
        makeState({ triggerType: "fatigue", estimatedFatigue: 0.7 }),
        makeContext()
      );

      expect(result.primaryOption).toBeDefined();
    });

    it("delay トリガーで ReplanResult を返す", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger({ type: "delay" }),
        makeTripPlan(),
        makeState({ triggerType: "delay", delayMinutes: 30 }),
        makeContext()
      );

      expect(result.primaryOption).toBeDefined();
    });
  });

  describe("AI プロバイダー連携", () => {
    it("AI プロバイダーの結果をスコアリングして返す", async () => {
      const mockProvider: ReplanAIProvider = {
        generateAlternatives: vi.fn().mockResolvedValue([
          makeOption({ id: "ai-1", category: "indoor" }),
          makeOption({ id: "ai-2", category: "food" }),
        ]),
      };

      const engine = new ReplanEngine(mockProvider);
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      expect(mockProvider.generateAlternatives).toHaveBeenCalled();
      expect(result.primaryOption).toBeDefined();
      expect(result.scoreBreakdown.hardPass).toBe(true);
    });

    it("AI プロバイダーがエラーを投げた場合フォールバックを使う", async () => {
      const mockProvider: ReplanAIProvider = {
        generateAlternatives: vi.fn().mockRejectedValue(new Error("API Error")),
      };

      const engine = new ReplanEngine(mockProvider);
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      expect(result.primaryOption).toBeDefined();
      expect(result.primaryOption.id).toMatch(/^fallback-/);
    });

    it("AI プロバイダーが空配列を返した場合フォールバックを使う", async () => {
      const mockProvider: ReplanAIProvider = {
        generateAlternatives: vi.fn().mockResolvedValue([]),
      };

      const engine = new ReplanEngine(mockProvider);
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      expect(result.primaryOption).toBeDefined();
      expect(result.primaryOption.id).toMatch(/^fallback-/);
    });
  });

  describe("影響スロット特定", () => {
    it("トリガースロット以降の同日スキップ可能スロットを影響範囲とする", async () => {
      const mockProvider: ReplanAIProvider = {
        generateAlternatives: vi.fn().mockResolvedValue([makeOption()]),
      };

      const engine = new ReplanEngine(mockProvider);
      await engine.replan(
        makeTrigger({ slotId: "slot-2" }),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      const callArgs = (mockProvider.generateAlternatives as ReturnType<typeof vi.fn>).mock.calls[0];
      const affectedSlots = callArgs[1] as PlanSlot[];
      // slot-2 と slot-3 が影響範囲
      expect(affectedSlots.length).toBe(2);
    });

    it("存在しないスロットIDの場合、空の影響スロットで処理する", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger({ slotId: "nonexistent" }),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      // フォールバックで結果を返すべき
      expect(result.primaryOption).toBeDefined();
    });

    it("isSkippable=false のスロットは影響範囲から除外される", async () => {
      const mockProvider: ReplanAIProvider = {
        generateAlternatives: vi.fn().mockResolvedValue([makeOption()]),
      };

      const slots = [
        makeSlot({ id: "slot-1", slotIndex: 0 }),
        makeSlot({ id: "slot-2", slotIndex: 1 }),
        makeSlot({
          id: "slot-3",
          slotIndex: 2,
          isSkippable: false,
          activity: { time: "17:00", activity: "予約済みディナー", description: "" },
        }),
      ];

      const engine = new ReplanEngine(mockProvider);
      await engine.replan(
        makeTrigger({ slotId: "slot-2" }),
        makeTripPlan(slots),
        makeState(),
        makeContext()
      );

      const callArgs = (mockProvider.generateAlternatives as ReturnType<typeof vi.fn>).mock.calls[0];
      const affectedSlots = callArgs[1] as PlanSlot[];
      // slot-3 は isSkippable=false なので除外
      expect(affectedSlots.length).toBe(1);
      expect(affectedSlots[0].id).toBe("slot-2");
    });
  });

  describe("スコアリング", () => {
    it("結果にスコア内訳が含まれる", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      expect(result.scoreBreakdown).toBeDefined();
      expect(typeof result.scoreBreakdown.total).toBe("number");
      expect(typeof result.scoreBreakdown.hardPass).toBe("boolean");
    });

    it("処理時間が記録される", async () => {
      const engine = new ReplanEngine();
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("タイムアウト", () => {
    it("AI が AbortSignal で中断された場合フォールバックで応答する", async () => {
      const slowProvider: ReplanAIProvider = {
        generateAlternatives: vi.fn().mockImplementation(
          (_trigger: ReplanTrigger, _slots: PlanSlot[], _ctx: TripContext, signal?: AbortSignal) => {
            return new Promise((resolve, reject) => {
              const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
              if (signal?.aborted) { onAbort(); return; }
              signal?.addEventListener("abort", onAbort);
              // 5秒待つ（タイムアウトより長い）
              setTimeout(() => resolve([makeOption()]), 5000);
            });
          }
        ),
      };

      const engine = new ReplanEngine(slowProvider);
      const result = await engine.replan(
        makeTrigger(),
        makeTripPlan(),
        makeState(),
        makeContext()
      );

      // AbortSignal による中断 → フォールバック
      expect(result.primaryOption).toBeDefined();
      expect(result.primaryOption.id).toMatch(/^fallback-/);
    }, 10000);
  });
});
