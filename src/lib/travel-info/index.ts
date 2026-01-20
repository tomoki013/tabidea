/**
 * 渡航情報モジュール
 * Travel Information Module
 *
 * 海外渡航に必要な情報（安全情報、気候、ビザ、マナー等）を
 * 複数のソースから収集・統合して提供
 */

// 型定義（渡航情報関連のみ再エクスポート）
export type {
  TravelInfoCategory,
  SourceType,
  DangerLevel,
  TravelInfoSource,
  HighRiskRegion,
  SafetyInfo,
  EmergencyContact,
  Embassy,
  ClimateInfo,
  CurrentWeather,
  WeatherForecast,
  BasicCountryInfo,
  Currency,
  ExchangeRate,
  VisaInfo,
  MannerInfo,
  TippingInfo,
  TransportInfo,
  RideshareInfo,
  LocalFoodInfo,
  FoodItem,
  SouvenirInfo,
  SouvenirItem,
  EventsInfo,
  EventItem,
  TechnologyInfo,
  HealthcareInfo,
  RestroomsInfo,
  SmokingInfo,
  AlcoholInfo,
  CategoryDataMap,
  CategoryDataEntry,
  TravelInfoRequest,
  TravelInfoOptions,
  FailedCategory,
  TravelInfoResponse,
  PartialTravelInfo,
  AnyCategoryData,
} from '@/types';

export {
  ALL_TRAVEL_INFO_CATEGORIES,
  CATEGORY_LABELS,
  DANGER_LEVEL_DESCRIPTIONS,
} from '@/types';

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
  CacheManager,
  InMemoryCacheManager,
  createCacheManager,
  getSharedCacheManager,
  resetSharedCacheManager,
  CACHE_TTL_CONFIG,
  type CacheManagerConfig,
  type CacheStrategy,
  type IExtendedCacheManager,
} from './cache/cache-manager';

// キャッシュ設定
export {
  EXCHANGE_RATE_TTL,
  CACHE_KEY_PREFIX,
  MEMORY_CACHE_DEFAULTS,
  FILE_CACHE_DEFAULTS,
  generateCacheKey,
  generateCompositeCacheKey,
  generateCacheKeyPattern,
  normalizeDestination,
  getCategoryTtl,
  getCategoryTtlSeconds,
  createEmptyCacheStats,
  calculateHitRate,
  type CacheStats,
} from './cache/cache-config';

// キャッシュ戦略
export {
  MemoryCache,
  createMemoryCache,
  type MemoryCacheConfig,
} from './cache/strategies/memory-cache';

export {
  FileCache,
  createFileCache,
  type FileCacheConfig,
} from './cache/strategies/file-cache';

export {
  RedisCache,
  createRedisCache,
  isRedisConfigured,
  type RedisCacheConfig,
} from './cache/strategies/redis-cache';

// ユーティリティ - 信頼性スコアリング
export {
  ReliabilityScorer,
  createReliabilityScorer,
  getSharedReliabilityScorer,
  interpretReliabilityScore,
  calculateCrossValidation,
  calculateFieldCrossValidation,
  BASE_RELIABILITY_SCORES,
  EXTENDED_BASE_SCORES,
  RELIABILITY_DISPLAY,
  RELIABILITY_THRESHOLDS,
  type ReliabilityLevel,
  type ReliabilityDisplay,
  type ExtendedReliabilityFactors,
  type ExtendedSourceType,
} from './utils/reliability-scorer';

// ユーティリティ - カテゴリマッパー
export {
  CategoryMapper,
  createCategoryMapper,
  createDefaultCategoryMapper,
  getSharedCategoryMapper,
  type CategoryMapperConfig,
} from './utils/category-mapper';

// ユーティリティ - ソースランカー
export {
  SourceRanker,
  createSourceRanker,
  getSharedSourceRanker,
  executeFallbackChain,
  SOURCE_PRIORITY,
  type SourceRankingOptions,
  type RankedSource,
  type FallbackChainConfig,
  type FallbackResult,
} from './utils/source-ranker';

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
