/**
 * イベント計測の型定義
 *
 * 全てのユーザーアクションとシステムイベントを型安全に定義。
 */

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  | "plan_generated"
  | "plan_viewed"
  | "replan_triggered"
  | "replan_shown"
  | "replan_selected"
  | "replan_rejected"
  | "plan_shared"
  | "reflection_submitted";

// ============================================================================
// Generation Log
// ============================================================================

export interface GenerationLogEvent {
  /** ユーザーID (認証済みの場合) */
  userId?: string;
  /** イベント種別 */
  eventType: "plan_generated" | "plan_viewed";
  /** 目的地 */
  destination?: string;
  /** 旅行日数 */
  durationDays?: number;
  /** 使用モデル名 */
  modelName?: string;
  /** モデルティア */
  modelTier?: "flash" | "pro";
  /** 処理時間 (ms) */
  processingTimeMs?: number;
  /** 追加メタデータ */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Replan Event
// ============================================================================

export interface ReplanEvent {
  /** ユーザーID (認証済みの場合) */
  userId?: string;
  /** プランID */
  planId?: string;
  /** トリガー種別 */
  triggerType: "rain" | "fatigue" | "delay";
  /** トリガーの理由（自由テキスト） */
  triggerReason?: string;
  /** 提案を受諾したか */
  suggestionAccepted?: boolean;
  /** Human Resolution Score */
  humanResolutionScore?: number;
  /** 処理時間 (ms) */
  processingTimeMs?: number;
  /** 追加メタデータ */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Generic Event
// ============================================================================

export interface AnalyticsEvent {
  /** ユーザーID */
  userId?: string;
  /** イベント種別 */
  eventType: EventType;
  /** 追加メタデータ */
  metadata?: Record<string, unknown>;
}
