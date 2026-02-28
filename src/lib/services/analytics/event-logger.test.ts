import { describe, it, expect, vi, beforeEach } from "vitest";

import { EventLogger } from "./event-logger";

// ============================================================================
// Supabase Mock
// ============================================================================

function createMockSupabase() {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn = vi.fn().mockReturnValue({ insert: insertFn });

  return {
    client: { from: fromFn } as unknown as Parameters<typeof EventLogger extends new (s: infer S) => unknown ? S : never>[0],
    fromFn,
    insertFn,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("EventLogger", () => {
  let mock: ReturnType<typeof createMockSupabase>;
  let logger: EventLogger;

  beforeEach(() => {
    mock = createMockSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger = new EventLogger(mock.client as any);
  });

  // ---- logGeneration ----

  describe("logGeneration", () => {
    it("generation_logs テーブルに挿入する", async () => {
      await logger.logGeneration({
        userId: "user-1",
        eventType: "plan_generated",
        destination: "京都",
        durationDays: 3,
        modelName: "gemini-flash",
        modelTier: "flash",
        processingTimeMs: 5000,
      });

      expect(mock.fromFn).toHaveBeenCalledWith("generation_logs");
      expect(mock.insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          event_type: "plan_generated",
          destination: "京都",
          duration_days: 3,
          model_name: "gemini-flash",
          model_tier: "flash",
          processing_time_ms: 5000,
        })
      );
    });

    it("オプションフィールドが未指定の場合 null を挿入する", async () => {
      await logger.logGeneration({
        eventType: "plan_viewed",
      });

      expect(mock.insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          destination: null,
          duration_days: null,
          model_name: null,
        })
      );
    });

    it("DB エラー時は例外を投げずにログを出力する", async () => {
      mock.insertFn.mockResolvedValue({ error: { message: "DB Error" } });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        logger.logGeneration({ eventType: "plan_generated" })
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[EventLogger]"),
        expect.any(String)
      );
      consoleSpy.mockRestore();
    });

    it("予期せぬ例外時も fail-open する", async () => {
      mock.insertFn.mockRejectedValue(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        logger.logGeneration({ eventType: "plan_generated" })
      ).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ---- logReplan ----

  describe("logReplan", () => {
    it("replan_events テーブルに挿入する", async () => {
      await logger.logReplan({
        userId: "user-1",
        planId: "plan-1",
        triggerType: "rain",
        triggerReason: "急に雨が降ってきた",
        suggestionAccepted: true,
        humanResolutionScore: 0.85,
        processingTimeMs: 2500,
      });

      expect(mock.fromFn).toHaveBeenCalledWith("replan_events");
      expect(mock.insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          plan_id: "plan-1",
          trigger_type: "rain",
          suggestion_accepted: true,
          human_resolution_score: 0.85,
        })
      );
    });

    it("全トリガー種別を記録できる", async () => {
      for (const type of ["rain", "fatigue", "delay"] as const) {
        mock.insertFn.mockClear();
        await logger.logReplan({ triggerType: type });
        expect(mock.insertFn).toHaveBeenCalledWith(
          expect.objectContaining({ trigger_type: type })
        );
      }
    });

    it("DB エラー時は fail-open する", async () => {
      mock.insertFn.mockResolvedValue({ error: { message: "DB Error" } });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        logger.logReplan({ triggerType: "rain" })
      ).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ---- logEvent ----

  describe("logEvent", () => {
    it("汎用イベントを generation_logs に記録する", async () => {
      await logger.logEvent({
        userId: "user-1",
        eventType: "plan_shared",
        metadata: { shareMethod: "link" },
      });

      expect(mock.fromFn).toHaveBeenCalledWith("generation_logs");
      expect(mock.insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          event_type: "plan_shared",
          metadata: { shareMethod: "link" },
        })
      );
    });

    it("metadata が未指定の場合は空オブジェクトを挿入する", async () => {
      await logger.logEvent({
        eventType: "plan_viewed",
      });

      expect(mock.insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        })
      );
    });
  });
});
