/**
 * API関連定数
 * API-related Constants
 */

/**
 * 内部APIエンドポイント
 */
export const API_ENDPOINTS = {
  /** チャットAPI */
  CHAT: '/api/chat',
} as const;

/**
 * 外部APIベースURL
 */
export const EXTERNAL_API_URLS = {
  /** 外務省海外安全情報API */
  MOFA_SAFETY: 'https://www.anzen.mofa.go.jp',
  /** 天気API */
  WEATHER_API: 'https://api.weatherapi.com/v1',
  /** 為替API */
  EXCHANGE_API: 'https://api.exchangerate-api.com/v4',
  /** Unsplash API */
  UNSPLASH_API: 'https://api.unsplash.com',
} as const;

/**
 * HTTPステータスコード
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * HTTPメソッド
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

/**
 * リクエストタイムアウト（ミリ秒）
 */
export const REQUEST_TIMEOUT = {
  /** デフォルトタイムアウト */
  DEFAULT: 30000,
  /** 長時間処理用タイムアウト */
  LONG: 60000,
  /** 短時間処理用タイムアウト */
  SHORT: 10000,
} as const;

/**
 * レート制限設定
 */
export const RATE_LIMIT = {
  /** 1分あたりの最大リクエスト数 */
  MAX_REQUESTS_PER_MINUTE: 60,
  /** リトライ待機時間（ミリ秒） */
  RETRY_AFTER_MS: 60000,
} as const;
