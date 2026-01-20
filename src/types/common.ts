/**
 * 共通ユーティリティ型
 * Common Utility Types for AI Travel Planner
 */

/**
 * 非同期操作の結果
 */
export type AsyncResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Nullable型
 */
export type Nullable<T> = T | null;

/**
 * Optional型（undefined許容）
 */
export type Optional<T> = T | undefined;

/**
 * DeepPartial型（ネストされたオブジェクトもPartialに）
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 日付範囲
 */
export interface DateRange {
  /** 開始日 */
  start: string;
  /** 終了日 */
  end: string;
}
