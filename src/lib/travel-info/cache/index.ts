/**
 * キャッシュ モジュール エクスポート
 */

// メインキャッシュマネージャー
export {
  CacheManager,
  InMemoryCacheManager,
  createCacheManager,
  getSharedCacheManager,
  resetSharedCacheManager,
  CACHE_TTL_CONFIG,
  type CacheManagerConfig,
  type CacheStrategy,
  type IExtendedCacheManager,
} from './cache-manager';

// キャッシュ設定
export {
  CACHE_TTL_CONFIG as CATEGORY_TTL_CONFIG,
  EXCHANGE_RATE_TTL,
  CACHE_KEY_PREFIX,
  CACHE_KEY_SEPARATOR,
  MEMORY_CACHE_DEFAULTS,
  FILE_CACHE_DEFAULTS,
  generateCacheKey,
  generateCompositeCacheKey,
  generateCacheKeyPattern,
  normalizeDestination,
  getCategoryTtl,
  getCategoryTtlSeconds,
  createEmptyCacheStats,
  calculateHitRate,
  type CacheStats,
} from './cache-config';

// キャッシュ戦略
export {
  MemoryCache,
  createMemoryCache,
  type MemoryCacheConfig,
} from './strategies/memory-cache';

export {
  FileCache,
  createFileCache,
  type FileCacheConfig,
} from './strategies/file-cache';

export {
  RedisCache,
  createRedisCache,
  isRedisConfigured,
  type RedisCacheConfig,
} from './strategies/redis-cache';
