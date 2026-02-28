import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getPlanToActionRate,
  getReplanRate,
  getRescueSuccessRate,
  getReusageIntentRate,
  getCompanionShareRate,
} from "./kpi-queries";

// ============================================================================
// Supabase Mock
// ============================================================================

function createMockSupabase(countMap: Record<string, number> = {}) {
  let callIndex = 0;
  const counts = Object.values(countMap);

  const selectFn = vi.fn().mockImplementation(() => {
    const currentCount = counts[callIndex] ?? 0;
    callIndex++;

    const chainObj: Record<string, unknown> = {};
    const chain = (returnValue: { count: number }) => {
      chainObj.eq = vi.fn().mockReturnValue(chainObj);
      chainObj.gte = vi.fn().mockReturnValue(chainObj);
      chainObj.lte = vi.fn().mockReturnValue(returnValue);
      return chainObj;
    };
    return chain({ count: currentCount });
  });

  return {
    from: vi.fn().mockReturnValue({ select: selectFn }),
    selectFn,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("KPI Queries", () => {
  describe("getPlanToActionRate", () => {
    it("shown=100, selected=30 で 0.3 を返す", async () => {
      const supabase = createMockSupabase({ shown: 100, selected: 30 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getPlanToActionRate(supabase as any);

      expect(result.name).toBe("plan_to_action_rate");
      expect(result.value).toBeCloseTo(0.3);
      expect(result.numerator).toBe(30);
      expect(result.denominator).toBe(100);
    });

    it("ゼロ除算で 0 を返す", async () => {
      const supabase = createMockSupabase({ shown: 0, selected: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getPlanToActionRate(supabase as any);
      expect(result.value).toBe(0);
    });

    it("期間情報が含まれる", async () => {
      const supabase = createMockSupabase({ shown: 10, selected: 5 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getPlanToActionRate(supabase as any, 7);
      expect(result.period.from).toBeTruthy();
      expect(result.period.to).toBeTruthy();
    });
  });

  describe("getReplanRate", () => {
    it("viewed=200, triggered=20 で 0.1 を返す", async () => {
      const supabase = createMockSupabase({ viewed: 200, triggered: 20 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getReplanRate(supabase as any);

      expect(result.name).toBe("replan_rate");
      expect(result.value).toBeCloseTo(0.1);
    });

    it("ゼロ除算で 0 を返す", async () => {
      const supabase = createMockSupabase({ viewed: 0, triggered: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getReplanRate(supabase as any);
      expect(result.value).toBe(0);
    });
  });

  describe("getRescueSuccessRate", () => {
    it("triggered=50, accepted=40 で 0.8 を返す", async () => {
      const supabase = createMockSupabase({ triggered: 50, accepted: 40 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getRescueSuccessRate(supabase as any);

      expect(result.name).toBe("rescue_success_rate");
      expect(result.value).toBeCloseTo(0.8);
    });

    it("ゼロ除算で 0 を返す", async () => {
      const supabase = createMockSupabase({ triggered: 0, accepted: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getRescueSuccessRate(supabase as any);
      expect(result.value).toBe(0);
    });
  });

  describe("getReusageIntentRate", () => {
    it("total=100, helped=75 で 0.75 を返す", async () => {
      const supabase = createMockSupabase({ total: 100, helped: 75 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getReusageIntentRate(supabase as any);

      expect(result.name).toBe("reusage_intent_rate");
      expect(result.value).toBeCloseTo(0.75);
    });

    it("ゼロ除算で 0 を返す", async () => {
      const supabase = createMockSupabase({ total: 0, helped: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getReusageIntentRate(supabase as any);
      expect(result.value).toBe(0);
    });
  });

  describe("getCompanionShareRate", () => {
    it("generated=100, shared=15 で 0.15 を返す", async () => {
      const supabase = createMockSupabase({ generated: 100, shared: 15 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getCompanionShareRate(supabase as any);

      expect(result.name).toBe("companion_share_rate");
      expect(result.value).toBeCloseTo(0.15);
    });

    it("ゼロ除算で 0 を返す", async () => {
      const supabase = createMockSupabase({ generated: 0, shared: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getCompanionShareRate(supabase as any);
      expect(result.value).toBe(0);
    });
  });
});
