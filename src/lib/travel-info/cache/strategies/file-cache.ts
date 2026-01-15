/**
 * ファイルキャッシュ戦略
 * 開発用のファイルベースキャッシュ
 *
 * 注意: 本番環境では使用しないでください
 * Node.js環境でのみ動作します
 */

import { CacheEntry, CacheOptions, ICacheManager } from '../../interfaces';
import {
  CacheStats,
  FILE_CACHE_DEFAULTS,
  calculateHitRate,
} from '../cache-config';

// Node.js のファイルシステムモジュール（動的インポート）
let fs: typeof import('fs/promises') | null = null;
let path: typeof import('path') | null = null;

/**
 * ファイルキャッシュ設定
 */
export interface FileCacheConfig {
  /** キャッシュディレクトリ */
  cacheDir?: string;
  /** デフォルトTTL（ミリ秒） */
  defaultTtlMs?: number;
  /** デバッグログを出力するか */
  debug?: boolean;
}

/**
 * ファイルに保存するキャッシュエントリ
 */
interface FileCacheEntry<T> {
  data: T;
  createdAt: string; // ISO文字列
  expiresAt: string; // ISO文字列
  key: string;
}

/**
 * ファイルベースキャッシュ実装
 * 開発環境でのデバッグや永続化テスト用
 */
export class FileCache implements ICacheManager {
  private readonly config: Required<FileCacheConfig>;
  private initialized = false;

  // 統計情報
  private hits = 0;
  private misses = 0;

  constructor(config: FileCacheConfig = {}) {
    this.config = {
      cacheDir: config.cacheDir ?? FILE_CACHE_DEFAULTS.cacheDir,
      defaultTtlMs: config.defaultTtlMs ?? FILE_CACHE_DEFAULTS.defaultTtlMs,
      debug: config.debug ?? false,
    };
  }

  /**
   * 初期化（遅延読み込み）
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Node.js環境かチェック
    if (typeof window !== 'undefined') {
      throw new Error('FileCache is only available in Node.js environment');
    }

    // 動的インポート
    fs = await import('fs/promises');
    path = await import('path');

    // キャッシュディレクトリを作成
    await fs.mkdir(this.config.cacheDir, { recursive: true });
    this.initialized = true;
    this.log('FileCache initialized');
  }

  /**
   * キーからファイルパスを生成
   */
  private getFilePath(key: string): string {
    if (!path) {
      throw new Error('FileCache not initialized');
    }
    // キーをファイル名に安全に変換
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.config.cacheDir, `${safeKey}.json`);
  }

  /**
   * キャッシュを取得
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    await this.initialize();
    if (!fs) return null;

    const filePath = this.getFilePath(key);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileEntry: FileCacheEntry<T> = JSON.parse(content);

      const entry: CacheEntry<T> = {
        data: fileEntry.data,
        createdAt: new Date(fileEntry.createdAt),
        expiresAt: new Date(fileEntry.expiresAt),
        key: fileEntry.key,
      };

      // 期限切れチェック
      if (new Date() > entry.expiresAt) {
        await this.delete(key);
        this.misses++;
        this.log(`Cache expired: ${key}`);
        return null;
      }

      this.hits++;
      this.log(`Cache hit: ${key}`);
      return entry;
    } catch {
      this.misses++;
      this.log(`Cache miss: ${key}`);
      return null;
    }
  }

  /**
   * キャッシュを設定
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    await this.initialize();
    if (!fs) return;

    const ttlMs = options?.ttlSeconds
      ? options.ttlSeconds * 1000
      : this.config.defaultTtlMs;

    const now = new Date();
    const fileEntry: FileCacheEntry<T> = {
      data,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      key,
    };

    const filePath = this.getFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(fileEntry, null, 2), 'utf-8');
    this.log(`Cache set: ${key}`);
  }

  /**
   * キャッシュを削除
   */
  async delete(key: string): Promise<boolean> {
    await this.initialize();
    if (!fs) return false;

    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
      this.log(`Cache deleted: ${key}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * パターンに一致するキャッシュを削除
   */
  async deleteByPattern(pattern: string): Promise<number> {
    await this.initialize();
    if (!fs) return 0;

    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );

    let deletedCount = 0;

    try {
      const files = await fs.readdir(this.config.cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = this.getFilePath(file.replace('.json', ''));

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const entry = JSON.parse(content);

          if (regex.test(entry.key)) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch {
          // ファイル読み取りエラーは無視
        }
      }
    } catch {
      // ディレクトリ読み取りエラーは無視
    }

    this.log(`Cache deleted ${deletedCount} entries matching: ${pattern}`);
    return deletedCount;
  }

  /**
   * キャッシュをクリア
   */
  async clear(): Promise<void> {
    await this.initialize();
    if (!fs) return;

    try {
      const files = await fs.readdir(this.config.cacheDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(this.getFilePath(file.replace('.json', '')));
        }
      }
      this.log('Cache cleared');
    } catch {
      // エラーは無視
    }
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
  async getStats(): Promise<CacheStats> {
    await this.initialize();
    if (!fs) {
      return {
        hits: this.hits,
        misses: this.misses,
        size: 0,
        oldestEntry: null,
        newestEntry: null,
        hitRate: calculateHitRate(this.hits, this.misses),
      };
    }

    let size = 0;
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    let estimatedMemoryBytes = 0;

    try {
      const files = await fs.readdir(this.config.cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = this.getFilePath(file.replace('.json', ''));

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const entry = JSON.parse(content);
          const createdAt = new Date(entry.createdAt);

          size++;
          estimatedMemoryBytes += content.length;

          if (!oldestEntry || createdAt < oldestEntry) {
            oldestEntry = createdAt;
          }
          if (!newestEntry || createdAt > newestEntry) {
            newestEntry = createdAt;
          }
        } catch {
          // ファイル読み取りエラーは無視
        }
      }
    } catch {
      // ディレクトリ読み取りエラーは無視
    }

    return {
      hits: this.hits,
      misses: this.misses,
      size,
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
   * デバッグログを出力
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[file-cache] ${message}`);
    }
  }
}

/**
 * ファイルキャッシュを作成
 */
export function createFileCache(config?: FileCacheConfig): FileCache {
  return new FileCache(config);
}
