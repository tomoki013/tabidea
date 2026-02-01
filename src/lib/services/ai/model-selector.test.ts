// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  selectModel,
  evaluateComplexity,
  shouldUsePro,
  extractComplexity,
  getTemperature,
  type ModelSelectionInput,
  type RequestComplexity,
} from "./model-selector";

describe("model-selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateComplexity", () => {
    it("returns 'low' for undefined complexity", () => {
      expect(evaluateComplexity(undefined)).toBe("low");
    });

    it("returns 'low' for simple trips", () => {
      const complexity: RequestComplexity = {
        durationDays: 2,
        isMultiCity: false,
      };
      expect(evaluateComplexity(complexity)).toBe("low");
    });

    it("returns 'medium' for multi-city trips", () => {
      const complexity: RequestComplexity = {
        durationDays: 3,
        isMultiCity: true,
      };
      expect(evaluateComplexity(complexity)).toBe("medium");
    });

    it("returns 'high' for long multi-city trips with special requirements", () => {
      const complexity: RequestComplexity = {
        durationDays: 7,
        isMultiCity: true,
        companionType: "family",
        hasSpecialRequirements: true,
      };
      expect(evaluateComplexity(complexity)).toBe("high");
    });

    it("considers family_senior as special companion type", () => {
      const complexity: RequestComplexity = {
        durationDays: 5,
        isMultiCity: false,
        companionType: "family_senior",
      };
      // 2 (long trip) + 1 (special companion) = 3 (medium)
      expect(evaluateComplexity(complexity)).toBe("medium");
    });
  });

  describe("shouldUsePro", () => {
    it("returns false when premium_ai is not available", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: { type: "premium_ai", hasAccess: false, isUnlimited: false, remaining: 0, sources: [] },
      };
      expect(shouldUsePro(input)).toBe(false);
    });

    it("returns false when premium_ai status is undefined", () => {
      const input: ModelSelectionInput = {};
      expect(shouldUsePro(input)).toBe(false);
    });

    it("returns true when user explicitly prefers Pro", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: { type: "premium_ai", hasAccess: true, isUnlimited: true, remaining: null, sources: [] },
        userPrefersPro: true,
      };
      expect(shouldUsePro(input)).toBe(true);
    });

    it("returns true for high complexity requests with premium access", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: { type: "premium_ai", hasAccess: true, isUnlimited: true, remaining: null, sources: [] },
        complexity: {
          durationDays: 7,
          isMultiCity: true,
          hasSpecialRequirements: true,
        },
      };
      expect(shouldUsePro(input)).toBe(true);
    });

    it("returns false for simple requests even with premium access", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: { type: "premium_ai", hasAccess: true, isUnlimited: true, remaining: null, sources: [] },
        complexity: {
          durationDays: 2,
          isMultiCity: false,
        },
      };
      expect(shouldUsePro(input)).toBe(false);
    });
  });

  describe("selectModel", () => {
    it("selects flash model for free users", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: undefined,
        phase: "details",
      };
      const result = selectModel(input);
      expect(result.tier).toBe("flash");
      expect(result.temperature).toBe(0.1);
    });

    it("selects pro model when user prefers it", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: { type: "premium_ai", hasAccess: true, isUnlimited: true, remaining: null, sources: [] },
        userPrefersPro: true,
        phase: "outline",
      };
      const result = selectModel(input);
      expect(result.tier).toBe("pro");
      expect(result.reason).toContain("ユーザーがProモデルを選択");
    });

    it("uses correct temperature for each phase", () => {
      const input: ModelSelectionInput = {
        premiumAiStatus: undefined,
      };

      expect(selectModel({ ...input, phase: "outline" }).temperature).toBe(0.3);
      expect(selectModel({ ...input, phase: "details" }).temperature).toBe(0.1);
      expect(selectModel({ ...input, phase: "modify" }).temperature).toBe(0.1);
    });
  });

  describe("extractComplexity", () => {
    it("detects multi-city from comma-separated destinations", () => {
      const result = extractComplexity({
        destinations: "東京、大阪、京都",
        duration: 5,
      });
      expect(result.isMultiCity).toBe(true);
      expect(result.durationDays).toBe(5);
    });

    it("detects multi-city from arrow notation", () => {
      const result = extractComplexity({
        destinations: "東京→大阪",
        duration: 3,
      });
      expect(result.isMultiCity).toBe(true);
    });

    it("detects multi-city from 周遊 keyword", () => {
      const result = extractComplexity({
        destinations: "九州周遊",
        duration: 7,
      });
      expect(result.isMultiCity).toBe(true);
    });

    it("detects special requirements from companions text", () => {
      const result = extractComplexity({
        destinations: "東京",
        duration: 2,
        companions: "車椅子の祖母と一緒",
      });
      expect(result.hasSpecialRequirements).toBe(true);
      expect(result.companionType).toBe("family_senior");
    });

    it("infers companion type from text", () => {
      expect(extractComplexity({ companions: "一人旅" }).companionType).toBe("solo");
      expect(extractComplexity({ companions: "カップル" }).companionType).toBe("couple");
      expect(extractComplexity({ companions: "友達と" }).companionType).toBe("friends");
    });
  });

  describe("getTemperature", () => {
    it("returns correct temperature for each phase", () => {
      expect(getTemperature("outline")).toBe(0.3);
      expect(getTemperature("details")).toBe(0.1);
      expect(getTemperature("modify")).toBe(0.1);
    });
  });
});
