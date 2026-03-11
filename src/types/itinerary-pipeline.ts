/**
 * Compose Pipeline v3 中間型定義
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
export type WeatherTolerance = 'rain_ok' | 'indoor_preferred' | 'outdoor_only';
export type MealPreference = 'local_cuisine' | 'fast_food' | 'cafe' | 'fine_dining' | 'no_preference';

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

  // ---- v3 追加フィールド (optional) ----
  /** 1 日の開始時刻 (HH:mm) */
  startTime?: string;
  /** 1 日の終了時刻 (HH:mm) */
  endTime?: string;
  /** 旅行全体の有効分数 (durationDays × (endTime - startTime)) */
  durationMinutes?: number;
  /** 避けたいキーワード */
  avoidKeywords?: string[];
  /** 天候耐性 */
  weatherTolerance?: WeatherTolerance;
  /** 食事の好み */
  mealPreferences?: MealPreference[];
  /** ロケール */
  locale?: string;
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
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both';

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

  // ---- v3 追加フィールド ----
  /** パイプライン全体で一貫した候補追跡 ID */
  semanticId?: string;
  /** この候補を選んだ理由 */
  rationale?: string;
  /** エリアヒント (例: "浅草エリア", "銀座周辺") */
  areaHint?: string;
  /** 屋内/屋外 */
  indoorOutdoor?: IndoorOutdoor;
  /** タグ (例: ["写真映え", "静か"]) */
  tags?: string[];
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

  // ---- v3 追加フィールド ----
  /** 旅の意図サマリー */
  tripIntentSummary?: string;
  /** 順序に関する好み (例: ["寺社は午前中", "食事は地元の店"]) */
  orderingPreferences?: string[];
  /** フォールバックヒント (候補不足時の補完ヒント) */
  fallbackHints?: string[];
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
  /** 候補名一致度 (0-10) — v3 追加 */
  nameMatch: number;
  /** エリアヒント一致度 (0-10) — v3 追加 */
  areaHintMatch: number;
  /** 営業時間マッチ (0-20) */
  openHoursMatch: number;
  /** 評価品質 (0-15) */
  ratingQuality: number;
  /** 予算マッチ (0-15) */
  budgetMatch: number;
  /** カテゴリ関連度 (0-15) */
  categoryRelevance: number;
  /** 距離ペナルティ (0-10) */
  distanceFromPrev: number;
  /** レビュー数少ペナルティ (0-5) — v3 追加 */
  lowReviewPenalty: number;
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
  /** パイプライン追跡 ID — v3 追加 */
  semanticId?: string;
}

// ============================================
// Step 5: Route Optimizer
// ============================================

export interface RouteLeg {
  /** 出発ノード index (後方互換) */
  fromIndex: number;
  /** 到着ノード index (後方互換) */
  toIndex: number;
  /** 距離 (km) */
  distanceKm: number;
  /** 所要時間 (分) */
  durationMinutes: number;
  /** 移動手段 */
  mode: TransportMode;
  /** 移動手段タイプ (Itinerary 互換) */
  transitType: TransitType;

  // ---- v3 追加フィールド ----
  /** レッグ固有 ID */
  legId?: string;
  /** 出発ノード ID */
  fromNodeId?: string;
  /** 到着ノード ID */
  toNodeId?: string;
}

export interface OptimizedNode {
  /** SelectedStop への参照 */
  stop: SelectedStop;
  /** 日内の順序 (0-based) */
  orderInDay: number;
  /** ノード固有 ID — v3 追加 */
  nodeId?: string;
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
  /** ノード固有 ID — v3 追加 */
  nodeId?: string;
  /** 候補追跡 ID — v3 追加 */
  semanticId?: string;
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
  pipelineVersion: 'v2' | 'v3';
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
  /** 警告数 — v3 追加 */
  warningCount?: number;
  /** スコアリングで落ちた候補数 — v3 追加 */
  droppedCandidateCount?: number;
  /** フォールバックが使用されたか — v3 追加 */
  fallbackUsed?: boolean;
}

// ============================================
// v3 新規: FinalItinerary (内部 source of truth)
// ============================================

export interface FinalItinerary {
  /** 旅程サマリー */
  summary: string;
  /** タイムラインノード (日を跨いで全ノード) */
  nodes: TimelineNode[];
  /** ノード間移動レッグ */
  legs: ItineraryLeg[];
  /** 警告一覧 */
  warnings: string[];
  /** ナラティブ情報 */
  narrative: NarrativeDay[];
}

export interface ItineraryLeg {
  /** レッグ固有 ID */
  legId: string;
  /** 出発ノード ID */
  fromNodeId: string;
  /** 到着ノード ID */
  toNodeId: string;
  /** 移動手段 */
  mode: TransportMode;
  /** 所要時間 (分) */
  durationMinutes: number;
  /** 距離 (メートル) */
  distanceMeters: number;
  /** データソース */
  source: 'haversine' | 'routes_api' | 'cache';
  /** キャッシュ期限 */
  expiresAt?: string;
}

export interface RouteMatrixEntry {
  /** 出発地 Place ID */
  fromPlaceId: string;
  /** 到着地 Place ID */
  toPlaceId: string;
  /** 移動手段 */
  mode: TransportMode;
  /** 所要時間 (分) */
  durationMinutes: number;
  /** 距離 (メートル) */
  distanceMeters: number;
  /** データソース */
  source: 'haversine' | 'routes_api' | 'cache';
  /** キャッシュ期限 */
  expiresAt?: string;
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
