/**
 * キャッシュマネージャーのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CacheManager,
  createCacheManager,
  MemoryCache,
  createMemoryCache,
  generateCacheKey,
  generateCompositeCacheKey,
  normalizeDestination,
  getCategoryTtl,
  getCategoryTtlSeconds,
  CACHE_TTL_CONFIG,
} from './index';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = createCacheManager({
      strategy: 'memory',
      debug: false,
    }) as CacheManager;
  });

  afterEach(async () => {
    await cacheManager.clear();
  });

  describe('基本操作', () => {
    it('値を設定して取得できる', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheManager.set(key, value);
      const result = await cacheManager.get(key);

      expect(result).not.toBeNull();
      expect(result?.data).toEqual(value);
    });

    it('存在しないキーはnullを返す', async () => {
      const result = await cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('キーを削除できる', async () => {
      const key = 'test-key';
      await cacheManager.set(key, { data: 'test' });

      const deleted = await cacheManager.delete(key);
      expect(deleted).toBe(true);

      const result = await cacheManager.get(key);
      expect(result).toBeNull();
    });

    it('キャッシュの存在を確認できる', async () => {
      const key = 'test-key';
      await cacheManager.set(key, { data: 'test' });

      expect(await cacheManager.has(key)).toBe(true);
      expect(await cacheManager.has('non-existent')).toBe(false);
    });

    it('キャッシュをクリアできる', async () => {
      await cacheManager.set('key1', { data: 1 });
      await cacheManager.set('key2', { data: 2 });

      await cacheManager.clear();

      expect(await cacheManager.has('key1')).toBe(false);
      expect(await cacheManager.has('key2')).toBe(false);
    });
  });

  describe('TTL処理', () => {
    it('TTLを指定してキャッシュを設定できる', async () => {
      const key = 'ttl-test';
      await cacheManager.set(key, { data: 'test' }, { ttlSeconds: 3600 });

      const result = await cacheManager.get(key);
      expect(result).not.toBeNull();
      expect(result?.expiresAt).toBeDefined();
    });

    it('期限切れのキャッシュはnullを返す', async () => {
      vi.useFakeTimers();

      const key = 'expire-test';
      await cacheManager.set(key, { data: 'test' }, { ttlSeconds: 1 });

      // 2秒後に進める
      vi.advanceTimersByTime(2000);

      const result = await cacheManager.get(key);
      expect(result).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('パターン削除', () => {
    it('パターンに一致するキャッシュを削除できる', async () => {
      await cacheManager.set('travel-info:paris:safety', { data: 1 });
      await cacheManager.set('travel-info:paris:climate', { data: 2 });
      await cacheManager.set('travel-info:tokyo:safety', { data: 3 });

      const deleted = await cacheManager.deleteByPattern('travel-info:paris:*');
      expect(deleted).toBe(2);

      expect(await cacheManager.has('travel-info:paris:safety')).toBe(false);
      expect(await cacheManager.has('travel-info:paris:climate')).toBe(false);
      expect(await cacheManager.has('travel-info:tokyo:safety')).toBe(true);
    });
  });

  describe('カテゴリ別キャッシュ', () => {
    it('カテゴリ別にキャッシュを設定して取得できる', async () => {
      const destination = 'Paris';
      const category = 'safety';
      const data = { dangerLevel: 1 };

      await cacheManager.setWithCategory(destination, category, data);
      const result = await cacheManager.getWithCategory(destination, category);

      expect(result).not.toBeNull();
      expect(result?.data).toEqual(data);
    });
  });
});

describe('MemoryCache (LRU)', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = createMemoryCache({
      maxEntries: 3,
      defaultTtlMs: 60000,
      debug: false,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('最大エントリ数を超えると古いエントリが削除される', async () => {
    await cache.set('key1', { data: 1 });
    await cache.set('key2', { data: 2 });
    await cache.set('key3', { data: 3 });

    // key1にアクセス（LRUで新しくなる）
    await cache.get('key1');

    // 4つ目を追加
    await cache.set('key4', { data: 4 });

    // key2が削除されているはず（最も古いアクセス）
    expect(await cache.has('key1')).toBe(true);
    expect(await cache.has('key2')).toBe(false);
    expect(await cache.has('key3')).toBe(true);
    expect(await cache.has('key4')).toBe(true);
  });

  it('統計情報を取得できる', async () => {
    await cache.set('key1', { data: 1 });
    await cache.get('key1'); // ヒット
    await cache.get('non-existent'); // ミス

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });
});

describe('キャッシュキー生成', () => {
  describe('generateCacheKey', () => {
    it('基本的なキーを生成できる', () => {
      const key = generateCacheKey('paris', 'safety');
      expect(key).toBe('travel-info:paris:safety');
    });

    it('目的地を正規化する', () => {
      const key = generateCacheKey('  PARIS  ', 'safety');
      expect(key).toBe('travel-info:paris:safety');
    });

    it('オプションを含むキーを生成できる', () => {
      const key = generateCacheKey('paris', 'safety', { month: '2024-03' });
      expect(key).toBe('travel-info:paris:safety:month=2024-03');
    });
  });

  describe('generateCompositeCacheKey', () => {
    it('複数カテゴリのキーを生成できる', () => {
      const key = generateCompositeCacheKey('paris', ['safety', 'climate', 'basic']);
      expect(key).toBe('travel-info:paris:basic,climate,safety');
    });
  });

  describe('normalizeDestination', () => {
    it('小文字に変換する', () => {
      expect(normalizeDestination('PARIS')).toBe('paris');
    });

    it('空白をハイフンに変換する', () => {
      expect(normalizeDestination('New York')).toBe('new-york');
    });

    it('特殊文字を除去する', () => {
      expect(normalizeDestination('Paris!')).toBe('paris');
    });

    it('日本語を保持する', () => {
      expect(normalizeDestination('東京')).toBe('東京');
    });
  });
});

describe('カテゴリTTL', () => {
  describe('getCategoryTtl', () => {
    it('各カテゴリのTTLを取得できる', () => {
      expect(getCategoryTtl('basic')).toBe(24 * 60 * 60 * 1000);
      expect(getCategoryTtl('safety')).toBe(6 * 60 * 60 * 1000);
      expect(getCategoryTtl('climate')).toBe(30 * 60 * 1000);
      expect(getCategoryTtl('visa')).toBe(7 * 24 * 60 * 60 * 1000);
      expect(getCategoryTtl('manner')).toBe(30 * 24 * 60 * 60 * 1000);
      expect(getCategoryTtl('transport')).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('getCategoryTtlSeconds', () => {
    it('秒単位でTTLを取得できる', () => {
      expect(getCategoryTtlSeconds('basic')).toBe(86400);
      expect(getCategoryTtlSeconds('climate')).toBe(1800);
    });
  });

  describe('CACHE_TTL_CONFIG', () => {
    it('全カテゴリのTTLが定義されている', () => {
      expect(CACHE_TTL_CONFIG.basic).toBeDefined();
      expect(CACHE_TTL_CONFIG.safety).toBeDefined();
      expect(CACHE_TTL_CONFIG.climate).toBeDefined();
      expect(CACHE_TTL_CONFIG.visa).toBeDefined();
      expect(CACHE_TTL_CONFIG.manner).toBeDefined();
      expect(CACHE_TTL_CONFIG.transport).toBeDefined();
    });
  });
});
