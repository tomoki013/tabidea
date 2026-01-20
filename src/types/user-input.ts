/**
 * ユーザー入力関連の型定義
 * User Input Types for AI Travel Planner
 */

/**
 * ユーザーの旅行計画入力
 */
export interface UserInput {
  /** 目的地 */
  destination: string;
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
}
