/**
 * Plan Generation Pipeline v4 — Type Definitions & Pass Contracts
 *
 * LM-First / Harness-Controlled 旅程生成の全型定義。
 * AI がドラフト全体を生成し、Harness が評価・修正・検証を行う。
 *
 * このファイルは Pipeline の基盤であり、全モジュールがここから import する。
 */

import type { UserInput } from './user-input';
import type {
  NormalizedRequest,
  CandidateRole,
  TimeSlotHint,
  IndoorOutdoor,
  TransportMode,
} from './itinerary-pipeline';

// Re-export for convenience
export type { NormalizedRequest, CandidateRole, TimeSlotHint, IndoorOutdoor, TransportMode };

// ============================================
// Session State Machine
// ============================================

/** Session のライフサイクル状態 */
export type SessionState =
  | 'created'
  | 'normalized'
  | 'draft_generated'
  | 'draft_scored'
  | 'draft_repaired_partial'
  | 'verification_partial'
  | 'timeline_ready'
  | 'narrative_partial'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** 合法な状態遷移マップ (ランタイムで検証) */
export const VALID_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  created:                ['normalized', 'failed', 'cancelled'],
  normalized:             ['draft_generated', 'failed', 'cancelled'],
  draft_generated:        ['draft_scored', 'failed', 'cancelled'],
  draft_scored:           ['draft_repaired_partial', 'verification_partial', 'timeline_ready', 'failed', 'cancelled'],
  draft_repaired_partial: ['draft_scored', 'verification_partial', 'timeline_ready', 'failed', 'cancelled'],
  verification_partial:   ['timeline_ready', 'failed', 'cancelled'],
  timeline_ready:         ['narrative_partial', 'completed', 'failed', 'cancelled'],
  narrative_partial:      ['completed', 'failed', 'cancelled'],
  completed:              [],
  failed:                 ['created', 'normalized', 'draft_generated', 'draft_scored', 'verification_partial', 'timeline_ready'],
  cancelled:              [],
} as const;

// ============================================
// Pass Contract
// ============================================

/** パス識別子 */
export type PassId =
  | 'normalize'
  | 'draft_generate'
  | 'rule_score'
  | 'local_repair'
  | 'selective_verify'
  | 'timeline_construct'
  | 'narrative_polish';

/** パスの実行結果 */
export type PassOutcome =
  | 'completed'
  | 'partial'
  | 'needs_retry'
  | 'failed_terminal';

/** 各パスが返す統一結果型 */
export interface PassResult<T = unknown> {
  outcome: PassOutcome;
  data?: T;
  checkpointCursor?: string;
  warnings: string[];
  durationMs: number;
  metadata?: Record<string, unknown>;
}

/** パス実行に渡されるコンテキスト */
export interface PassContext {
  session: PlanGenerationSession;
  budget: PassBudget;
  retryPolicy: RetryPolicy;
  qualityPolicy: QualityPolicy;
}

/** 実行時間制約 */
export interface PassBudget {
  /** パスに許可された最大実行時間 (ms) */
  maxExecutionMs: number;
  /** 絶対デッドライン (Date.now() ベースのタイムスタンプ) */
  deadlineAt: number;
  /** 残り時間を返す (ms) */
  remainingMs: () => number;
}

/** リトライポリシー */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  retryableErrors: string[];
}

/** 品質ポリシー */
export interface QualityPolicy {
  /** 全体の最低スコア (0-100) */
  minOverallScore: number;
  /** カテゴリ別の最低スコア */
  minCategoryScores: Partial<Record<RubricCategory, number>>;
  /** 修復の最大反復回数 */
  maxRepairIterations: number;
  /** 検証レベル */
  verificationLevel: VerificationLevel;
}

/** 検証レベル (段階的) */
export type VerificationLevel =
  | 'L0_unverified'
  | 'L1_entity_found'
  | 'L2_hours_checked'
  | 'L3_schedule_checked'
  | 'L4_user_confirmed';

// ============================================
// Session Data
// ============================================

/** 生成プロファイル (モデル・設定) */
export interface GenerationProfile {
  modelName: string;
  narrativeModelName: string;
  modelTier: 'flash' | 'pro';
  provider: 'gemini' | 'openai';
  temperature: number;
  pipelineVersion: 'v4';
}

/** 生成セッション — 生成中の全中間データを保持 */
export interface PlanGenerationSession {
  id: string;
  userId?: string;
  state: SessionState;
  createdAt: string;
  updatedAt: string;

  // ---- 各パスの成果物 (パスが完了するごとに蓄積) ----

  /** 元のユーザー入力 */
  inputSnapshot?: UserInput;
  /** パイプライン実行コンテキスト (ユーザー設定由来) */
  pipelineContext?: { homeBaseCity?: string };
  /** Pass A: 正規化済み入力 */
  normalizedInput?: NormalizedRequest;
  /** 生成設定 */
  generationProfile?: GenerationProfile;
  /** Pass B: AI ドラフト旅程 */
  draftPlan?: DraftPlan;
  /** Pass C: 評価レポート */
  evaluationReport?: EvaluationReport;
  /** Pass D: 修復履歴 */
  repairHistory: RepairRecord[];
  /** Pass E: 検証済みエンティティ */
  verifiedEntities: VerifiedEntity[];
  /** Pass F: タイムライン構造 */
  timelineState?: TimelineState;
  /** Pass G: ナラティブ結果 */
  narrativeState?: NarrativeState;
  /** UI 表示用の現在プロジェクション */
  uiProjection?: UIProjection;
  /** 中断再開用カーソル */
  checkpointCursor?: string;

  // ---- 観測 ----

  /** パス実行履歴 */
  passRuns: PassRunRecord[];
  /** 警告一覧 */
  warnings: string[];

  // ---- キャッシュ無効化 ----

  /** 入力ハッシュ (入力変更検知用) */
  inputHash?: string;
  /** 評価ルブリックバージョン */
  rubricVersion?: string;
}

// ============================================
// Pass B Output: Draft Plan
// ============================================

/** AI が生成する旅程ドラフト全体 */
export interface DraftPlan {
  destination: string;
  description: string;
  tripIntentSummary: string;
  days: DraftDay[];
  themes: string[];
  orderingPreferences: string[];
}

/** ドラフトの 1 日分 */
export interface DraftDay {
  day: number;
  title: string;
  mainArea: string;
  overnightLocation: string;
  summary: string;
  stops: DraftStop[];
}

/** ドラフトの 1 ストップ */
export interface DraftStop {
  /** パイプライン内追跡用 UUID */
  draftId: string;
  /** スポット名 */
  name: string;
  /** Places API 検索クエリ */
  searchQuery: string;
  /** 役割 */
  role: CandidateRole;
  /** 推奨時間帯 */
  timeSlotHint: TimeSlotHint;
  /** 滞在時間 (分) */
  stayDurationMinutes: number;
  /** エリアヒント */
  areaHint: string;
  /** AI がこのストップを選んだ理由 */
  rationale: string;
  /** AI 自己評価の確信度 */
  aiConfidence: 'high' | 'medium' | 'low';
  /** カテゴリヒント */
  categoryHint?: string;
  /** 説明的なアクティビティ名 */
  activityLabel?: string;
  /** 英語での場所名 */
  locationEn?: string;
  /** 屋内/屋外 */
  indoorOutdoor?: IndoorOutdoor;
  /** タグ */
  tags?: string[];
}

// ============================================
// Pass C Output: Evaluation Report
// ============================================

/** 評価ルブリックのカテゴリ */
export type RubricCategory =
  | 'constraint_fit'
  | 'preference_fit'
  | 'destination_authenticity'
  | 'day_flow_quality'
  | 'temporal_realism'
  | 'spatial_coherence'
  | 'variety'
  | 'editability'
  | 'verification_risk';

/** カテゴリ別スコア */
export interface CategoryScore {
  category: RubricCategory;
  /** スコア (0-100) */
  score: number;
  /** 人間可読な詳細説明 */
  details: string[];
  /** 具体的な違反 */
  violations: Violation[];
}

/** 違反の重大度 */
export type ViolationSeverity = 'error' | 'warning' | 'info';

/** 違反のスコープ (どの単位の問題か) */
export type ViolationScope =
  | { type: 'plan' }
  | { type: 'day'; day: number }
  | { type: 'stop'; day: number; draftId: string }
  | { type: 'cluster'; day: number; draftIds: string[] };

/** 個別の違反 */
export interface Violation {
  severity: ViolationSeverity;
  category: RubricCategory;
  scope: ViolationScope;
  message: string;
  suggestedFix?: string;
}

/** 全体評価レポート */
export interface EvaluationReport {
  /** 総合スコア (0-100) — カテゴリスコアの重み付き平均 */
  overallScore: number;
  /** カテゴリ別スコア */
  categoryScores: CategoryScore[];
  /** 全違反のフラットリスト */
  violations: Violation[];
  /** 合否判定 */
  passGrade: 'pass' | 'marginal' | 'fail';
  /** 修復対象 (priority 順) */
  repairTargets: RepairTarget[];
}

/** 修復対象の特定 */
export interface RepairTarget {
  scope: ViolationScope;
  violations: Violation[];
  /** 修復の優先度 (1=最高) */
  priority: number;
}

// ============================================
// Pass D: Repair
// ============================================

/** 修復の単位 */
export type RepairUnit =
  | { type: 'day'; day: number }
  | { type: 'stop_cluster'; day: number; draftIds: string[] }
  | { type: 'must_visit'; placeName: string }
  | { type: 'special_block'; day: number; blockType: 'meal' | 'evening' | 'arrival' | 'departure' };

/** 修復の 1 レコード */
export interface RepairRecord {
  iteration: number;
  unit: RepairUnit;
  beforeScore: number;
  afterScore: number;
  durationMs: number;
  improved: boolean;
  timestamp: string;
}

// ============================================
// Pass E: Verification
// ============================================

/** 検証結果のステータス */
export type VerificationStatus =
  | 'confirmed'
  | 'weakly_confirmed'
  | 'unverifiable'
  | 'invalid';

/** 検証済みエンティティ */
export interface VerifiedEntity {
  draftId: string;
  stopName: string;
  day: number;
  status: VerificationStatus;
  level: VerificationLevel;
  details?: {
    placeId?: string;
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    rating?: number;
    businessStatus?: string;
    existenceConfirmed?: boolean;
    openingHoursChecked?: boolean;
    scheduleConflict?: boolean;
    geographicMismatch?: boolean;
  };
  verifiedAt: string;
}

// ============================================
// Pass F: Timeline
// ============================================

/** タイムライン構築結果 — セッションに永続化する軽量構造 */
export interface TimelineState {
  days: TimelineDayCompact[];
  warnings: string[];
  metadata: {
    routeOptimizationApplied: boolean;
    totalTravelMinutes: number;
    totalStops: number;
  };
}

/** タイムラインの 1 日分 (軽量、セッション保存用) */
export interface TimelineDayCompact {
  day: number;
  title: string;
  overnightLocation: string;
  startTime: string;
  nodes: TimelineNodeCompact[];
  legs: TimelineLegCompact[];
}

/** タイムラインの 1 ノード (軽量) */
export interface TimelineNodeCompact {
  draftId: string;
  arrivalTime: string;
  departureTime: string;
  stayMinutes: number;
  warnings: string[];
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

/** タイムラインの移動区間 (軽量) */
export interface TimelineLegCompact {
  fromIndex: number;
  toIndex: number;
  distanceKm: number;
  durationMinutes: number;
  mode: TransportMode;
}

// ============================================
// Pass G: Narrative
// ============================================

/** ナラティブ生成結果 — セッションに永続化する構造 */
export interface NarrativeState {
  /** 旅行全体の説明 */
  description: string;
  /** 完了した日番号 */
  completedDays: number[];
  /** 日ごとのナラティブ */
  dayNarratives: DayNarrative[];
  warnings: string[];
}

/** 1 日分のナラティブ */
export interface DayNarrative {
  day: number;
  title: string;
  activities: ActivityNarrative[];
}

/** 1 アクティビティのナラティブ */
export interface ActivityNarrative {
  draftId: string;
  activityName: string;
  description: string;
}

// ============================================
// UI Projection
// ============================================

/** 進行中・完成後の UI 表示用サマリー */
export interface UIProjection {
  destination: string;
  description?: string;
  dayCount: number;
  dayThemes: string[];
  currentScore?: number;
  verifiedStopCount: number;
  unverifiedStopCount: number;
  repairingDays: number[];
  state: SessionState;
}

// ============================================
// Observability
// ============================================

/** パス実行の 1 レコード */
export interface PassRunRecord {
  passId: PassId;
  attempt: number;
  outcome: PassOutcome;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  checkpointCursor?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Pass Function Signature
// ============================================

/** 全パスの共通関数シグネチャ */
export type PassFn = (ctx: PassContext) => Promise<PassResult>;
