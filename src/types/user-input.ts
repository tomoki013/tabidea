/**
 * ユーザー入力関連の型定義
 * User Input Types for AI Travel Planner
 */

import { TransitInfo } from './itinerary';

/**
 * 予約済みの予定アイテム
 */
export interface FixedScheduleItem {
  /** 種類 */
  type: 'flight' | 'train' | 'bus' | 'hotel' | 'activity' | 'other';
  /** 日付 (YYYY-MM-DD) */
  date?: string;
  /** 時間 (HH:mm) */
  time?: string;
  /** 名前・詳細（便名、ホテル名など） */
  name: string;
  /** メモ */
  notes?: string;
}

/**
 * ユーザーの旅行計画入力
 */
export interface UserInput {
  /** 目的地（複数の周遊先をサポート） */
  destinations: string[];
  /** 目的地が決まっているか */
  isDestinationDecided?: boolean;
  /** 地域タイプ: "domestic" | "overseas" | "anywhere" */
  region: string;
  /** 旅行日程 */
  dates: string;
  /** 同行者 */
  companions: string;
  /** 旅行テーマ */
  theme: string[];
  /** 予算 */
  budget: string;
  /** 旅行ペース */
  pace: string;
  /** 自由記述 */
  freeText: string;
  /** 旅行の雰囲気（例: "South Island", "Resort vibe"） */
  travelVibe?: string;
  /** 必ず訪れたい場所のリスト */
  mustVisitPlaces?: string[];
  /** 必ず訪れたい場所があるか（Step 2のバリデーション用） */
  hasMustVisitPlaces?: boolean;
  /** 既定の移動情報（DayIndexをキーとするマップ） */
  transits?: Record<number, TransitInfo>;
  /** 希望する移動手段 */
  preferredTransport?: string[];
  /** 予約済みのスケジュール（飛行機、ホテルなど） */
  fixedSchedule?: FixedScheduleItem[];
}
