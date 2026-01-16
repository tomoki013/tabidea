/**
 * カテゴリマッパーユーティリティ
 * カテゴリに対応するデータソースを管理・選択
 */

import {
  TravelInfoCategory,
} from '@/lib/types/travel-info';

import { createCountryApiSource } from '../sources/country-api';
import { createExchangeApiSource } from '../sources/exchange-api';
import { createGeminiFallbackSource } from '../sources/gemini-fallback';
import { createMofaApiSource } from '../sources/mofa-api';
import { createWeatherApiSource } from '../sources/weather-api';
import {
  ICategoryMapper,
  ITravelInfoSource,
} from '../interfaces';

/**
 * カテゴリマッパー設定
 */
export interface CategoryMapperConfig {
  /** フォールバックソースを自動的に追加するか */
  autoAddFallback?: boolean;
}

/**
 * カテゴリマッパー実装
 * カテゴリごとにソースを管理し、優先度順に返す
 */
export class CategoryMapper implements ICategoryMapper {
  /**
   * カテゴリごとのソースリスト
   * 優先度順（高い順）に格納
   */
  private sourcesByCategory: Map<TravelInfoCategory, ITravelInfoSource[]> = new Map();

  /**
   * 全ソースのリスト
   */
  private allSources: ITravelInfoSource[] = [];

  private readonly config: CategoryMapperConfig;

  constructor(config: CategoryMapperConfig = {}) {
    this.config = {
      autoAddFallback: true,
      ...config,
    };
  }

  /**
   * カテゴリに適したソースを取得
   * 信頼性スコア順（降順）にソート済み
   */
  getSourcesForCategory(
    destination: string,
    category: TravelInfoCategory
  ): ITravelInfoSource[] {
    const sources = this.sourcesByCategory.get(category) || [];

    // 信頼性スコア順にソート
    return [...sources].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  }

  /**
   * ソースを登録
   */
  registerSource(source: ITravelInfoSource): void {
    this.allSources.push(source);

    // 対応カテゴリごとに登録
    for (const category of source.supportedCategories) {
      const existing = this.sourcesByCategory.get(category) || [];
      existing.push(source);
      this.sourcesByCategory.set(category, existing);
    }

    console.log(
      `[category-mapper] Registered source: ${source.sourceName} ` +
      `(categories: ${source.supportedCategories.join(', ')})`
    );
  }

  /**
   * ソースを登録解除
   */
  unregisterSource(sourceName: string): boolean {
    const sourceIndex = this.allSources.findIndex(
      (s) => s.sourceName === sourceName
    );

    if (sourceIndex === -1) {
      return false;
    }

    const source = this.allSources[sourceIndex];
    this.allSources.splice(sourceIndex, 1);

    // 各カテゴリから削除
    for (const category of source.supportedCategories) {
      const sources = this.sourcesByCategory.get(category) || [];
      const filtered = sources.filter((s) => s.sourceName !== sourceName);
      this.sourcesByCategory.set(category, filtered);
    }

    console.log(`[category-mapper] Unregistered source: ${sourceName}`);
    return true;
  }

  /**
   * 全ソースを取得
   */
  getAllSources(): ITravelInfoSource[] {
    return [...this.allSources];
  }

  /**
   * カテゴリに対応するソースがあるか確認
   */
  hasSourcesForCategory(category: TravelInfoCategory): boolean {
    const sources = this.sourcesByCategory.get(category);
    return sources !== undefined && sources.length > 0;
  }

  /**
   * 登録済みカテゴリ一覧を取得
   */
  getRegisteredCategories(): TravelInfoCategory[] {
    const categories: TravelInfoCategory[] = [];

    for (const [category, sources] of this.sourcesByCategory.entries()) {
      if (sources.length > 0) {
        categories.push(category);
      }
    }

    return categories;
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalSources: number;
    categoryCoverage: Record<TravelInfoCategory, number>;
  } {
    const coverage: Record<TravelInfoCategory, number> = {
      basic: 0,
      safety: 0,
      climate: 0,
      visa: 0,
      manner: 0,
      transport: 0,
      local_food: 0,
      souvenir: 0,
      events: 0,
    };

    for (const [category, sources] of this.sourcesByCategory.entries()) {
      coverage[category] = sources.length;
    }

    return {
      totalSources: this.allSources.length,
      categoryCoverage: coverage,
    };
  }
}

/**
 * カテゴリマッパーのファクトリ関数
 */
export function createCategoryMapper(config?: CategoryMapperConfig): ICategoryMapper {
  return new CategoryMapper(config);
}

/**
 * デフォルトのソースでカテゴリマッパーを初期化
 */
export function createDefaultCategoryMapper(): ICategoryMapper {
  const mapper = new CategoryMapper();

  // デフォルトソースを登録
  mapper.registerSource(createMofaApiSource());
  mapper.registerSource(createWeatherApiSource());
  mapper.registerSource(createExchangeApiSource());
  mapper.registerSource(createCountryApiSource());
  mapper.registerSource(createGeminiFallbackSource());

  return mapper;
}

/**
 * シングルトンインスタンス
 */
let sharedMapper: ICategoryMapper | null = null;

export function getSharedCategoryMapper(): ICategoryMapper {
  if (!sharedMapper) {
    sharedMapper = createDefaultCategoryMapper();
  }
  return sharedMapper;
}
