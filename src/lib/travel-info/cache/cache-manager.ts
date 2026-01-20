/**
 * キャッシュマネージャー
 * 渡航情報のキャッシュを管理
 *
 * 戦略パターンを使用して、環境に応じたキャッシュ実装を選択可能
 * - 開発: MemoryCache または FileCache
 * - 本番: RedisCache（将来実装）
 */

import {
  ICacheManager,
  CacheEntry,
  CacheOptions,
} from '../interfaces';

import { TravelInfoCategory } from '@/types';

import {
  CacheStats,
  CACHE_TTL_CONFIG,
  generateCacheKey,
  getCategoryTtlSeconds,
  createEmptyCacheStats,
} from './cache-config';

import { MemoryCache, createMemoryCache, MemoryCacheConfig } from './strategies/memory-cache';
import { FileCache, createFileCache, FileCacheConfig } from './strategies/file-cache';
import { RedisCache, createRedisCache, RedisCacheConfig, isRedisConfigured } from './strategies/redis-cache';

// ============================================
// キャッシュ戦略タイプ
// ============================================

export type CacheStrategy = 'memory' | 'file' | 'redis' | 'auto';

// ============================================
// 統合キャッシュマネージャー設定
// ============================================

export interface CacheManagerConfig {
  /** キャッシュ戦略 */
  strategy?: CacheStrategy;
  /** メモリキャッシュ設定 */
  memoryConfig?: MemoryCacheConfig;
  /** ファイルキャッシュ設定 */
  fileConfig?: FileCacheConfig;
  /** Redisキャッシュ設定 */
  redisConfig?: RedisCacheConfig;
  /** デフォルトTTL（秒） */
  defaultTtlSeconds?: number;
  /** カテゴリ別TTLを使用するか */
  useCategoryTtl?: boolean;
  /** デバッグログを出力するか */
  debug?: boolean;
}

// ============================================
// 拡張キャッシュマネージャーインターフェース
// ============================================

export interface IExtendedCacheManager extends ICacheManager {
  /**
   * カテゴリ別にキャッシュを設定
   */
  setWithCategory<T>(
    destination: string,
    category: TravelInfoCategory,
    data: T,
    options?: Record<string, string>
  ): Promise<void>;

  /**
   * カテゴリ別にキャッシュを取得
   */
  getWithCategory<T>(
    destination: string,
    category: TravelInfoCategory,
    options?: Record<string, string>
  ): Promise<CacheEntry<T> | null>;

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats | Promise<CacheStats>;

  /**
   * 統計をリセット
   */
  resetStats(): void;
}

// ============================================
// 統合キャッシュマネージャー
// ============================================

/**
 * 統合キャッシュマネージャー
 * 戦略パターンで異なるキャッシュ実装を切り替え可能
 */
export class CacheManager implements IExtendedCacheManager {
  private readonly strategy: ICacheManager;
  private readonly config: Required<
    Omit<CacheManagerConfig, 'memoryConfig' | 'fileConfig' | 'redisConfig'>
  >;

  constructor(config: CacheManagerConfig = {}) {
    this.config = {
      strategy: config.strategy ?? 'auto',
      defaultTtlSeconds: config.defaultTtlSeconds ?? 3600,
      useCategoryTtl: config.useCategoryTtl ?? true,
      debug: config.debug ?? false,
    };

    // 戦略を選択
    this.strategy = this.selectStrategy(config);
    this.log(`CacheManager initialized with strategy: ${this.config.strategy}`);
  }

  /**
   * キャッシュ戦略を選択
   */
  private selectStrategy(config: CacheManagerConfig): ICacheManager {
    const strategy = config.strategy ?? 'auto';

    switch (strategy) {
      case 'redis':
        return createRedisCache(config.redisConfig);

      case 'file':
        return createFileCache(config.fileConfig);

      case 'memory':
        return createMemoryCache(config.memoryConfig);

      case 'auto':
      default:
        // 自動選択: Redis > Memory
        if (isRedisConfigured()) {
          this.log('Auto-selected: Redis cache');
          return createRedisCache(config.redisConfig);
        }
        this.log('Auto-selected: Memory cache');
        return createMemoryCache(config.memoryConfig);
    }
  }

  // ============================================
  // 基本キャッシュ操作
  // ============================================

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.strategy.get<T>(key);
  }

  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const ttlSeconds = options?.ttlSeconds ?? this.config.defaultTtlSeconds;
    return this.strategy.set(key, data, { ...options, ttlSeconds });
  }

  async delete(key: string): Promise<boolean> {
    return this.strategy.delete(key);
  }

  async deleteByPattern(pattern: string): Promise<number> {
    return this.strategy.deleteByPattern(pattern);
  }

  async clear(): Promise<void> {
    return this.strategy.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.strategy.has(key);
  }

  // ============================================
  // カテゴリ別キャッシュ操作
  // ============================================

  /**
   * カテゴリ別にキャッシュを設定
   * カテゴリに応じたTTLを自動適用
   */
  async setWithCategory<T>(
    destination: string,
    category: TravelInfoCategory,
    data: T,
    options?: Record<string, string>
  ): Promise<void> {
    const key = generateCacheKey(destination, category, options);
    const ttlSeconds = this.config.useCategoryTtl
      ? getCategoryTtlSeconds(category)
      : this.config.defaultTtlSeconds;

    this.log(`Setting cache for ${category}: ${key} (TTL: ${ttlSeconds}s)`);
    return this.set(key, data, { ttlSeconds });
  }

  /**
   * カテゴリ別にキャッシュを取得
   */
  async getWithCategory<T>(
    destination: string,
    category: TravelInfoCategory,
    options?: Record<string, string>
  ): Promise<CacheEntry<T> | null> {
    const key = generateCacheKey(destination, category, options);
    return this.get<T>(key);
  }

  // ============================================
  // 統計情報
  // ============================================

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats | Promise<CacheStats> {
    if (this.strategy instanceof MemoryCache) {
      return this.strategy.getStats();
    }
    if (this.strategy instanceof FileCache) {
      return this.strategy.getStats();
    }
    if (this.strategy instanceof RedisCache) {
      return this.strategy.getStats();
    }
    return createEmptyCacheStats();
  }

  /**
   * 統計をリセット
   */
  resetStats(): void {
    if (this.strategy instanceof MemoryCache) {
      this.strategy.resetStats();
    }
    if (this.strategy instanceof FileCache) {
      this.strategy.resetStats();
    }
  }

  // ============================================
  // ユーティリティ
  // ============================================

  /**
   * 使用中の戦略を取得
   */
  getStrategy(): ICacheManager {
    return this.strategy;
  }

  /**
   * 使用中の戦略タイプを取得
   */
  getStrategyType(): CacheStrategy {
    if (this.strategy instanceof RedisCache) return 'redis';
    if (this.strategy instanceof FileCache) return 'file';
    if (this.strategy instanceof MemoryCache) return 'memory';
    return 'memory';
  }

  /**
   * デバッグログを出力
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[cache-manager] ${message}`);
    }
  }
}

// ============================================
// 後方互換性のためのエイリアス
// ============================================

/**
 * InMemoryCacheManager（後方互換性のため）
 * @deprecated CacheManager を使用してください
 */
export class InMemoryCacheManager extends CacheManager {
  constructor(config?: CacheManagerConfig) {
    super({ ...config, strategy: 'memory' });
  }
}

// ============================================
// ファクトリ関数
// ============================================

/**
 * キャッシュマネージャーを作成
 */
export function createCacheManager(config?: CacheManagerConfig): IExtendedCacheManager {
  return new CacheManager(config);
}

// ============================================
// シングルトン
// ============================================

let sharedCacheManager: IExtendedCacheManager | null = null;

/**
 * 共有キャッシュマネージャーを取得
 */
export function getSharedCacheManager(): IExtendedCacheManager {
  if (!sharedCacheManager) {
    sharedCacheManager = createCacheManager();
  }
  return sharedCacheManager;
}

/**
 * 共有キャッシュマネージャーをリセット
 */
export function resetSharedCacheManager(): void {
  sharedCacheManager = null;
}

// ============================================
// カテゴリTTL設定のエクスポート
// ============================================

export { CACHE_TTL_CONFIG };
