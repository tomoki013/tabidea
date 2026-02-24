/**
 * EventLogger — イベント計測サービス
 *
 * Supabase に generation_logs / replan_events を記録する。
 * エラー時はログを出力するが例外を投げない（fail-open）。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GenerationLogEvent, ReplanEvent, AnalyticsEvent } from "./types";

// ============================================================================
// EventLogger
// ============================================================================

export class EventLogger {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * プラン生成イベントを記録する。
   */
  async logGeneration(event: GenerationLogEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("generation_logs")
        .insert({
          user_id: event.userId ?? null,
          event_type: event.eventType,
          destination: event.destination ?? null,
          duration_days: event.durationDays ?? null,
          model_name: event.modelName ?? null,
          model_tier: event.modelTier ?? null,
          processing_time_ms: event.processingTimeMs ?? null,
          metadata: event.metadata ?? {},
        });

      if (error) {
        console.error("[EventLogger] Failed to log generation:", error.message);
      }
    } catch (err) {
      console.error("[EventLogger] Unexpected error in logGeneration:", err);
    }
  }

  /**
   * リプランイベントを記録する。
   */
  async logReplan(event: ReplanEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("replan_events")
        .insert({
          user_id: event.userId ?? null,
          plan_id: event.planId ?? null,
          trigger_type: event.triggerType,
          trigger_reason: event.triggerReason ?? null,
          suggestion_accepted: event.suggestionAccepted ?? null,
          human_resolution_score: event.humanResolutionScore ?? null,
          processing_time_ms: event.processingTimeMs ?? null,
          metadata: event.metadata ?? {},
        });

      if (error) {
        console.error("[EventLogger] Failed to log replan:", error.message);
      }
    } catch (err) {
      console.error("[EventLogger] Unexpected error in logReplan:", err);
    }
  }

  /**
   * 汎用イベントを記録する。
   */
  async logEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("generation_logs")
        .insert({
          user_id: event.userId ?? null,
          event_type: event.eventType,
          metadata: event.metadata ?? {},
        });

      if (error) {
        console.error("[EventLogger] Failed to log event:", error.message);
      }
    } catch (err) {
      console.error("[EventLogger] Unexpected error in logEvent:", err);
    }
  }
}
