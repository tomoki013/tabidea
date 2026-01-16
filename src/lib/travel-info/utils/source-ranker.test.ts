/**
 * ソースランカーのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SourceRanker,
  createSourceRanker,
  executeFallbackChain,
  SOURCE_PRIORITY,
} from './source-ranker';
import { ITravelInfoSource, SourceResult } from '../interfaces';
import { TravelInfoCategory, TravelInfoSource, AnyCategoryData } from '@/lib/types/travel-info';

// モックソースの作成
function createMockSource(
  config: {
    sourceName: string;
    sourceType: 'official_api' | 'web_search' | 'ai_generated' | 'blog';
    categories: TravelInfoCategory[];
    reliabilityScore?: number;
    available?: boolean;
  }
): ITravelInfoSource {
  return {
    sourceName: config.sourceName,
    sourceType: config.sourceType,
    reliabilityScore: config.reliabilityScore ?? (config.sourceType === 'official_api' ? 95 : 60),
    supportedCategories: config.categories,
    async fetch(): Promise<SourceResult<AnyCategoryData>> {
      return {
        success: true,
        data: { mock: true } as unknown as AnyCategoryData,
        source: {
          sourceType: config.sourceType,
          sourceName: config.sourceName,
          retrievedAt: new Date(),
          reliabilityScore: config.reliabilityScore ?? 80,
        },
      };
    },
    async isAvailable(): Promise<boolean> {
      return config.available ?? true;
    },
  };
}

describe('SourceRanker', () => {
  let ranker: SourceRanker;

  beforeEach(() => {
    ranker = createSourceRanker();
  });

  describe('rankSources', () => {
    it('ソースを信頼性順にランク付けする', () => {
      const sources = [
        createMockSource({
          sourceName: 'LowReliability',
          sourceType: 'blog',
          categories: ['safety'],
          reliabilityScore: 40,
        }),
        createMockSource({
          sourceName: 'HighReliability',
          sourceType: 'official_api',
          categories: ['safety'],
          reliabilityScore: 95,
        }),
        createMockSource({
          sourceName: 'MediumReliability',
          sourceType: 'web_search',
          categories: ['safety'],
          reliabilityScore: 60,
        }),
      ];

      const ranked = ranker.rankSources(sources);

      expect(ranked[0].source.sourceName).toBe('HighReliability');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[2].source.sourceName).toBe('LowReliability');
      expect(ranked[2].rank).toBe(3);
    });

    it('カテゴリ別優先度を考慮してランク付けする', () => {
      const sources = [
        createMockSource({
          sourceName: 'WebSearch',
          sourceType: 'web_search',
          categories: ['safety'],
          reliabilityScore: 70,
        }),
        createMockSource({
          sourceName: 'OfficialAPI',
          sourceType: 'official_api',
          categories: ['safety'],
          reliabilityScore: 70,
        }),
      ];

      const ranked = ranker.rankSources(sources, { category: 'safety' });

      // official_apiが優先される
      expect(ranked[0].source.sourceName).toBe('OfficialAPI');
    });
  });

  describe('rankAvailableSources', () => {
    it('利用可能なソースのみをランク付けする', async () => {
      const sources = [
        createMockSource({
          sourceName: 'Available',
          sourceType: 'official_api',
          categories: ['safety'],
          available: true,
        }),
        createMockSource({
          sourceName: 'Unavailable',
          sourceType: 'official_api',
          categories: ['safety'],
          available: false,
        }),
      ];

      const ranked = await ranker.rankAvailableSources(sources, { availableOnly: true });

      expect(ranked.length).toBe(1);
      expect(ranked[0].source.sourceName).toBe('Available');
    });

    it('利用可能性情報を含める', async () => {
      const sources = [
        createMockSource({
          sourceName: 'Available',
          sourceType: 'official_api',
          categories: ['safety'],
          available: true,
        }),
      ];

      const ranked = await ranker.rankAvailableSources(sources);

      expect(ranked[0].available).toBe(true);
    });
  });

  describe('getSourcesForCategory', () => {
    it('カテゴリに対応するソースのみを返す', () => {
      const sources = [
        createMockSource({
          sourceName: 'SafetySource',
          sourceType: 'official_api',
          categories: ['safety'],
        }),
        createMockSource({
          sourceName: 'ClimateSource',
          sourceType: 'official_api',
          categories: ['climate'],
        }),
        createMockSource({
          sourceName: 'MultiSource',
          sourceType: 'web_search',
          categories: ['safety', 'climate'],
        }),
      ];

      const safetySources = ranker.getSourcesForCategory(sources, 'safety');

      expect(safetySources.length).toBe(2);
      expect(safetySources.some((s) => s.sourceName === 'SafetySource')).toBe(true);
      expect(safetySources.some((s) => s.sourceName === 'MultiSource')).toBe(true);
      expect(safetySources.some((s) => s.sourceName === 'ClimateSource')).toBe(false);
    });
  });

  describe('rankTravelInfoSources', () => {
    it('TravelInfoSourceをランク付けする', () => {
      const sources: TravelInfoSource[] = [
        {
          sourceType: 'blog',
          sourceName: 'Blog',
          retrievedAt: new Date(),
          reliabilityScore: 40,
        },
        {
          sourceType: 'official_api',
          sourceName: 'MOFA',
          retrievedAt: new Date(),
          reliabilityScore: 95,
        },
      ];

      const ranked = ranker.rankTravelInfoSources(sources);

      expect(ranked[0].sourceName).toBe('MOFA');
    });
  });

  describe('getBestSource', () => {
    it('最も信頼性の高いソースを返す', () => {
      const sources = [
        createMockSource({
          sourceName: 'Low',
          sourceType: 'blog',
          categories: ['safety'],
          reliabilityScore: 40,
        }),
        createMockSource({
          sourceName: 'High',
          sourceType: 'official_api',
          categories: ['safety'],
          reliabilityScore: 95,
        }),
      ];

      const best = ranker.getBestSource(sources);
      expect(best?.sourceName).toBe('High');
    });

    it('空の配列ではnullを返す', () => {
      const best = ranker.getBestSource([]);
      expect(best).toBeNull();
    });
  });
});

describe('executeFallbackChain', () => {
  it('最初のソースが成功したら結果を返す', async () => {
    const source = createMockSource({
      sourceName: 'Success',
      sourceType: 'official_api',
      categories: ['safety'],
    });

    const result = await executeFallbackChain(
      [source],
      async () => 'success'
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attemptedSources).toBe(1);
  });

  it('最初のソースが失敗したら次を試す', async () => {
    const failSource = createMockSource({
      sourceName: 'Fail',
      sourceType: 'official_api',
      categories: ['safety'],
    });

    const successSource = createMockSource({
      sourceName: 'Success',
      sourceType: 'web_search',
      categories: ['safety'],
    });

    let callCount = 0;
    const result = await executeFallbackChain(
      [failSource, successSource],
      async (source) => {
        callCount++;
        if (source.sourceName === 'Fail') {
          throw new Error('Fail');
        }
        return 'success';
      }
    );

    expect(result.success).toBe(true);
    expect(result.attemptedSources).toBe(2);
    expect(callCount).toBe(2);
  });

  it('全てのソースが失敗したらエラーを返す', async () => {
    const source1 = createMockSource({
      sourceName: 'Fail1',
      sourceType: 'official_api',
      categories: ['safety'],
    });

    const source2 = createMockSource({
      sourceName: 'Fail2',
      sourceType: 'web_search',
      categories: ['safety'],
    });

    const result = await executeFallbackChain(
      [source1, source2],
      async () => {
        throw new Error('Always fails');
      }
    );

    expect(result.success).toBe(false);
    expect(result.attemptedSources).toBe(2);
    expect(result.lastError).toBe('Always fails');
  });

  it('最大試行回数を制限できる', async () => {
    const sources = [
      createMockSource({ sourceName: 'S1', sourceType: 'official_api', categories: ['safety'] }),
      createMockSource({ sourceName: 'S2', sourceType: 'official_api', categories: ['safety'] }),
      createMockSource({ sourceName: 'S3', sourceType: 'official_api', categories: ['safety'] }),
    ];

    const result = await executeFallbackChain(
      sources,
      async () => {
        throw new Error('Fail');
      },
      { maxAttempts: 2 }
    );

    expect(result.attemptedSources).toBe(2);
  });

  it('失敗時のコールバックを呼び出す', async () => {
    const source = createMockSource({
      sourceName: 'Fail',
      sourceType: 'official_api',
      categories: ['safety'],
    });

    const failures: string[] = [];

    await executeFallbackChain(
      [source],
      async () => {
        throw new Error('Test error');
      },
      {
        onFailure: (s, e) => {
          failures.push(`${s.sourceName}: ${e.message}`);
        },
      }
    );

    expect(failures.length).toBe(1);
    expect(failures[0]).toBe('Fail: Test error');
  });

  it('タイムアウトを適用する', async () => {
    const source = createMockSource({
      sourceName: 'Slow',
      sourceType: 'official_api',
      categories: ['safety'],
    });

    const result = await executeFallbackChain(
      [source],
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return 'success';
      },
      { timeoutMs: 100 }
    );

    expect(result.success).toBe(false);
    expect(result.lastError).toBe('Timeout');
  });
});

describe('SOURCE_PRIORITY', () => {
  it('全カテゴリの優先順位が定義されている', () => {
    const categories: TravelInfoCategory[] = [
      'basic',
      'safety',
      'climate',
      'visa',
      'manner',
      'transport',
    ];

    for (const category of categories) {
      expect(SOURCE_PRIORITY[category]).toBeDefined();
      expect(SOURCE_PRIORITY[category].length).toBeGreaterThan(0);
    }
  });

  it('safetyカテゴリではofficial_apiが最優先', () => {
    expect(SOURCE_PRIORITY.safety[0]).toBe('official_api');
  });

  it('mannerカテゴリではweb_searchが最優先', () => {
    expect(SOURCE_PRIORITY.manner[0]).toBe('web_search');
  });
});
