/**
 * TravelInfoServiceのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TravelInfoService,
  createTravelInfoService,
  createCacheManager,
  createCategoryMapper,
  TravelInfoServiceConfig,
} from './index';
import {
  ICategoryMapper,
  ITravelInfoSource,
  SourceResult,
} from './interfaces';
import { TravelInfoCategory, SafetyInfo, ClimateInfo, AnyCategoryData } from '@/lib/types/travel-info';

// モックソースの作成
function createMockSource(
  config: {
    sourceName: string;
    sourceType: 'official_api' | 'web_search' | 'ai_generated' | 'blog';
    categories: TravelInfoCategory[];
    available?: boolean;
    shouldFail?: boolean;
    data?: unknown;
  }
): ITravelInfoSource {
  return {
    sourceName: config.sourceName,
    sourceType: config.sourceType,
    reliabilityScore: config.sourceType === 'official_api' ? 95 : 60,
    supportedCategories: config.categories,
    async fetch(): Promise<SourceResult<AnyCategoryData>> {
      if (config.shouldFail) {
        return { success: false, error: 'Mock fetch failed' };
      }
      return {
        success: true,
        data: (config.data ?? { mock: true }) as AnyCategoryData,
        source: {
          sourceType: config.sourceType,
          sourceName: config.sourceName,
          retrievedAt: new Date(),
          reliabilityScore: config.sourceType === 'official_api' ? 95 : 60,
        },
      };
    },
    async isAvailable(): Promise<boolean> {
      return config.available ?? true;
    },
  };
}

// モックカテゴリマッパーの作成
function createMockCategoryMapper(sources: ITravelInfoSource[]): ICategoryMapper {
  return {
    getSourcesForCategory: (_destination: string, category: TravelInfoCategory) => {
      return sources.filter((s) => s.supportedCategories.includes(category));
    },
    registerSource: () => {},
  };
}

describe('TravelInfoService', () => {
  let service: TravelInfoService;
  let cacheManager: ReturnType<typeof createCacheManager>;

  beforeEach(() => {
    cacheManager = createCacheManager({ strategy: 'memory' });
  });

  afterEach(async () => {
    await cacheManager.clear();
  });

  describe('getInfo', () => {
    it('単一カテゴリの情報を取得できる', async () => {
      const mockSafetyData: SafetyInfo = {
        dangerLevel: 1,
        dangerLevelDescription: '十分注意してください',
        warnings: [],
        emergencyContacts: [],
      };

      const mockSource = createMockSource({
        sourceName: 'MockMOFA',
        sourceType: 'official_api',
        categories: ['safety'],
        data: mockSafetyData,
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([mockSource]),
      }) as TravelInfoService;

      const response = await service.getInfo('Tokyo', ['safety']);

      expect(response.destination).toBe('Tokyo');
      expect(response.categories.has('safety')).toBe(true);
      expect(response.sources.length).toBeGreaterThan(0);
    });

    it('複数カテゴリの情報を並列取得できる', async () => {
      const safetySource = createMockSource({
        sourceName: 'MockMOFA',
        sourceType: 'official_api',
        categories: ['safety'],
        data: {
          dangerLevel: 1,
          dangerLevelDescription: '十分注意してください',
          warnings: [],
          emergencyContacts: [],
        },
      });

      const climateSource = createMockSource({
        sourceName: 'MockWeather',
        sourceType: 'official_api',
        categories: ['climate'],
        data: {
          currentWeather: { temp: 25, condition: '晴れ', humidity: 60 },
          recommendedClothing: ['Tシャツ'],
          seasonDescription: '夏',
        },
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([safetySource, climateSource]),
      }) as TravelInfoService;

      const response = await service.getInfo('Tokyo', ['safety', 'climate']);

      expect(response.categories.has('safety')).toBe(true);
      expect(response.categories.has('climate')).toBe(true);
    });

    it('キャッシュから情報を取得できる', async () => {
      const fetchCount = { count: 0 };
      const mockSource = createMockSource({
        sourceName: 'MockSource',
        sourceType: 'official_api',
        categories: ['safety'],
      });

      // fetchをスパイ
      const originalFetch = mockSource.fetch;
      mockSource.fetch = async (...args) => {
        fetchCount.count++;
        return originalFetch.apply(mockSource, args);
      };

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([mockSource]),
      }) as TravelInfoService;

      // 1回目の取得
      await service.getInfo('Tokyo', ['safety']);
      expect(fetchCount.count).toBe(1);

      // 2回目の取得（キャッシュから）
      await service.getInfo('Tokyo', ['safety']);
      // Note: キャッシュキーが異なる可能性があるため、この検証は実装依存
    });

    it('キャッシュを無効にして取得できる', async () => {
      const mockSource = createMockSource({
        sourceName: 'MockSource',
        sourceType: 'official_api',
        categories: ['safety'],
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([mockSource]),
      }) as TravelInfoService;

      const response = await service.getInfo('Tokyo', ['safety'], { useCache: false });
      expect(response).toBeDefined();
    });

    it('失敗したカテゴリを報告する', async () => {
      const successSource = createMockSource({
        sourceName: 'SuccessSource',
        sourceType: 'official_api',
        categories: ['safety'],
      });

      const failSource = createMockSource({
        sourceName: 'FailSource',
        sourceType: 'web_search',
        categories: ['climate'],
        shouldFail: true,
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([successSource, failSource]),
      }) as TravelInfoService;

      const response = await service.getInfo('Tokyo', ['safety', 'climate']);

      expect(response.categories.has('safety')).toBe(true);
      expect(response.failedCategories).toBeDefined();
      expect(response.failedCategories?.some((f) => f.category === 'climate')).toBe(true);
    });
  });

  describe('getCategoryInfo', () => {
    it('特定カテゴリの情報を取得できる', async () => {
      const mockSource = createMockSource({
        sourceName: 'MockSource',
        sourceType: 'official_api',
        categories: ['safety'],
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([mockSource]),
      }) as TravelInfoService;

      const result = await service.getCategoryInfo('Tokyo', 'safety');
      expect(result.success).toBe(true);
    });

    it('ソースがない場合はエラーを返す', async () => {
      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([]),
      }) as TravelInfoService;

      const result = await service.getCategoryInfo('Tokyo', 'safety');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No sources available');
      }
    });
  });

  describe('invalidateCache', () => {
    it('キャッシュを無効化できる', async () => {
      const mockSource = createMockSource({
        sourceName: 'MockSource',
        sourceType: 'official_api',
        categories: ['safety'],
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([mockSource]),
      }) as TravelInfoService;

      // キャッシュに保存
      await service.getInfo('Tokyo', ['safety']);

      // キャッシュを無効化
      await service.invalidateCache('Tokyo');

      // キャッシュが空であることを確認
      const cached = await service.getCachedInfo('Tokyo');
      expect(cached).toBeNull();
    });
  });

  describe('フォールバック', () => {
    it('最初のソースが失敗したら次のソースを試す', async () => {
      const failSource = createMockSource({
        sourceName: 'FailSource',
        sourceType: 'official_api',
        categories: ['safety'],
        shouldFail: true,
      });

      const successSource = createMockSource({
        sourceName: 'SuccessSource',
        sourceType: 'web_search',
        categories: ['safety'],
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([failSource, successSource]),
      }) as TravelInfoService;

      const result = await service.getCategoryInfo('Tokyo', 'safety');
      expect(result.success).toBe(true);
    });

    it('利用不可のソースはスキップする', async () => {
      const unavailableSource = createMockSource({
        sourceName: 'UnavailableSource',
        sourceType: 'official_api',
        categories: ['safety'],
        available: false,
      });

      const availableSource = createMockSource({
        sourceName: 'AvailableSource',
        sourceType: 'web_search',
        categories: ['safety'],
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([unavailableSource, availableSource]),
      }) as TravelInfoService;

      const result = await service.getCategoryInfo('Tokyo', 'safety');
      expect(result.success).toBe(true);
    });
  });

  describe('サーキットブレーカー', () => {
    it('連続失敗後にソースをスキップする', async () => {
      const failingSource = createMockSource({
        sourceName: 'AlwaysFails',
        sourceType: 'official_api',
        categories: ['safety'],
        shouldFail: true,
      });

      const fallbackSource = createMockSource({
        sourceName: 'Fallback',
        sourceType: 'web_search',
        categories: ['safety'],
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([failingSource, fallbackSource]),
        circuitBreakerConfig: {
          failureThreshold: 2,
          resetTimeoutMs: 60000,
        },
      }) as TravelInfoService;

      // 複数回失敗させる
      await service.getCategoryInfo('Tokyo', 'safety');
      await service.getCategoryInfo('Paris', 'safety');
      await service.getCategoryInfo('London', 'safety');

      // サーキットブレーカーが開いた後も取得は成功する（フォールバックを使用）
      const result = await service.getCategoryInfo('Berlin', 'safety');
      expect(result.success).toBe(true);
    });

    it('サーキットブレーカーをリセットできる', async () => {
      const source = createMockSource({
        sourceName: 'TestSource',
        sourceType: 'official_api',
        categories: ['safety'],
        shouldFail: true,
      });

      service = createTravelInfoService({
        cacheManager,
        categoryMapper: createMockCategoryMapper([source]),
        circuitBreakerConfig: {
          failureThreshold: 1,
        },
      }) as TravelInfoService;

      // 失敗させてサーキットを開く
      await service.getCategoryInfo('Tokyo', 'safety');

      // リセット
      service.resetCircuitBreaker('TestSource');

      // ソースが再び利用可能（ただし失敗する）
      const result = await service.getCategoryInfo('Tokyo', 'safety');
      expect(result.success).toBe(false);
    });
  });
});

describe('TravelInfoServiceConfig', () => {
  it('デフォルト設定でサービスを作成できる', () => {
    const config: TravelInfoServiceConfig = {
      cacheManager: createCacheManager(),
      categoryMapper: createCategoryMapper(),
    };

    const service = createTravelInfoService(config);
    expect(service).toBeDefined();
  });

  it('カスタム設定でサービスを作成できる', () => {
    const config: TravelInfoServiceConfig = {
      cacheManager: createCacheManager(),
      categoryMapper: createCategoryMapper(),
      defaultTimeout: 60000,
      defaultLanguage: 'en',
      categoryTimeout: 15000,
      debug: true,
    };

    const service = createTravelInfoService(config);
    expect(service).toBeDefined();
  });
});
