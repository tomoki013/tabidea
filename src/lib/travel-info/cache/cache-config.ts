/**
 * キャッシュ設定
 * カテゴリ別のTTL設定と為替レート用の設定
 */

import { TravelInfoCategory } from '@/lib/types/travel-info';

// ============================================
// カテゴリ別TTL設定（ミリ秒）
// ============================================

/**
 * カテゴリ別のキャッシュTTL（ミリ秒）
 * 情報の変化頻度に応じて設定
 */
export const CACHE_TTL_CONFIG: Record<TravelInfoCategory, number> = {
  basic: 24 * 60 * 60 * 1000,      // 24時間（国情報はほぼ変わらない）
  safety: 6 * 60 * 60 * 1000,      // 6時間（安全情報は定期更新）
  climate: 30 * 60 * 1000,         // 30分（天気は頻繁に変化）
  visa: 7 * 24 * 60 * 60 * 1000,   // 7日（ビザ要件は稀に変更）
  manner: 30 * 24 * 60 * 60 * 1000, // 30日（マナーはほぼ不変）
  transport: 24 * 60 * 60 * 1000,  // 24時間
  local_food: 7 * 24 * 60 * 60 * 1000, // 7日（グルメ情報は比較的安定）
  souvenir: 7 * 24 * 60 * 60 * 1000,   // 7日（お土産情報は比較的安定）
  events: 24 * 60 * 60 * 1000,     // 24時間（イベント情報は変化する可能性あり）
};

/**
 * 為替レート専用TTL（ミリ秒）
 * 為替は頻繁に変動するため短めに設定
 */
export const EXCHANGE_RATE_TTL = 60 * 60 * 1000; // 1時間

// ============================================
// キャッシュキー設定
// ============================================

/**
 * キャッシュキーのプレフィックス
 */
export const CACHE_KEY_PREFIX = 'travel-info';

/**
 * キャッシュキー区切り文字
 */
export const CACHE_KEY_SEPARATOR = ':';

// ============================================
// キャッシュ制限設定
// ============================================

/**
 * メモリキャッシュのデフォルト設定
 */
export const MEMORY_CACHE_DEFAULTS = {
  /** 最大エントリ数 */
  maxEntries: 1000,
  /** クリーンアップ間隔（ミリ秒） */
  cleanupIntervalMs: 60 * 1000, // 1分
  /** デフォルトTTL（ミリ秒） */
  defaultTtlMs: 60 * 60 * 1000, // 1時間
};

/**
 * ファイルキャッシュのデフォルト設定
 */
export const FILE_CACHE_DEFAULTS = {
  /** キャッシュディレクトリ */
  cacheDir: '.cache/travel-info',
  /** デフォルトTTL（ミリ秒） */
  defaultTtlMs: 60 * 60 * 1000, // 1時間
};

// ============================================
// キャッシュキー生成関数
// ============================================

/**
 * キャッシュキーを生成
 * @param destination 目的地
 * @param category カテゴリ
 * @param options 追加オプション
 * @returns キャッシュキー（例: "travel-info:paris:safety:2024-03"）
 */
export function generateCacheKey(
  destination: string,
  category: TravelInfoCategory,
  options?: Record<string, string>
): string {
  // 目的地を正規化（小文字、トリム）
  const normalizedDestination = normalizeDestination(destination);

  // 基本キーを構築
  const parts = [CACHE_KEY_PREFIX, normalizedDestination, category];

  // 追加オプションがあればキーに追加
  if (options) {
    const sortedKeys = Object.keys(options).sort();
    for (const key of sortedKeys) {
      parts.push(`${key}=${options[key]}`);
    }
  }

  return parts.join(CACHE_KEY_SEPARATOR);
}

/**
 * 複合キャッシュキーを生成（複数カテゴリ用）
 * @param destination 目的地
 * @param categories カテゴリ配列
 * @returns キャッシュキー
 */
export function generateCompositeCacheKey(
  destination: string,
  categories: TravelInfoCategory[]
): string {
  const normalizedDestination = normalizeDestination(destination);
  const sortedCategories = [...categories].sort().join(',');

  return [CACHE_KEY_PREFIX, normalizedDestination, sortedCategories].join(
    CACHE_KEY_SEPARATOR
  );
}

/**
 * パターンマッチ用のキーを生成
 * @param destination 目的地（ワイルドカード "*" 使用可）
 * @param category カテゴリ（ワイルドカード "*" 使用可）
 * @returns パターンキー
 */
export function generateCacheKeyPattern(
  destination?: string,
  category?: string
): string {
  const parts = [
    CACHE_KEY_PREFIX,
    destination ? normalizeDestination(destination) : '*',
    category || '*',
  ];

  return parts.join(CACHE_KEY_SEPARATOR);
}

/**
 * 目的地名を正規化
 * @param destination 目的地
 * @returns 正規化された目的地名
 */
export function normalizeDestination(destination: string): string {
  return destination
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3000-\u9fff-]/g, ''); // 英数字、日本語、ハイフンのみ許可
}

/**
 * カテゴリのTTLを取得（ミリ秒）
 * @param category カテゴリ
 * @returns TTL（ミリ秒）
 */
export function getCategoryTtl(category: TravelInfoCategory): number {
  return CACHE_TTL_CONFIG[category];
}

/**
 * カテゴリのTTLを取得（秒）
 * @param category カテゴリ
 * @returns TTL（秒）
 */
export function getCategoryTtlSeconds(category: TravelInfoCategory): number {
  return Math.floor(CACHE_TTL_CONFIG[category] / 1000);
}

// ============================================
// キャッシュ統計型
// ============================================

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** キャッシュヒット数 */
  hits: number;
  /** キャッシュミス数 */
  misses: number;
  /** 現在のエントリ数 */
  size: number;
  /** 最も古いエントリの作成日時 */
  oldestEntry: Date | null;
  /** 最も新しいエントリの作成日時 */
  newestEntry: Date | null;
  /** ヒット率（0-1） */
  hitRate: number;
  /** メモリ使用量の推定（バイト、概算） */
  estimatedMemoryBytes?: number;
}

/**
 * 空のキャッシュ統計を生成
 */
export function createEmptyCacheStats(): CacheStats {
  return {
    hits: 0,
    misses: 0,
    size: 0,
    oldestEntry: null,
    newestEntry: null,
    hitRate: 0,
    estimatedMemoryBytes: 0,
  };
}

/**
 * ヒット率を計算
 * @param hits ヒット数
 * @param misses ミス数
 * @returns ヒット率（0-1）
 */
export function calculateHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  if (total === 0) {
    return 0;
  }
  return hits / total;
}
