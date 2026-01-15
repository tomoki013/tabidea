/**
 * メモリキャッシュ戦略
 * LRU（Least Recently Used）方式のインメモリキャッシュ
 */

import { CacheEntry, CacheOptions, ICacheManager } from '../../interfaces';
import {
  CacheStats,
  MEMORY_CACHE_DEFAULTS,
  calculateHitRate,
} from '../cache-config';

/**
 * メモリキャッシュ設定
 */
export interface MemoryCacheConfig {
  /** 最大エントリ数 */
  maxEntries?: number;
  /** デフォルトTTL（ミリ秒） */
  defaultTtlMs?: number;
  /** クリーンアップ間隔（ミリ秒） */
  cleanupIntervalMs?: number;
  /** デバッグログを出力するか */
  debug?: boolean;
}

/**
 * LRUノード（双方向リンクリスト用）
 */
interface LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

/**
 * LRUメモリキャッシュ実装
 * 双方向リンクリストとMapを使用してO(1)のアクセスと削除を実現
 */
export class MemoryCache implements ICacheManager {
  private readonly cache: Map<string, LRUNode<unknown>> = new Map();
  private readonly config: Required<MemoryCacheConfig>;
  private cleanupTimer?: NodeJS.Timeout;

  // LRU用の双方向リンクリスト
  private head: LRUNode<unknown> | null = null;
  private tail: LRUNode<unknown> | null = null;

  // 統計情報
  private hits = 0;
  private misses = 0;

  constructor(config: MemoryCacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? MEMORY_CACHE_DEFAULTS.maxEntries,
      defaultTtlMs: config.defaultTtlMs ?? MEMORY_CACHE_DEFAULTS.defaultTtlMs,
      cleanupIntervalMs:
        config.cleanupIntervalMs ?? MEMORY_CACHE_DEFAULTS.cleanupIntervalMs,
      debug: config.debug ?? false,
    };

    this.startCleanup();
  }

  /**
   * キャッシュを取得
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const node = this.cache.get(key);

    if (!node) {
      this.misses++;
      this.log(`Cache miss: ${key}`);
      return null;
    }

    // 期限切れチェック
    if (new Date() > node.entry.expiresAt) {
      this.removeNode(node);
      this.cache.delete(key);
      this.misses++;
      this.log(`Cache expired: ${key}`);
      return null;
    }

    // LRUで最近使用したものとしてマーク（先頭に移動）
    this.moveToHead(node);
    this.hits++;
    this.log(`Cache hit: ${key}`);

    return node.entry as CacheEntry<T>;
  }

  /**
   * キャッシュを設定
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    // 既存のエントリを削除
    const existingNode = this.cache.get(key);
    if (existingNode) {
      this.removeNode(existingNode);
      this.cache.delete(key);
    }

    // 最大エントリ数をチェック
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const ttlMs = options?.ttlSeconds
      ? options.ttlSeconds * 1000
      : this.config.defaultTtlMs;

    const now = new Date();
    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      key,
    };

    // 新しいノードを作成してリストの先頭に追加
    const newNode: LRUNode<T> = {
      key,
      entry,
      prev: null,
      next: null,
    };

    this.addToHead(newNode as LRUNode<unknown>);
    this.cache.set(key, newNode as LRUNode<unknown>);
    this.log(`Cache set: ${key} (expires: ${entry.expiresAt.toISOString()})`);
  }

  /**
   * キャッシュを削除
   */
  async delete(key: string): Promise<boolean> {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    this.log(`Cache deleted: ${key}`);
    return true;
  }

  /**
   * パターンに一致するキャッシュを削除
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    let deletedCount = 0;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.log(`Cache deleted ${deletedCount} entries matching: ${pattern}`);
    return deletedCount;
  }

  /**
   * キャッシュをクリア
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.log(`Cache cleared: ${size} entries removed`);
  }

  /**
   * キャッシュが存在するか確認
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats {
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    let estimatedMemoryBytes = 0;

    for (const node of this.cache.values()) {
      if (!oldestEntry || node.entry.createdAt < oldestEntry) {
        oldestEntry = node.entry.createdAt;
      }
      if (!newestEntry || node.entry.createdAt > newestEntry) {
        newestEntry = node.entry.createdAt;
      }
      // 概算でメモリ使用量を計算
      estimatedMemoryBytes += JSON.stringify(node.entry.data).length * 2;
    }

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      oldestEntry,
      newestEntry,
      hitRate: calculateHitRate(this.hits, this.misses),
      estimatedMemoryBytes,
    };
  }

  /**
   * 統計をリセット
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * クリーンアップを停止
   */
  destroy(): void {
    this.stopCleanup();
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  // ============================================
  // プライベートメソッド
  // ============================================

  /**
   * ノードをリストの先頭に追加
   */
  private addToHead(node: LRUNode<unknown>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * ノードをリストから削除
   */
  private removeNode(node: LRUNode<unknown>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * ノードをリストの先頭に移動
   */
  private moveToHead(node: LRUNode<unknown>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * LRU方式で最も古いエントリを削除
   */
  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    const lruNode = this.tail;
    this.removeNode(lruNode);
    this.cache.delete(lruNode.key);
    this.log(`Cache evicted (LRU): ${lruNode.key}`);
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, node] of this.cache.entries()) {
      if (now > node.entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
      }
    }

    if (keysToDelete.length > 0) {
      this.log(`Cleanup: removed ${keysToDelete.length} expired entries`);
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

    // プロセス終了時にタイマーをクリア
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
   * デバッグログを出力
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[memory-cache] ${message}`);
    }
  }
}

/**
 * メモリキャッシュを作成
 */
export function createMemoryCache(config?: MemoryCacheConfig): MemoryCache {
  return new MemoryCache(config);
}
