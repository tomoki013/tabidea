/**
 * 渡航情報関連定数
 * Travel Information Constants
 */

/**
 * カテゴリ選択の制限
 */
export const CATEGORY_LIMITS = {
  /** 最大選択数 */
  MAX_SELECTIONS: 6,
  /** 最小選択数 */
  MIN_SELECTIONS: 1,
} as const;

/**
 * 信頼性スコアの閾値
 */
export const RELIABILITY_THRESHOLDS = {
  /** 高信頼性 */
  HIGH: 80,
  /** 中信頼性 */
  MEDIUM: 60,
  /** 低信頼性 */
  LOW: 40,
} as const;

/**
 * ソースタイプ別の基本信頼性スコア
 */
export const SOURCE_BASE_SCORES = {
  /** 公式API */
  OFFICIAL_API: 95,
  /** Web検索 */
  WEB_SEARCH: 70,
  /** AI生成 */
  AI_GENERATED: 60,
  /** ブログ記事 */
  BLOG: 50,
} as const;

/**
 * キャッシュキープレフィックス
 */
export const CACHE_KEY_PREFIXES = {
  /** 渡航情報 */
  TRAVEL_INFO: 'travel-info',
  /** 安全情報 */
  SAFETY: 'safety',
  /** 天気情報 */
  WEATHER: 'weather',
  /** 為替情報 */
  EXCHANGE: 'exchange',
} as const;
