/**
 * キャッシュマネージャー
 * 渡航情報のキャッシュを管理
 *
 * TODO: Redis/Upstashへの移行を検討
 * 現在はメモリキャッシュ（サーバーレス環境では制限あり）
 */

import {
  ICacheManager,
  CacheEntry,
  CacheOptions,
} from '../interfaces';

/**
 * デフォルトのTTL（秒）
 */
const DEFAULT_TTL_SECONDS = 3600; // 1時間

/**
 * キャッシュマネージャー設定
 */
export interface CacheManagerConfig {
  /** デフォルトTTL（秒） */
  defaultTtlSeconds?: number;
  /** 最大エントリ数 */
  maxEntries?: number;
  /** 定期クリーンアップ間隔（ミリ秒） */
  cleanupIntervalMs?: number;
}

/**
 * インメモリキャッシュマネージャー
 * サーバーレス環境ではリクエスト間でキャッシュが保持されない可能性あり
 */
export class InMemoryCacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly config: CacheManagerConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheManagerConfig = {}) {
    this.config = {
      defaultTtlSeconds: DEFAULT_TTL_SECONDS,
      maxEntries: 1000,
      cleanupIntervalMs: 60000, // 1分
      ...config,
    };

    // 定期クリーンアップを開始
    this.startCleanup();
  }

  /**
   * キャッシュを取得
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 期限切れチェック
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  /**
   * キャッシュを設定
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    // 最大エントリ数をチェック
    if (this.cache.size >= (this.config.maxEntries || 1000)) {
      this.evictOldest();
    }

    const ttlSeconds = options?.ttlSeconds ?? this.config.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt,
      key,
    };

    this.cache.set(key, entry);
    console.log(`[cache] Set: ${key} (expires: ${expiresAt.toISOString()})`);
  }

  /**
   * キャッシュを削除
   */
  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    this.cache.delete(key);

    if (existed) {
      console.log(`[cache] Deleted: ${key}`);
    }

    return existed;
  }

  /**
   * パターンに一致するキャッシュを削除
   */
  async deleteByPattern(pattern: string): Promise<number> {
    // 簡易的なワイルドカードマッチング（*のみ対応）
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    console.log(`[cache] Deleted ${deletedCount} entries matching: ${pattern}`);
    return deletedCount;
  }

  /**
   * キャッシュをクリア
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[cache] Cleared ${size} entries`);
  }

  /**
   * キャッシュが存在するか確認
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * 最も古いエントリを削除
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[cache] Evicted oldest: ${oldestKey}`);
    }
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[cache] Cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * 定期クリーンアップを開始
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    // Node.js環境でプロセス終了時にタイマーをクリア
    if (typeof process !== 'undefined' && process.on) {
      process.on('beforeExit', () => {
        this.stopCleanup();
      });
    }
  }

  /**
   * 定期クリーンアップを停止
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): { size: number; oldestEntry: Date | null; newestEntry: Date | null } {
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const entry of this.cache.values()) {
      if (!oldest || entry.createdAt < oldest) {
        oldest = entry.createdAt;
      }
      if (!newest || entry.createdAt > newest) {
        newest = entry.createdAt;
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }
}

/**
 * キャッシュマネージャーのファクトリ関数
 */
export function createCacheManager(config?: CacheManagerConfig): ICacheManager {
  return new InMemoryCacheManager(config);
}

/**
 * シングルトンキャッシュマネージャー
 * アプリケーション全体で共有
 */
let sharedCacheManager: ICacheManager | null = null;

export function getSharedCacheManager(): ICacheManager {
  if (!sharedCacheManager) {
    sharedCacheManager = createCacheManager();
  }
  return sharedCacheManager;
}
