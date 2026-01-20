/**
 * 旅程関連の型定義
 * Itinerary Types for AI Travel Planner
 */

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
}

/**
 * 日程プラン
 */
export interface DayPlan {
  /** 日数（1から開始） */
  day: number;
  /** 日のタイトル */
  title: string;
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
