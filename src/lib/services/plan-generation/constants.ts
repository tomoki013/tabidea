/**
 * Plan Generation Pipeline Constants
 * ルブリック重み、品質閾値、リトライポリシー、時間予算
 */

import type { RubricCategory, PassId, RetryPolicy, QualityPolicy } from '@/types/plan-generation';

// Re-export shared constants from v3 pipeline
export {
  MEAL_SLOTS,
  DEFAULT_START_TIME,
  DEFAULT_END_LIMIT,
} from '@/lib/services/itinerary/constants';

// ============================================
// Rubric Weights (9 categories, sum = 100)
// ============================================

export const RUBRIC_WEIGHTS: Record<RubricCategory, number> = {
  constraint_fit:            18,
  preference_fit:            12,
  destination_authenticity:  14,
  day_flow_quality:          12,
  temporal_realism:          10,
  spatial_coherence:         10,
  variety:                    8,
  editability:                8,
  verification_risk:          8,
} as const;

/** 重みの合計 (バリデーション用) */
export const RUBRIC_WEIGHT_TOTAL = 100;

// ============================================
// Quality Thresholds
// ============================================

/** 全体スコアの最低合格ライン */
export const MIN_OVERALL_SCORE = 55;

/** pass/marginal/fail の閾値 */
export const GRADE_THRESHOLDS = {
  pass: 70,
  marginal: 50,
} as const;

/** カテゴリ別の最低スコア (これを下回ると error 違反を出す) */
export const MIN_CATEGORY_SCORES: Partial<Record<RubricCategory, number>> = {
  constraint_fit: 40,
  destination_authenticity: 30,
} as const;

// ============================================
// Repair Limits
// ============================================

/** 修復の最大反復回数 */
export const MAX_REPAIR_ITERATIONS = 3;

/** 修復でスコアが改善しなかった場合に打ち切る閾値 */
export const MIN_REPAIR_IMPROVEMENT = 3;

// ============================================
// Retry Policies (per pass)
// ============================================

export const DEFAULT_RETRY_POLICIES: Record<PassId, RetryPolicy> = {
  normalize:          { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
  draft_generate:     { maxRetries: 1, backoffMs: 500, retryableErrors: ['AbortError', 'TimeoutError', 'AI_GENERATION_ERROR'] },
  rule_score:         { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
  local_repair:       { maxRetries: 1, backoffMs: 500, retryableErrors: ['AbortError', 'TimeoutError', 'AI_GENERATION_ERROR'] },
  selective_verify:   { maxRetries: 1, backoffMs: 300, retryableErrors: ['PlaceResolveError'] },
  timeline_construct: { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
  narrative_polish:   { maxRetries: 1, backoffMs: 500, retryableErrors: ['AbortError', 'TimeoutError', 'AI_GENERATION_ERROR'] },
} as const;

// ============================================
// Budget Presets (per pass, in ms)
// ============================================

/** パス別の最大実行時間 (ms) */
export const PASS_BUDGET_MS: Record<PassId, number> = {
  normalize:          1_000,
  draft_generate:     20_000,
  rule_score:         500,
  local_repair:       15_000,
  selective_verify:   10_000,
  timeline_construct: 2_000,
  narrative_polish:   15_000,
} as const;

/** 全体のデッドライン (ms) — HTTP リクエスト 1 回分 (thinking model を考慮して余裕を持たせる) */
export const REQUEST_DEADLINE_MS = 119_000;

/** プラットフォーム headroom (ms) */
export const PLATFORM_HEADROOM_MS = 1_000;

// ============================================
// Default Quality Policy
// ============================================

export const DEFAULT_QUALITY_POLICY: QualityPolicy = {
  minOverallScore: MIN_OVERALL_SCORE,
  minCategoryScores: MIN_CATEGORY_SCORES,
  maxRepairIterations: MAX_REPAIR_ITERATIONS,
  verificationLevel: 'L1_entity_found',
} as const;

// ============================================
// Draft Generation Constants
// ============================================

/** 1 日あたりの推奨ストップ数 */
export const RECOMMENDED_STOPS_PER_DAY = {
  relaxed: { min: 3, max: 5 },
  balanced: { min: 4, max: 6 },
  active: { min: 5, max: 8 },
} as const;

/** 長旅の閾値 (この日数以上で best-of-N を 1 に落とす) */
export const LONG_TRIP_THRESHOLD_DAYS = 7;

/** Draft generation の best-of-N */
export const DRAFT_BEST_OF_N = {
  short: 1,  // 7日未満: 1案
  long: 1,   // 7日以上: 1案 (コスト節約)
} as const;

// ============================================
// Scoring Detail Constants
// ============================================

/** generic 名称と見なすパターン */
export const GENERIC_NAME_PATTERNS = [
  /^.{1,3}\s*(朝の|夜の|昼の)?散策$/,
  /^.{1,3}\s*観光$/,
  /^(朝食|昼食|夕食|ランチ|ディナー)$/,
  /^(フリータイム|自由行動|自由時間)$/,
  /^(ホテル|宿泊|チェックイン|チェックアウト)$/,
  /^(移動|出発|到着|帰路)$/,
  /^(morning|afternoon|evening)\s+(walk|stroll|exploration)$/i,
  /^(breakfast|lunch|dinner)$/i,
  /^(free time|sightseeing|hotel)$/i,
] as const;

/** 1 日の最大合理的ストップ数 */
export const MAX_REASONABLE_STOPS_PER_DAY = 10;

/** 1 日の最小ストップ数 */
export const MIN_STOPS_PER_DAY = 2;

// ============================================
// Feature Flags
// ============================================

/** v4 パイプラインの有効化フラグ (NEXT_PUBLIC_ prefix でクライアント参照可能) */
export const V4_PIPELINE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_V4_PIPELINE === 'true';
