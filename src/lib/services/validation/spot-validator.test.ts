// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import {
  SpotValidator,
  getSpotValidator,
  resetSpotValidator,
  confidenceToNumber,
  meetsConfidenceThreshold,
  formatValidationSummary,
  type ValidationResult,
} from "./spot-validator";

describe("SpotValidator", () => {
  beforeEach(() => {
    resetSpotValidator();
  });

  describe("validateSpot", () => {
    it("returns unverified result for any spot (stub implementation)", async () => {
      const validator = new SpotValidator();
      const result = await validator.validateSpot("浅草寺", "東京");

      expect(result.spotName).toBe("浅草寺");
      expect(result.isVerified).toBe(false);
      expect(result.confidence).toBe("unverified");
      expect(result.source).toBe("ai_generated");
    });

    it("caches results when useCache is true", async () => {
      const validator = new SpotValidator({ useCache: true });

      const result1 = await validator.validateSpot("金閣寺");
      const result2 = await validator.validateSpot("金閣寺");

      expect(result1).toEqual(result2);
      expect(validator.getCacheSize()).toBe(1);
    });

    it("does not cache when useCache is false", async () => {
      const validator = new SpotValidator({ useCache: false });

      await validator.validateSpot("銀閣寺");
      expect(validator.getCacheSize()).toBe(0);
    });
  });

  describe("validateSpots", () => {
    it("validates multiple spots and returns batch result", async () => {
      const validator = new SpotValidator();
      const spots = [
        { name: "東京タワー", location: "東京" },
        { name: "スカイツリー", location: "東京" },
        { name: "浅草寺", location: "東京" },
      ];

      const result = await validator.validateSpots(spots);

      expect(result.results.size).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("validateItinerarySpots", () => {
    it("extracts and validates spots from itinerary days", async () => {
      const validator = new SpotValidator();
      const days = [
        {
          activities: [
            { activity: "浅草寺を訪問" },
            { activity: "スカイツリーでランチ" },
          ],
        },
        {
          activities: [
            { activity: "上野動物園" },
          ],
        },
      ];

      const results = await validator.validateItinerarySpots(days, "東京");

      expect(results.size).toBe(3);
      expect(results.get("浅草寺を訪問")).toBeDefined();
      expect(results.get("浅草寺を訪問")?.isVerified).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("clears all cached results", async () => {
      const validator = new SpotValidator();

      await validator.validateSpot("テスト1");
      await validator.validateSpot("テスト2");
      expect(validator.getCacheSize()).toBe(2);

      validator.clearCache();
      expect(validator.getCacheSize()).toBe(0);
    });
  });
});

describe("singleton functions", () => {
  beforeEach(() => {
    resetSpotValidator();
  });

  it("getSpotValidator returns singleton instance", () => {
    const instance1 = getSpotValidator();
    const instance2 = getSpotValidator();

    expect(instance1).toBe(instance2);
  });

  it("resetSpotValidator clears the singleton", () => {
    const instance1 = getSpotValidator();
    resetSpotValidator();
    const instance2 = getSpotValidator();

    expect(instance1).not.toBe(instance2);
  });
});

describe("utility functions", () => {
  describe("confidenceToNumber", () => {
    it("converts confidence levels to numbers", () => {
      expect(confidenceToNumber("high")).toBe(3);
      expect(confidenceToNumber("medium")).toBe(2);
      expect(confidenceToNumber("low")).toBe(1);
      expect(confidenceToNumber("unverified")).toBe(0);
    });
  });

  describe("meetsConfidenceThreshold", () => {
    it("returns true when confidence meets threshold", () => {
      expect(meetsConfidenceThreshold("high", "medium")).toBe(true);
      expect(meetsConfidenceThreshold("medium", "medium")).toBe(true);
      expect(meetsConfidenceThreshold("low", "low")).toBe(true);
    });

    it("returns false when confidence is below threshold", () => {
      expect(meetsConfidenceThreshold("low", "medium")).toBe(false);
      expect(meetsConfidenceThreshold("unverified", "low")).toBe(false);
    });
  });

  describe("formatValidationSummary", () => {
    it("returns AI生成（未検証）for unverified spots", () => {
      const result: ValidationResult = {
        spotName: "テスト",
        isVerified: false,
        confidence: "unverified",
      };
      expect(formatValidationSummary(result)).toBe("AI生成（未検証）");
    });

    it("formats verified spot with rating and reviews", () => {
      const result: ValidationResult = {
        spotName: "テスト",
        isVerified: true,
        confidence: "high",
        source: "google_places",
        details: {
          rating: 4.5,
          reviewCount: 100,
        },
      };
      const summary = formatValidationSummary(result);
      expect(summary).toContain("4.5★");
      expect(summary).toContain("100件の口コミ");
      expect(summary).toContain("Google認証済み");
    });

    it("returns 検証済み for verified spot without details", () => {
      const result: ValidationResult = {
        spotName: "テスト",
        isVerified: true,
        confidence: "medium",
      };
      expect(formatValidationSummary(result)).toBe("検証済み");
    });
  });
});
