/**
 * Redisキャッシュ戦略（スタブ）
 * 将来の本番環境用
 *
 * TODO: 本番環境で使用する場合は以下を実装:
 * - Redis/Upstash接続
 * - コネクションプーリング
 * - クラスター対応
 */

import { CacheEntry, CacheOptions, ICacheManager } from '../../interfaces';
import { CacheStats, createEmptyCacheStats } from '../cache-config';

/**
 * Redisキャッシュ設定
 */
export interface RedisCacheConfig {
  /** Redis接続URL */
  url?: string;
  /** 接続タイムアウト（ミリ秒） */
  connectTimeoutMs?: number;
  /** デフォルトTTL（ミリ秒） */
  defaultTtlMs?: number;
  /** キープレフィックス */
  keyPrefix?: string;
  /** デバッグログを出力するか */
  debug?: boolean;
}

/**
 * Redisキャッシュ実装（スタブ）
 *
 * 注意: これは将来の実装用のスタブです。
 * 実際のRedis接続は実装されていません。
 */
export class RedisCache implements ICacheManager {
  private readonly config: Required<RedisCacheConfig>;
  private connected = false;

  constructor(config: RedisCacheConfig = {}) {
    this.config = {
      url: config.url ?? process.env.REDIS_URL ?? '',
      connectTimeoutMs: config.connectTimeoutMs ?? 5000,
      defaultTtlMs: config.defaultTtlMs ?? 3600000,
      keyPrefix: config.keyPrefix ?? 'travel-info:',
      debug: config.debug ?? false,
    };

    this.log('RedisCache created (stub implementation)');
  }

  /**
   * Redis接続を確立（スタブ）
   */
  async connect(): Promise<void> {
    if (!this.config.url) {
      this.log('No Redis URL configured, operating in stub mode');
      return;
    }

    // TODO: 実際のRedis接続を実装
    // const client = createClient({ url: this.config.url });
    // await client.connect();

    this.connected = true;
    this.log('Redis connected (stub)');
  }

  /**
   * Redis接続を切断（スタブ）
   */
  async disconnect(): Promise<void> {
    // TODO: 実際の切断処理を実装
    this.connected = false;
    this.log('Redis disconnected (stub)');
  }

  /**
   * キャッシュを取得（スタブ）
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    this.log(`Redis GET: ${this.getPrefixedKey(key)} (stub - returning null)`);

    // TODO: 実際のRedis GET操作を実装
    // const value = await this.client.get(this.getPrefixedKey(key));
    // if (!value) return null;
    // return JSON.parse(value);

    return null;
  }

  /**
   * キャッシュを設定（スタブ）
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const ttlMs = options?.ttlSeconds
      ? options.ttlSeconds * 1000
      : this.config.defaultTtlMs;

    this.log(
      `Redis SET: ${this.getPrefixedKey(key)} with TTL ${ttlMs}ms (stub - not stored)`
    );

    // TODO: 実際のRedis SET操作を実装
    // const entry: CacheEntry<T> = {
    //   data,
    //   createdAt: new Date(),
    //   expiresAt: new Date(Date.now() + ttlMs),
    //   key,
    // };
    // await this.client.setEx(
    //   this.getPrefixedKey(key),
    //   Math.ceil(ttlMs / 1000),
    //   JSON.stringify(entry)
    // );
  }

  /**
   * キャッシュを削除（スタブ）
   */
  async delete(key: string): Promise<boolean> {
    this.log(
      `Redis DEL: ${this.getPrefixedKey(key)} (stub - returning false)`
    );

    // TODO: 実際のRedis DEL操作を実装
    // const result = await this.client.del(this.getPrefixedKey(key));
    // return result > 0;

    return false;
  }

  /**
   * パターンに一致するキャッシュを削除（スタブ）
   */
  async deleteByPattern(pattern: string): Promise<number> {
    this.log(`Redis KEYS+DEL: ${this.getPrefixedKey(pattern)} (stub - returning 0)`);

    // TODO: 実際のパターン削除を実装
    // 注意: KEYS コマンドは本番環境では SCAN を使用すべき
    // const keys = await this.client.keys(this.getPrefixedKey(pattern));
    // if (keys.length === 0) return 0;
    // return await this.client.del(keys);

    return 0;
  }

  /**
   * キャッシュをクリア（スタブ）
   */
  async clear(): Promise<void> {
    this.log('Redis FLUSHDB (stub - not executed)');

    // TODO: 実際のクリア操作を実装
    // 注意: プレフィックス付きキーのみ削除するべき
    // await this.deleteByPattern('*');
  }

  /**
   * キャッシュが存在するか確認（スタブ）
   */
  async has(key: string): Promise<boolean> {
    this.log(
      `Redis EXISTS: ${this.getPrefixedKey(key)} (stub - returning false)`
    );

    // TODO: 実際のEXISTS操作を実装
    // const result = await this.client.exists(this.getPrefixedKey(key));
    // return result === 1;

    return false;
  }

  /**
   * キャッシュ統計を取得（スタブ）
   */
  getStats(): CacheStats {
    this.log('Redis INFO (stub - returning empty stats)');

    // TODO: 実際のRedis INFO コマンドを実装
    return createEmptyCacheStats();
  }

  /**
   * 接続状態を取得
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * プレフィックス付きキーを生成
   */
  private getPrefixedKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * デバッグログを出力
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[redis-cache] ${message}`);
    }
  }
}

/**
 * Redisキャッシュを作成（スタブ）
 */
export function createRedisCache(config?: RedisCacheConfig): RedisCache {
  return new RedisCache(config);
}

/**
 * Redis設定が有効かチェック
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
