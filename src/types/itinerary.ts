/**
 * 旅程関連の型定義
 * Itinerary Types for AI Travel Planner
 */

/**
 * 移動手段タイプ
 */
export type TransitType = 'flight' | 'train' | 'bus' | 'ship' | 'car' | 'other';

/**
 * 移動情報
 */
export interface TransitInfo {
  /** 移動手段 */
  type: TransitType;
  /** 出発情報 */
  departure: {
    place: string;
    time?: string;
  };
  /** 到着情報 */
  arrival: {
    place: string;
    time?: string;
  };
  /** 所要時間（例: "2h 30m"） */
  duration?: string;
  /** メモ（便名など） */
  memo?: string;
  /** 予約済みかどうか（true: 確定/遵守必須, false: 候補/変更可） */
  isBooked?: boolean;
  /** ロックされているか（true: 変更不可, false: 変更可） */
  isLocked?: boolean;
}

/**
 * スポット検証結果（Phase 3: Google Places API連携）
 */
export interface ActivityValidation {
  /** スポット名 */
  spotName: string;
  /** 検証済みかどうか */
  isVerified: boolean;
  /** 信頼度 */
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  /** 情報源 */
  source?: 'google_places' | 'blog' | 'ai_generated';
  /** Google Place ID */
  placeId?: string;
  /** 詳細情報 */
  details?: {
    address?: string;
    rating?: number;
    openingHours?: string[];
    photos?: string[];
    /** 緯度 */
    latitude?: number;
    /** 経度 */
    longitude?: number;
    /** レビュー数 */
    reviewCount?: number;
    /** Google Maps URL */
    googleMapsUrl?: string;
  };
}

/**
 * アクティビティタイプ
 */
export type ActivityType = 'spot' | 'transit' | 'accommodation' | 'meal' | 'other';

/**
 * アクティビティの情報源
 */
export type ActivitySourceType = 'blog' | 'google_places' | 'ai_knowledge' | 'golden_plan';

/**
 * アクティビティの情報源詳細
 */
export interface ActivitySource {
  /** 情報源の種類 */
  type: ActivitySourceType;
  /** ブログ記事のタイトル（type: 'blog' の場合） */
  title?: string;
  /** ブログ記事のURL（type: 'blog' の場合） */
  url?: string;
  /** 信頼度 */
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * アクティビティ
 */
export interface Activity {
  /** 時間 */
  time: string;
  /** アクティビティ名 */
  activity: string;
  /** 説明 */
  description: string;
  /** アクティビティの種類（カード表示用） */
  activityType?: ActivityType;
  /** 英語での場所名（予約リンク生成用） */
  locationEn?: string;
  /** ロックされているか（true: 変更不可, false: 変更可） */
  isLocked?: boolean;
  /** スポット検証結果（Phase 3で設定予定） */
  validation?: ActivityValidation;
  /** 情報源（Citation） */
  source?: ActivitySource;
}

/**
 * タイムラインアイテムの種類
 */
export type TimelineItemType = 'activity' | 'transit';

/**
 * タイムラインアイテム（discriminated union）
 */
export type TimelineItem =
  | { itemType: 'activity'; data: Activity }
  | { itemType: 'transit'; data: TransitInfo; time?: string };

/**
 * 日程プラン
 */
export interface DayPlan {
  /** 日数（1から開始） */
  day: number;
  /** 日のタイトル */
  title: string;
  /** その日の主要な移動（到着や都市間移動） */
  transit?: TransitInfo;
  /** アクティビティ一覧 */
  activities: Activity[];
  /** 時系列タイムライン（transit + activities統合表示用） */
  timelineItems?: TimelineItem[];
  /** 参考記事のインデックス */
  reference_indices?: number[];
  /** UIタイプ（Generative UI） */
  ui_type?: 'default' | 'compact' | 'narrative';
}

/**
 * 参考情報
 */
export interface Reference {
  /** タイトル */
  title: string;
  /** URL */
  url: string;
  /** 画像URL */
  image?: string;
  /** スニペット */
  snippet?: string;
}

/**
 * 旅程
 */
export interface Itinerary {
  /** 一意識別子 */
  id: string;
  /** 目的地 */
  destination: string;
  /** 説明 */
  description: string;
  /** AIの思考プロセス */
  reasoning?: string;
  /** ヒーロー画像URL */
  heroImage?: string;
  /** Unsplash フォトグラファー名 */
  heroImagePhotographer?: string;
  /** Unsplash フォトグラファープロフィールURL */
  heroImagePhotographerUrl?: string;
  /** 日程プラン */
  days: DayPlan[];
  /** 参考情報 */
  references?: Reference[];
  /** コンテキスト配列内の使用記事インデックス */
  reference_indices?: number[];
  /** 予算概算 */
  estimatedBudget?: BudgetEstimate;
}

/**
 * 予算概算
 */
export interface BudgetEstimate {
  /** フライト費用 */
  flights?: { description: string; estimatedCost: string };
  /** 1泊あたりの宿泊費 */
  accommodationPerNight?: string;
  /** 1日あたりの生活費 */
  dailyExpenses?: string;
  /** 合計概算 */
  total?: string;
  /** 通貨 */
  currency: string;
  /** 注記 */
  note?: string;
}

/**
 * プランアウトラインの日程
 */
export interface PlanOutlineDay {
  /** 日数 */
  day: number;
  /** タイトル */
  title: string;
  /** ハイライトエリア */
  highlight_areas: string[];
  /** 宿泊地（その日の終了地点） */
  overnight_location: string;
  /** 翌日への移動手段（最終日は不要） */
  travel_method_to_next?: string;
}

/**
 * プランアウトライン
 */
export interface PlanOutline {
  /** 目的地 */
  destination: string;
  /** 説明 */
  description: string;
  /** 日程 */
  days: PlanOutlineDay[];
}
