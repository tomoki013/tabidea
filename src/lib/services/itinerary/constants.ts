/**
 * Compose Pipeline v3 Constants
 * 全ステップの設定値・重み・ペナルティ係数を集約
 */

// ============================================
// Timeline Constants
// ============================================

/** デフォルト開始時刻 */
export const DEFAULT_START_TIME = '08:00';

/** 最終アクティビティの終了リミット */
export const DEFAULT_END_LIMIT = '22:00';

/** 食事タイムスロットの目安 */
export const MEAL_SLOTS = {
  breakfast: { start: '07:30', end: '09:00' },
  lunch: { start: '11:30', end: '13:30' },
  dinner: { start: '18:00', end: '20:00' },
} as const;

// ============================================
// Feasibility Scorer Weights (v3: 8 axes, total 100)
// ============================================

export const FEASIBILITY_WEIGHTS = {
  /** 候補名と place.name の類似度 (0-10) */
  nameMatch: 10,
  /** areaHint と formattedAddress の一致度 (0-10) */
  areaHintMatch: 10,
  /** 営業時間マッチ (0-20) */
  openHoursMatch: 20,
  /** 評価品質 (0-15) */
  ratingQuality: 15,
  /** 予算マッチ (0-15) */
  budgetMatch: 15,
  /** カテゴリ関連度・テーマ整合 (0-15) */
  categoryRelevance: 15,
  /** 距離ペナルティ (0-10) */
  distanceFromPrev: 10,
  /** レビュー数少ペナルティ (0-5) */
  lowReviewPenalty: 5,
} as const;

/** デフォルトのフィルタ閾値 */
export const DEFAULT_FEASIBILITY_THRESHOLD = 30;

/** レビュー数が少ないと見なす閾値 */
export const LOW_REVIEW_THRESHOLD = 50;

// ============================================
// Route Optimizer Constants
// ============================================

/** 2-opt の最大反復回数 */
export const MAX_2OPT_ITERATIONS = 50;

/** ペナルティ係数 */
export const PENALTY_COEFFICIENTS = {
  /** 総移動時間の重み */
  totalTravelTime: 1.0,
  /** エリア往復ペナルティ */
  areaBacktrack: 30,
  /** 営業時間外配置ペナルティ */
  openingHoursViolation: 50,
  /** 固定イベント時刻乖離ペナルティ (分あたり) */
  fixedEventDeviation: 2.0,
  /** 食事タイミングペナルティ */
  mealTiming: 20,
  /** 終盤過密ペナルティ */
  lateDayDensity: 15,
  /** ordering preference 不一致ペナルティ */
  orderingPreference: 10,
} as const;

// ============================================
// Place Resolver Constants
// ============================================

/** Place resolve のデフォルト top-k */
export const DEFAULT_TOP_K = 3;

/** Place resolve のリクエスト間遅延 (ms) */
export const DEFAULT_RESOLVE_DELAY_MS = 100;

// ============================================
// Transport Mode Mapping
// ============================================

import type { TransportMode } from '@/types/itinerary-pipeline';
import type { TransitType } from '@/types/itinerary';

export const MODE_TO_TRANSIT: Record<TransportMode, TransitType> = {
  walking: 'other',
  public_transit: 'train',
  car: 'car',
  bicycle: 'other',
};

export const MODE_TO_LABEL: Record<TransportMode, string> = {
  walking: '徒歩',
  public_transit: '公共交通',
  car: '車',
  bicycle: '自転車',
};

// ============================================
// Budget / Time Slot Mappings
// ============================================

import type { BudgetLevel, TimeSlotHint } from '@/types/itinerary-pipeline';

export const BUDGET_PRICE_MAP: Record<BudgetLevel, number[]> = {
  budget: [0, 1],
  standard: [1, 2],
  premium: [2, 3],
  luxury: [3, 4],
};

export const TIME_SLOT_HOURS: Record<TimeSlotHint, { start: number; end: number }> = {
  morning: { start: 8, end: 12 },
  midday: { start: 11, end: 14 },
  afternoon: { start: 13, end: 17 },
  evening: { start: 17, end: 21 },
  night: { start: 20, end: 24 },
  flexible: { start: 9, end: 18 },
};
