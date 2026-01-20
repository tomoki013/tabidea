/**
 * アプリケーション設定
 * Application Configuration Constants
 */

/**
 * アプリケーション基本設定
 */
export const APP_CONFIG = {
  /** アプリ名 */
  APP_NAME: 'Tabidea',
  /** アプリURL */
  APP_URL: 'https://ai.tomokichidiary.com',
  /** デフォルト言語 */
  DEFAULT_LANGUAGE: 'ja',
  /** コンタクトメール */
  CONTACT_EMAIL: 'contact@tomokichidiary.com',
} as const;

/**
 * AI設定
 */
export const AI_CONFIG = {
  /** デフォルトモデル名 */
  DEFAULT_MODEL_NAME: 'gemini-2.5-flash',
  /** 温度パラメータ（創造性） */
  TEMPERATURE: 0.35,
  /** 最大リトライ回数 */
  MAX_RETRIES: 3,
  /** リトライ間隔（ミリ秒） */
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * キャッシュ設定
 */
export const CACHE_CONFIG = {
  /** デフォルトTTL（ミリ秒） - 1時間 */
  DEFAULT_TTL_MS: 3600000,
  /** 為替レートTTL（ミリ秒） - 6時間 */
  EXCHANGE_RATE_TTL_MS: 21600000,
  /** 天気情報TTL（ミリ秒） - 3時間 */
  WEATHER_TTL_MS: 10800000,
  /** 安全情報TTL（ミリ秒） - 24時間 */
  SAFETY_INFO_TTL_MS: 86400000,
} as const;

/**
 * RAG検索設定
 */
export const RAG_CONFIG = {
  /** デフォルト取得件数 */
  DEFAULT_TOP_K: 5,
  /** 最小スコア閾値 */
  DEFAULT_MIN_SCORE: 0.7,
} as const;

/**
 * ページネーション設定
 */
export const PAGINATION_CONFIG = {
  /** デフォルトページサイズ */
  DEFAULT_PAGE_SIZE: 10,
  /** 最大ページサイズ */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * 環境変数キー
 */
export const ENV_KEYS = {
  GOOGLE_API_KEY: 'GOOGLE_GENERATIVE_AI_API_KEY',
  GOOGLE_MODEL_NAME: 'GOOGLE_MODEL_NAME',
  PINECONE_API_KEY: 'PINECONE_API_KEY',
  PINECONE_INDEX: 'PINECONE_INDEX',
  WEATHER_API_KEY: 'WEATHER_API_KEY',
  EXCHANGE_API_KEY: 'EXCHANGE_API_KEY',
  UNSPLASH_ACCESS_KEY: 'UNSPLASH_ACCESS_KEY',
  REDIS_URL: 'REDIS_URL',
  GMAIL_USER: 'GMAIL_USER',
  GMAIL_PASS: 'GMAIL_PASS',
} as const;
