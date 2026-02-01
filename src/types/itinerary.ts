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
 * スポット検証結果（Phase 3で拡張予定）
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
  };
}

/**
 * アクティビティタイプ
 */
export type ActivityType = 'spot' | 'transit' | 'accommodation' | 'meal' | 'other';

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
  /** ロックされているか（true: 変更不可, false: 変更可） */
  isLocked?: boolean;
  /** スポット検証結果（Phase 3で設定予定） */
  validation?: ActivityValidation;
}

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
  /** 参考記事のインデックス */
  reference_indices?: number[];
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
