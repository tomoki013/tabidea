/**
 * 渡航情報サービスのインターフェース定義
 * Travel Information Service Interfaces
 */

import {
  TravelInfoCategory,
  TravelInfoResponse,
  TravelInfoOptions,
  TravelInfoSource,
  SourceType,
  CategoryDataMap,
  AnyCategoryData,
} from '@/types';

// ============================================
// ソースオプション
// ============================================

/**
 * データソース取得オプション
 */
export interface SourceOptions {
  /** 渡航予定日 */
  travelDate?: Date;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 言語（デフォルト: "ja"） */
  language?: string;
  /** 国名（コンテキスト用） */
  country?: string;
  /** 追加パラメータ */
  additionalParams?: Record<string, unknown>;
}

// ============================================
// ソース結果型
// ============================================

/**
 * データソース取得結果（成功）
 */
export interface SourceResultSuccess<T> {
  success: true;
  /** 取得したデータ */
  data: T;
  /** ソース情報 */
  source: TravelInfoSource;
  /** フォールバックが使用されたか */
  fallbackUsed?: boolean;
  /** フォールバックソース名 */
  fallbackSource?: TravelInfoSource;
}

/**
 * データソース取得結果（失敗）
 */
export interface SourceResultFailure {
  success: false;
  /** エラーメッセージ */
  error: string;
  /** フォールバックが使用されたか */
  fallbackUsed?: boolean;
  /** フォールバックソース名 */
  fallbackSource?: string;
}

/**
 * データソース取得結果
 */
export type SourceResult<T> = SourceResultSuccess<T> | SourceResultFailure;

// ============================================
// データソースインターフェース
// ============================================

/**
 * 渡航情報データソースインターフェース
 * 各APIソース（外務省、天気、為替等）が実装する
 */
export interface ITravelInfoSource<T extends AnyCategoryData = AnyCategoryData> {
  /** データソースの一意なID */
  readonly sourceId: string;
  /** ソース名（例: "外務省海外安全情報"） */
  readonly sourceName: string;
  /** ソースタイプ */
  readonly sourceType: SourceType;
  /** 信頼性スコア（1-100） */
  readonly reliabilityScore: number;
  /** 対応カテゴリ */
  readonly supportedCategories: TravelInfoCategory[];

  /**
   * 情報を取得する
   * @param destination 目的地
   * @param options オプション
   */
  fetch(destination: string, options?: SourceOptions): Promise<SourceResult<T>>;

  /**
   * ソースが利用可能かチェック
   */
  isAvailable(): Promise<boolean>;
}

// ============================================
// メインサービスインターフェース
// ============================================

/**
 * 渡航情報サービスインターフェース
 * 複数のソースをオーケストレーションする
 */
export interface ITravelInfoService {
  /**
   * 渡航情報を取得する
   * @param destination 目的地
   * @param categories 取得するカテゴリ
   * @param options オプション
   */
  getInfo(
    destination: string,
    categories: TravelInfoCategory[],
    options?: TravelInfoOptions
  ): Promise<TravelInfoResponse>;

  /**
   * キャッシュされた情報を取得する
   * @param destination 目的地
   */
  getCachedInfo(destination: string): Promise<TravelInfoResponse | null>;

  /**
   * キャッシュを無効化する
   * @param destination 目的地
   */
  invalidateCache(destination: string): Promise<void>;

  /**
   * 特定カテゴリのみ取得する
   * @param destination 目的地
   * @param category カテゴリ
   * @param options オプション
   */
  getCategoryInfo<K extends TravelInfoCategory>(
    destination: string,
    category: K,
    options?: TravelInfoOptions
  ): Promise<SourceResult<CategoryDataMap[K]>>;
}

// ============================================
// キャッシュインターフェース
// ============================================

/**
 * キャッシュエントリ
 */
export interface CacheEntry<T> {
  /** キャッシュされたデータ */
  data: T;
  /** キャッシュ作成日時 */
  createdAt: Date;
  /** キャッシュ有効期限 */
  expiresAt: Date;
  /** キャッシュキー */
  key: string;
}

/**
 * キャッシュオプション
 */
export interface CacheOptions {
  /** TTL（秒） */
  ttlSeconds?: number;
  /** 強制更新 */
  forceRefresh?: boolean;
}

/**
 * キャッシュマネージャーインターフェース
 */
export interface ICacheManager {
  /**
   * キャッシュを取得
   * @param key キャッシュキー
   */
  get<T>(key: string): Promise<CacheEntry<T> | null>;

  /**
   * キャッシュを設定
   * @param key キャッシュキー
   * @param data データ
   * @param options オプション
   */
  set<T>(key: string, data: T, options?: CacheOptions): Promise<void>;

  /**
   * キャッシュを削除
   * @param key キャッシュキー
   */
  delete(key: string): Promise<boolean>;

  /**
   * パターンに一致するキャッシュを削除
   * @param pattern キーパターン
   */
  deleteByPattern(pattern: string): Promise<number>;

  /**
   * キャッシュをクリア
   */
  clear(): Promise<void>;

  /**
   * キャッシュが存在するか確認
   * @param key キャッシュキー
   */
  has(key: string): Promise<boolean>;
}

// ============================================
// エラー型
// ============================================

/**
 * 渡航情報エラーコード
 */
export type TravelInfoErrorCode =
  | 'SOURCE_UNAVAILABLE' // ソースが利用不可
  | 'TIMEOUT' // タイムアウト
  | 'INVALID_DESTINATION' // 無効な目的地
  | 'RATE_LIMITED' // レート制限
  | 'PARSE_ERROR' // パースエラー
  | 'NETWORK_ERROR' // ネットワークエラー
  | 'UNKNOWN_ERROR'; // 不明なエラー

/**
 * 渡航情報エラー
 */
export interface TravelInfoError {
  /** エラーコード */
  code: TravelInfoErrorCode;
  /** エラーメッセージ */
  message: string;
  /** ソース名（該当する場合） */
  source?: string;
  /** 元のエラー */
  cause?: Error;
}

/**
 * 渡航情報エラークラス
 */
export class TravelInfoServiceError extends Error {
  constructor(
    public readonly code: TravelInfoErrorCode,
    message: string,
    public readonly source?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TravelInfoServiceError';
  }
}

// ============================================
// ユーティリティインターフェース
// ============================================

/**
 * 信頼性スコア計算インターフェース
 */
export interface IReliabilityScorer {
  /**
   * ソースの信頼性スコアを計算
   * @param source ソース情報
   * @param factors 追加要因
   */
  calculateScore(
    source: Pick<TravelInfoSource, 'sourceType' | 'retrievedAt'>,
    factors?: ReliabilityFactors
  ): number;
}

/**
 * 信頼性計算の追加要因
 */
export interface ReliabilityFactors {
  /** データの鮮度（時間経過） */
  ageInHours?: number;
  /** ソースの過去の信頼性 */
  historicalAccuracy?: number;
  /** 複数ソースとの一致度 */
  corroborationScore?: number;
}

/**
 * カテゴリマッパーインターフェース
 */
export interface ICategoryMapper {
  /**
   * 目的地からカテゴリに適したソースを選択
   * @param destination 目的地
   * @param category カテゴリ
   */
  getSourcesForCategory(
    destination: string,
    category: TravelInfoCategory
  ): ITravelInfoSource[];

  /**
   * ソースを登録
   * @param source ソース
   */
  registerSource(source: ITravelInfoSource): void;
}
