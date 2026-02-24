/**
 * Replan ドメインモデル型定義
 * Replan Domain Types for AI Travel Planner
 *
 * 旅行中のプラン変更（Replan）に関する全型を定義。
 * 既存の Itinerary / Activity を拡張し、スロット単位の管理・
 * 制約検出・Human Resolution Scoring を支える基盤。
 */

import type { Activity, Itinerary } from "./itinerary";

// ============================================================================
// Constraint
// ============================================================================

/** 制約の種類 */
export type ConstraintType =
  | "last_train"
  | "booking"
  | "opening_hours"
  | "budget"
  | "walking_limit"
  | "custom";

/** 制約 */
export interface Constraint {
  /** 一意識別子 */
  id: string;
  /** 制約の種類 */
  type: ConstraintType;
  /** hard: 違反不可, soft: 可能なら遵守 */
  priority: "hard" | "soft";
  /** 制約の具体的な値（型は制約種別ごとに異なる） */
  value: unknown;
  /** 制約の発生源 */
  source: "user" | "system" | "booking" | "weather";
  /** 説明テキスト */
  description: string;
}

// ============================================================================
// PlanSlot
// ============================================================================

/** スロットの優先度 */
export type SlotPriority = "must" | "should" | "nice";

/** プランスロット — Activity をスケジュール上の「枠」として管理 */
export interface PlanSlot {
  /** 一意識別子 */
  id: string;
  /** 何日目か（1-indexed） */
  dayNumber: number;
  /** 日内でのインデックス（0-indexed） */
  slotIndex: number;
  /** 紐づくアクティビティ */
  activity: Activity;
  /** 開始時刻 (HH:mm) */
  startTime?: string;
  /** 終了時刻 (HH:mm) */
  endTime?: string;
  /** 前後のバッファ（分） */
  bufferMinutes: number;
  /** スキップ可能か */
  isSkippable: boolean;
  /** 優先度 */
  priority: SlotPriority;
  /** このスロットに紐づく制約一覧 */
  constraints: Constraint[];
}

// ============================================================================
// TripPlan (集約ルート)
// ============================================================================

/** 旅行メタデータ */
export interface TripMetadata {
  /** 都市名 */
  city: string;
  /** 旅行日数 */
  totalDays: number;
  /** 同行者タイプ */
  companionType: string;
  /** 予算レベル */
  budget: string;
  /** 作成日時 */
  createdAt: string;
}

/** TripPlan — Itinerary のリプラン拡張ラッパー */
export interface TripPlan {
  /** 元の旅程 */
  itinerary: Itinerary;
  /** スロット一覧 */
  slots: PlanSlot[];
  /** グローバル制約 */
  constraints: Constraint[];
  /** メタデータ */
  metadata: TripMetadata;
}

// ============================================================================
// Replan Trigger
// ============================================================================

/** リプランのトリガー種別 */
export type ReplanTriggerType = "rain" | "fatigue" | "delay";

/** リプラントリガー */
export interface ReplanTrigger {
  /** トリガー種別 */
  type: ReplanTriggerType;
  /** 対象スロットID */
  slotId: string;
  /** 発生日時 (ISO 8601) */
  timestamp: string;
  /** 追加情報 */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Traveler State & Trip Context
// ============================================================================

/** 天気情報（簡易版） */
export interface WeatherInfo {
  /** 天気状態 */
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  /** 気温 (°C) */
  temperatureCelsius?: number;
  /** 降水確率 (0-1) */
  precipitationProbability?: number;
}

/** 予約済みアイテム */
export interface BookedItem {
  /** アイテム名 */
  name: string;
  /** 時刻 (HH:mm) */
  time: string;
  /** 場所 */
  location?: string;
  /** キャンセル可能か */
  isCancellable: boolean;
}

/** 旅行者の現在状態 */
export interface TravelerState {
  /** 推定疲労度 (0-1, 1 = 限界) */
  estimatedFatigue: number;
  /** 累計歩行距離 (km) */
  walkingDistanceKm: number;
  /** 遅延時間 (分) */
  delayMinutes: number;
  /** 現在時刻 (HH:mm) */
  currentTime: string;
  /** 現在位置 */
  currentLocation?: { lat: number; lng: number };
  /** トリガー種別 */
  triggerType: ReplanTriggerType;
}

/** 旅行コンテキスト */
export interface TripContext {
  /** 都市名 */
  city: string;
  /** 天気情報 */
  weather?: WeatherInfo;
  /** 現在時刻 (HH:mm) */
  currentTime: string;
  /** 予約済みアイテム */
  bookings: BookedItem[];
  /** 同行者タイプ */
  companionType: string;
  /** 帰路の制約（例: "最終電車 22:30"） */
  returnConstraint?: string;
  /** 予算レベル */
  budget: string;
}

// ============================================================================
// Recovery Option
// ============================================================================

/** リカバリーオプションのカテゴリ */
export type RecoveryCategory =
  | "indoor"
  | "outdoor"
  | "rest"
  | "food"
  | "culture";

/** リカバリーオプション */
export interface RecoveryOption {
  /** 一意識別子 */
  id: string;
  /** 代替スロット群 */
  replacementSlots: PlanSlot[];
  /** 説明テキスト（体験志向、機能列挙NG） */
  explanation: string;
  /** 推定所要時間 (例: "1時間30分") */
  estimatedDuration: string;
  /** カテゴリ */
  category: RecoveryCategory;
}

// ============================================================================
// Score Breakdown
// ============================================================================

/** Human Resolution Score の内訳 */
export interface ScoreBreakdown {
  /** Hard Constraint を全てパスしたか */
  hardPass: boolean;
  /** 安全マージン (終電・閉店からの余裕) */
  safetyMargin: number;
  /** 時間的実現可能性 */
  timeFeasibility: number;
  /** 身体負荷の適合度 */
  physicalLoadFit: number;
  /** 回復マージン */
  recoveryMargin: number;
  /** 好み適合度 */
  preferenceFit: number;
  /** 後続スロットの選択肢残存度 */
  optionality: number;
  /** ナラティブポテンシャル（体験としての価値） */
  narrativePotential: number;
  /** 説明可能性 */
  explainability: number;
  /** 後悔リスク（減点項目） */
  regretRisk: number;
  /** コンテキスト不一致（減点項目） */
  contextMismatch: number;
  /** 不確実性ペナルティ（減点項目） */
  uncertaintyPenalty: number;
  /** 総合スコア */
  total: number;
}

// ============================================================================
// Replan Result
// ============================================================================

/** リプラン結果 */
export interface ReplanResult {
  /** メインの提案 */
  primaryOption: RecoveryOption;
  /** 代替提案群 */
  alternatives: RecoveryOption[];
  /** スコア内訳 */
  scoreBreakdown: ScoreBreakdown;
  /** 説明テキスト */
  explanation: string;
  /** 処理時間 (ms) */
  processingTimeMs: number;
}

// ============================================================================
// Reflection (Post-trip)
// ============================================================================

/** 満足度の選択肢 */
export type SatisfactionLevel = "helped" | "neutral" | "struggled";

/** 旅行後の振り返り */
export interface Reflection {
  /** プランID */
  planId: string;
  /** 満足度 */
  satisfaction: SatisfactionLevel;
  /** リプランが役に立ったか */
  replanUseful?: boolean;
  /** 自由記述 */
  freeText?: string;
  /** 送信日時 (ISO 8601) */
  submittedAt: string;
}
