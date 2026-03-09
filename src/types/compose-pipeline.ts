/**
 * Compose Pipeline 中間型定義
 * 7-step パイプラインの全中間データ型
 */

import type { PlaceDetails } from './places';
import type { ActivitySource, TransitType } from './itinerary';
import type { UserInput, FixedScheduleItem } from './user-input';

// ============================================
// Step 1: NormalizedRequest
// ============================================

export type BudgetLevel = 'budget' | 'standard' | 'premium' | 'luxury';
export type PaceLevel = 'relaxed' | 'balanced' | 'active';
export type TransportMode = 'walking' | 'public_transit' | 'car' | 'bicycle';

export interface NormalizedRequest {
  /** 正規化済みの目的地リスト */
  destinations: string[];
  /** 旅行日数 */
  durationDays: number;
  /** 出発日 (ISO date string, available の場合) */
  startDate?: string;
  /** 同行者 */
  companions: string;
  /** テーマ */
  themes: string[];
  /** 正規化済み予算レベル */
  budgetLevel: BudgetLevel;
  /** 正規化済みペース */
  pace: PaceLevel;
  /** 自由記述 */
  freeText: string;
  /** 旅行の雰囲気 */
  travelVibe?: string;
  /** 必ず訪れたい場所 */
  mustVisitPlaces: string[];
  /** 予約済みスケジュール */
  fixedSchedule: FixedScheduleItem[];
  /** 既定の移動手段 */
  preferredTransport: TransportMode[];
  /** 目的地が決まっているか */
  isDestinationDecided: boolean;
  /** 地域 */
  region: string;
  /** 出力言語 */
  outputLanguage: string;
  /** 元の UserInput (参照保持) */
  originalInput: UserInput;
}

// ============================================
// Step 2: SemanticPlan
// ============================================

export type CandidateRole =
  | 'must_visit'
  | 'recommended'
  | 'meal'
  | 'accommodation'
  | 'filler';

export type TimeSlotHint = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'flexible';

export interface SemanticCandidate {
  /** スポット/アクティビティ名 */
  name: string;
  /** 役割 */
  role: CandidateRole;
  /** 優先度 (1-10, 10=最高) */
  priority: number;
  /** 推奨する日 (1-based) */
  dayHint: number;
  /** 推奨する時間帯 */
  timeSlotHint: TimeSlotHint;
  /** 滞在時間（分） */
  stayDurationMinutes: number;
  /** Places API 検索クエリ */
  searchQuery: string;
  /** カテゴリヒント (例: "temple", "cafe", "restaurant") */
  categoryHint?: string;
  /** 説明的なアクティビティ名 (例: "金閣寺で抹茶体験") */
  activityLabel?: string;
  /** 英語での場所名 */
  locationEn?: string;
}

export interface DayStructure {
  /** 日番号 (1-based) */
  day: number;
  /** 日のタイトル */
  title: string;
  /** メインエリア */
  mainArea: string;
  /** 宿泊地 */
  overnightLocation: string;
  /** 概要 */
  summary: string;
}

export interface SemanticPlan {
  /** 目的地 (AI が決定した場合に更新) */
  destination: string;
  /** プラン全体の説明 */
  description: string;
  /** 候補スポット一覧 */
  candidates: SemanticCandidate[];
  /** 日ごとの構造 */
  dayStructure: DayStructure[];
  /** AIが選んだテーマタグ */
  themes?: string[];
}

// ============================================
// Step 3: Place Resolver
// ============================================

export interface ResolvedPlace {
  /** Places API からの詳細 */
  placeDetails: PlaceDetails;
  /** マッチスコア (0-1) */
  matchScore: number;
}

export interface ResolvedPlaceGroup {
  /** 元の SemanticCandidate */
  candidate: SemanticCandidate;
  /** 照合結果 (top-k) */
  resolved: ResolvedPlace[];
  /** 照合成功したか */
  success: boolean;
  /** 失敗理由 */
  error?: string;
}

// ============================================
// Step 4: Feasibility Scorer
// ============================================

export interface FeasibilityScoreBreakdown {
  /** 営業時間マッチ (0-25) */
  openHoursMatch: number;
  /** 評価品質 (0-20) */
  ratingQuality: number;
  /** 予算マッチ (0-20) */
  budgetMatch: number;
  /** カテゴリ関連度 (0-20) */
  categoryRelevance: number;
  /** 距離ペナルティ (0-15) */
  distanceFromPrev: number;
}

export interface ScoredPlace {
  /** 元の候補 */
  candidate: SemanticCandidate;
  /** 選択された PlaceDetails (resolve 済みの場合) */
  placeDetails?: PlaceDetails;
  /** 合計スコア (0-100) */
  totalScore: number;
  /** スコア内訳 */
  breakdown: FeasibilityScoreBreakdown;
  /** 警告 */
  warnings: string[];
}

export interface SelectedStop {
  /** 候補情報 */
  candidate: SemanticCandidate;
  /** Place 詳細 (resolve 済みの場合) */
  placeDetails?: PlaceDetails;
  /** 実現可能性スコア */
  feasibilityScore: number;
  /** 警告 */
  warnings: string[];
}

// ============================================
// Step 5: Route Optimizer
// ============================================

export interface RouteLeg {
  /** 出発ノード index */
  fromIndex: number;
  /** 到着ノード index */
  toIndex: number;
  /** 距離 (km) */
  distanceKm: number;
  /** 所要時間 (分) */
  durationMinutes: number;
  /** 移動手段 */
  mode: TransportMode;
  /** 移動手段タイプ (Itinerary 互換) */
  transitType: TransitType;
}

export interface OptimizedNode {
  /** SelectedStop への参照 */
  stop: SelectedStop;
  /** 日内の順序 (0-based) */
  orderInDay: number;
}

export interface OptimizedDay {
  /** 日番号 (1-based) */
  day: number;
  /** 最適化済みノード順序 */
  nodes: OptimizedNode[];
  /** ノード間の移動情報 */
  legs: RouteLeg[];
  /** 日のタイトル */
  title: string;
  /** 宿泊地 */
  overnightLocation: string;
}

// ============================================
// Step 6: Timeline Builder
// ============================================

export interface TimelineNode {
  /** SelectedStop への参照 */
  stop: SelectedStop;
  /** 到着時刻 (HH:mm) */
  arrivalTime: string;
  /** 出発時刻 (HH:mm) */
  departureTime: string;
  /** 滞在時間（分） */
  stayMinutes: number;
  /** 警告 (営業時間外など) */
  warnings: string[];
}

export interface TimelineDay {
  /** 日番号 (1-based) */
  day: number;
  /** 日のタイトル */
  title: string;
  /** 時系列ノード */
  nodes: TimelineNode[];
  /** ノード間の移動情報 */
  legs: RouteLeg[];
  /** 宿泊地 */
  overnightLocation: string;
  /** 開始時刻 (HH:mm) */
  startTime: string;
}

// ============================================
// Step 7: Narrative Renderer Output
// ============================================

export interface NarrativeActivity {
  /** 元の TimelineNode */
  node: TimelineNode;
  /** AI 生成の説明文 */
  description: string;
  /** アクティビティ名 (表示用) */
  activityName: string;
  /** 情報源 */
  source?: ActivitySource;
}

export interface NarrativeDay {
  /** 日番号 */
  day: number;
  /** AI 生成の日タイトル */
  title: string;
  /** アクティビティ + 説明 */
  activities: NarrativeActivity[];
  /** 移動情報 */
  legs: RouteLeg[];
  /** 宿泊地 */
  overnightLocation: string;
}

// ============================================
// Composed Itinerary (最終出力)
// ============================================

export interface ComposedItinerary {
  /** 目的地 */
  destination: string;
  /** 全体の説明 */
  description: string;
  /** 構造化された日程 */
  days: NarrativeDay[];
  /** ヒーロー画像情報 */
  heroImage?: {
    url: string;
    photographer?: string;
    photographerUrl?: string;
  };
  /** 警告一覧 */
  warnings: string[];
  /** パイプラインメタデータ */
  metadata: ComposePipelineMetadata;
}

export interface ComposePipelineMetadata {
  /** パイプラインバージョン */
  pipelineVersion: 'v2';
  /** 候補数 */
  candidateCount: number;
  /** 照合成功数 */
  resolvedCount: number;
  /** フィルタ後数 */
  filteredCount: number;
  /** Places 照合が有効だったか */
  placeResolveEnabled: boolean;
  /** 各ステップのタイミング */
  stepTimings: Record<string, number>;
  /** 使用モデル名 */
  modelName: string;
  /** モデルティア */
  modelTier: 'flash' | 'pro';
}

// ============================================
// Pipeline Step IDs & Progress
// ============================================

export type PipelineStepId =
  | 'usage_check'
  | 'normalize'
  | 'semantic_plan'
  | 'place_resolve'
  | 'feasibility_score'
  | 'route_optimize'
  | 'timeline_build'
  | 'narrative_render'
  | 'hero_image';

export interface PipelineProgress {
  step: PipelineStepId;
  status: 'started' | 'completed';
  message: string;
}

// ============================================
// Distance Estimator
// ============================================

export type AreaType = 'urban' | 'suburban' | 'rural';

export interface DistanceEstimate {
  /** 直線距離 (km) */
  straightLineKm: number;
  /** 推定実距離 (km) */
  estimatedKm: number;
  /** 推定所要時間 (分) */
  estimatedMinutes: number;
  /** 移動モード */
  mode: TransportMode;
}
