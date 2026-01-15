/**
 * 渡航情報モジュール
 * Travel Information Module
 *
 * 海外渡航に必要な情報（安全情報、気候、ビザ、マナー等）を
 * 複数のソースから収集・統合して提供
 */

// 型定義
export * from '@/lib/types/travel-info';

// インターフェース
export * from './interfaces';

// メインサービス
export {
  TravelInfoService,
  createTravelInfoService,
  type TravelInfoServiceConfig,
} from './travel-info-service';

// データソース
export {
  MofaApiSource,
  createMofaApiSource,
  type MofaApiConfig,
} from './sources/mofa-api';

export {
  WeatherApiSource,
  createWeatherApiSource,
  type WeatherApiConfig,
} from './sources/weather-api';

export {
  ExchangeApiSource,
  createExchangeApiSource,
  type ExchangeApiConfig,
  type ExchangeRateData,
} from './sources/exchange-api';

export {
  CountryApiSource,
  createCountryApiSource,
  type CountryApiConfig,
} from './sources/country-api';

export {
  GeminiFallbackSource,
  createGeminiFallbackSource,
  type GeminiFallbackConfig,
} from './sources/gemini-fallback';

// キャッシュ
export {
  InMemoryCacheManager,
  createCacheManager,
  getSharedCacheManager,
  type CacheManagerConfig,
} from './cache/cache-manager';

// ユーティリティ
export {
  ReliabilityScorer,
  createReliabilityScorer,
  getSharedReliabilityScorer,
  interpretReliabilityScore,
} from './utils/reliability-scorer';

export {
  CategoryMapper,
  createCategoryMapper,
  createDefaultCategoryMapper,
  getSharedCategoryMapper,
  type CategoryMapperConfig,
} from './utils/category-mapper';

// 便利なファクトリ関数
import { createCacheManager } from './cache/cache-manager';
import { createDefaultCategoryMapper } from './utils/category-mapper';
import { createTravelInfoService } from './travel-info-service';
import { ITravelInfoService } from './interfaces';

/**
 * デフォルト設定でTravelInfoServiceを作成
 */
export function createDefaultTravelInfoService(): ITravelInfoService {
  return createTravelInfoService({
    cacheManager: createCacheManager(),
    categoryMapper: createDefaultCategoryMapper(),
  });
}
