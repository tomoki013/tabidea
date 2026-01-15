/**
 * 渡航情報サービス
 * 複数のデータソースをオーケストレーションして渡航情報を提供
 */

import {
  TravelInfoCategory,
  TravelInfoResponse,
  TravelInfoOptions,
  TravelInfoSource,
  CategoryDataMap,
  CategoryDataEntry,
  ALL_TRAVEL_INFO_CATEGORIES,
} from '@/lib/types/travel-info';

import {
  ITravelInfoService,
  ICacheManager,
  ICategoryMapper,
  SourceResult,
} from './interfaces';

/**
 * 渡航情報サービスの設定
 */
export interface TravelInfoServiceConfig {
  /** キャッシュマネージャー */
  cacheManager: ICacheManager;
  /** カテゴリマッパー */
  categoryMapper: ICategoryMapper;
  /** デフォルトタイムアウト（ミリ秒） */
  defaultTimeout?: number;
  /** デフォルト言語 */
  defaultLanguage?: string;
}

/**
 * 渡航情報サービス実装
 */
export class TravelInfoService implements ITravelInfoService {
  private readonly cacheManager: ICacheManager;
  private readonly categoryMapper: ICategoryMapper;
  private readonly defaultTimeout: number;
  private readonly defaultLanguage: string;

  constructor(config: TravelInfoServiceConfig) {
    this.cacheManager = config.cacheManager;
    this.categoryMapper = config.categoryMapper;
    this.defaultTimeout = config.defaultTimeout ?? 30000;
    this.defaultLanguage = config.defaultLanguage ?? 'ja';
  }

  /**
   * 渡航情報を取得する
   */
  async getInfo(
    destination: string,
    categories: TravelInfoCategory[],
    options?: TravelInfoOptions
  ): Promise<TravelInfoResponse> {
    const useCache = options?.useCache ?? true;
    const cacheKey = this.buildCacheKey(destination, categories);

    // TODO: キャッシュチェック
    if (useCache) {
      const cached = await this.getCachedInfo(destination);
      if (cached) {
        console.log(`[travel-info] Cache hit for ${destination}`);
        return cached;
      }
    }

    console.log(
      `[travel-info] Fetching info for ${destination}, categories: ${categories.join(', ')}`
    );

    // TODO: 各カテゴリのデータを並列取得
    const categoryResults = await this.fetchAllCategories(
      destination,
      categories,
      options
    );

    // TODO: レスポンスを構築
    const response = this.buildResponse(
      destination,
      categoryResults
    );

    // TODO: キャッシュに保存
    if (useCache) {
      await this.cacheManager.set(cacheKey, response, {
        ttlSeconds: 3600, // 1時間
      });
    }

    return response;
  }

  /**
   * キャッシュされた情報を取得する
   */
  async getCachedInfo(destination: string): Promise<TravelInfoResponse | null> {
    const cacheKey = this.buildCacheKey(destination, ALL_TRAVEL_INFO_CATEGORIES);
    const cached = await this.cacheManager.get<TravelInfoResponse>(cacheKey);

    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }

    return null;
  }

  /**
   * キャッシュを無効化する
   */
  async invalidateCache(destination: string): Promise<void> {
    const pattern = `travel-info:${destination}:*`;
    await this.cacheManager.deleteByPattern(pattern);
    console.log(`[travel-info] Cache invalidated for ${destination}`);
  }

  /**
   * 特定カテゴリのみ取得する
   */
  async getCategoryInfo<K extends TravelInfoCategory>(
    destination: string,
    category: K,
    options?: TravelInfoOptions
  ): Promise<SourceResult<CategoryDataMap[K]>> {
    const sources = this.categoryMapper.getSourcesForCategory(destination, category);

    if (sources.length === 0) {
      return {
        success: false,
        error: `No sources available for category: ${category}`,
      };
    }

    // TODO: ソースを優先度順に試行
    for (const source of sources) {
      const isAvailable = await source.isAvailable();
      if (!isAvailable) {
        continue;
      }

      const result = await source.fetch(destination, {
        travelDate: options?.travelDate,
        timeout: options?.timeout ?? this.defaultTimeout,
        language: options?.language ?? this.defaultLanguage,
      });

      if (result.success) {
        return result as SourceResult<CategoryDataMap[K]>;
      }
    }

    return {
      success: false,
      error: `All sources failed for category: ${category}`,
    };
  }

  /**
   * 全カテゴリのデータを並列取得
   */
  private async fetchAllCategories(
    destination: string,
    categories: TravelInfoCategory[],
    options?: TravelInfoOptions
  ): Promise<Map<TravelInfoCategory, CategoryDataEntry>> {
    const results = new Map<TravelInfoCategory, CategoryDataEntry>();

    // TODO: 並列でカテゴリ情報を取得
    const promises = categories.map(async (category) => {
      const result = await this.getCategoryInfo(destination, category, options);
      if (result.success) {
        results.set(category, {
          category,
          data: result.data,
          source: result.source,
        });
      }
    });

    await Promise.allSettled(promises);

    return results;
  }

  /**
   * レスポンスを構築
   */
  private buildResponse(
    destination: string,
    categoryResults: Map<TravelInfoCategory, CategoryDataEntry>
  ): TravelInfoResponse {
    // TODO: 国名を目的地から推測（別途実装）
    const country = this.extractCountry(destination);

    // 使用したソースを収集
    const sources: TravelInfoSource[] = [];
    categoryResults.forEach((entry) => {
      sources.push(entry.source);
    });

    return {
      destination,
      country,
      categories: categoryResults,
      sources,
      generatedAt: new Date(),
      disclaimer:
        '本情報は参考情報です。最新かつ正確な情報は各公式サイトをご確認ください。',
    };
  }

  /**
   * キャッシュキーを構築
   */
  private buildCacheKey(
    destination: string,
    categories: TravelInfoCategory[]
  ): string {
    const sortedCategories = [...categories].sort().join(',');
    return `travel-info:${destination}:${sortedCategories}`;
  }

  /**
   * 目的地から国名を抽出
   * TODO: より高度な実装（ジオコーディングAPI等）
   */
  private extractCountry(destination: string): string {
    // 簡易実装: 目的地が国名を含む場合はそれを使用
    // 実際にはジオコーディングAPIや辞書を使用
    return destination;
  }
}

/**
 * サービスインスタンスを作成するファクトリ関数
 * TODO: 依存性の注入を設定
 */
export function createTravelInfoService(
  config: TravelInfoServiceConfig
): ITravelInfoService {
  return new TravelInfoService(config);
}
