/**
 * 渡航情報サービス
 * 複数のデータソースをオーケストレーションして渡航情報を提供
 *
 * 主な機能:
 * - 複数ソースからの並列データ取得
 * - フォールバックチェーンによる冗長性
 * - サーキットブレーカーパターンによる耐障害性
 * - カテゴリ別キャッシュTTL
 * - 信頼性スコアリング
 */

import {
  TravelInfoCategory,
  TravelInfoResponse,
  TravelInfoOptions,
  TravelInfoSource,
  CategoryDataMap,
  CategoryDataEntry,
  FailedCategory,
  ALL_TRAVEL_INFO_CATEGORIES,
} from '@/lib/types/travel-info';

import {
  ITravelInfoService,
  ICacheManager,
  ICategoryMapper,
  ITravelInfoSource,
  SourceResult,
  TravelInfoServiceError,
} from './interfaces';

import { getCategoryTtlSeconds, generateCompositeCacheKey } from './cache/cache-config';
import { ReliabilityScorer, createReliabilityScorer } from './utils/reliability-scorer';
import { SourceRanker, createSourceRanker, executeFallbackChain } from './utils/source-ranker';

// ============================================
// サーキットブレーカー
// ============================================

/**
 * サーキットブレーカーの状態
 */
type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * サーキットブレーカー設定
 */
interface CircuitBreakerConfig {
  /** 失敗閾値（この回数連続で失敗したらオープン） */
  failureThreshold: number;
  /** リセット時間（ミリ秒、オープン後にハーフオープンになるまでの時間） */
  resetTimeoutMs: number;
  /** ハーフオープン時の試行回数 */
  halfOpenAttempts: number;
}

/**
 * サーキットブレーカーの状態
 */
interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  halfOpenSuccesses: number;
}

/**
 * サーキットブレーカークラス
 * 連続した失敗を検知してソースへのアクセスを一時停止
 */
class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private readonly states: Map<string, CircuitBreakerState> = new Map();

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 3,
      resetTimeoutMs: config?.resetTimeoutMs ?? 60000, // 1分
      halfOpenAttempts: config?.halfOpenAttempts ?? 1,
    };
  }

  /**
   * ソースが利用可能かチェック
   */
  isAvailable(sourceId: string): boolean {
    const state = this.getState(sourceId);

    switch (state.state) {
      case 'closed':
        return true;

      case 'open':
        // リセット時間が経過したらハーフオープンに移行
        if (Date.now() - state.lastFailureTime >= this.config.resetTimeoutMs) {
          state.state = 'half-open';
          state.halfOpenSuccesses = 0;
          return true;
        }
        return false;

      case 'half-open':
        return true;
    }
  }

  /**
   * 成功を記録
   */
  recordSuccess(sourceId: string): void {
    const state = this.getState(sourceId);

    if (state.state === 'half-open') {
      state.halfOpenSuccesses++;
      if (state.halfOpenSuccesses >= this.config.halfOpenAttempts) {
        // クローズに戻す
        state.state = 'closed';
        state.failures = 0;
      }
    } else {
      state.failures = 0;
    }
  }

  /**
   * 失敗を記録
   */
  recordFailure(sourceId: string): void {
    const state = this.getState(sourceId);
    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.state === 'half-open') {
      // ハーフオープン時の失敗はすぐにオープンに戻す
      state.state = 'open';
    } else if (state.failures >= this.config.failureThreshold) {
      state.state = 'open';
    }
  }

  /**
   * 状態を取得
   */
  private getState(sourceId: string): CircuitBreakerState {
    if (!this.states.has(sourceId)) {
      this.states.set(sourceId, {
        state: 'closed',
        failures: 0,
        lastFailureTime: 0,
        halfOpenSuccesses: 0,
      });
    }
    return this.states.get(sourceId)!;
  }

  /**
   * 状態をリセット
   */
  reset(sourceId?: string): void {
    if (sourceId) {
      this.states.delete(sourceId);
    } else {
      this.states.clear();
    }
  }
}

// ============================================
// サービス設定
// ============================================

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
  /** カテゴリごとのタイムアウト（ミリ秒） */
  categoryTimeout?: number;
  /** サーキットブレーカー設定 */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  /** デバッグログを出力するか */
  debug?: boolean;
}

// ============================================
// カテゴリ取得結果
// ============================================

interface CategoryFetchResult<T = unknown> {
  category: TravelInfoCategory;
  success: boolean;
  data?: T;
  source?: TravelInfoSource;
  error?: string;
}

// ============================================
// TravelInfoService クラス
// ============================================

/**
 * 渡航情報サービス実装
 */
export class TravelInfoService implements ITravelInfoService {
  private readonly cacheManager: ICacheManager;
  private readonly categoryMapper: ICategoryMapper;
  private readonly defaultTimeout: number;
  private readonly defaultLanguage: string;
  private readonly categoryTimeout: number;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly reliabilityScorer: ReliabilityScorer;
  private readonly sourceRanker: SourceRanker;
  private readonly debug: boolean;

  constructor(config: TravelInfoServiceConfig) {
    this.cacheManager = config.cacheManager;
    this.categoryMapper = config.categoryMapper;
    this.defaultTimeout = config.defaultTimeout ?? 30000;
    this.defaultLanguage = config.defaultLanguage ?? 'ja';
    this.categoryTimeout = config.categoryTimeout ?? 10000;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
    this.reliabilityScorer = createReliabilityScorer();
    this.sourceRanker = createSourceRanker(this.reliabilityScorer);
    this.debug = config.debug ?? false;
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
    const cacheKey = generateCompositeCacheKey(destination, categories);

    // キャッシュチェック
    if (useCache) {
      const cached = await this.getCachedInfo(destination);
      if (cached) {
        this.log(`Cache hit for ${destination}`);
        return cached;
      }
    }

    this.log(`Fetching info for ${destination}, categories: ${categories.join(', ')}`);

    // 各カテゴリのデータを並列取得
    const categoryResults = await this.fetchAllCategories(
      destination,
      categories,
      options
    );

    // レスポンスを構築
    const response = this.buildResponse(
      destination,
      categoryResults.successes,
      categoryResults.failures
    );

    // キャッシュに保存（部分的な成功でも保存）
    if (useCache && categoryResults.successes.size > 0) {
      // カテゴリごとに異なるTTLを使用（最小のTTLを適用）
      const minTtl = this.getMinTtlForCategories([...categoryResults.successes.keys()]);
      await this.cacheManager.set(cacheKey, response, { ttlSeconds: minTtl });
    }

    return response;
  }

  /**
   * キャッシュされた情報を取得する
   */
  async getCachedInfo(destination: string): Promise<TravelInfoResponse | null> {
    const cacheKey = generateCompositeCacheKey(destination, ALL_TRAVEL_INFO_CATEGORIES);
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
    const pattern = `travel-info:${destination.toLowerCase().trim()}:*`;
    await this.cacheManager.deleteByPattern(pattern);
    this.log(`Cache invalidated for ${destination}`);
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

    // ソースをランキング
    const rankedSources = this.sourceRanker.getSourcesForCategory(sources, category);

    // サーキットブレーカーを考慮してソースをフィルタリング
    const availableSources = rankedSources.filter((source) =>
      this.circuitBreaker.isAvailable(source.sourceName)
    );

    if (availableSources.length === 0) {
      return {
        success: false,
        error: `All sources are currently unavailable (circuit breaker open) for category: ${category}`,
      };
    }

    // フォールバックチェーンを実行
    const result = await this.trySourcesWithFallback(
      availableSources,
      destination,
      category,
      options
    );

    if (result.success && result.data && result.source) {
      return {
        success: true,
        data: result.data as CategoryDataMap[K],
        source: result.source,
      };
    }

    return {
      success: false,
      error: result.error ?? `All sources failed for category: ${category}`,
      fallbackUsed: result.fallbackUsed,
      fallbackSource: result.fallbackSource,
    };
  }

  // ============================================
  // 内部メソッド
  // ============================================

  /**
   * 全カテゴリのデータを並列取得
   */
  private async fetchAllCategories(
    destination: string,
    categories: TravelInfoCategory[],
    options?: TravelInfoOptions
  ): Promise<{
    successes: Map<TravelInfoCategory, CategoryDataEntry>;
    failures: FailedCategory[];
  }> {
    const successes = new Map<TravelInfoCategory, CategoryDataEntry>();
    const failures: FailedCategory[] = [];

    // 並列でカテゴリ情報を取得
    const results = await Promise.allSettled(
      categories.map(async (category): Promise<CategoryFetchResult> => {
        try {
          const result = await this.fetchCategoryWithTimeout(
            destination,
            category,
            options
          );
          return {
            category,
            success: result.success,
            data: result.success ? result.data : undefined,
            source: result.success ? result.source : undefined,
            error: result.success ? undefined : result.error,
          };
        } catch (error) {
          return {
            category,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // 結果を処理
    results.forEach((result, index) => {
      const category = categories[index];

      if (result.status === 'fulfilled' && result.value.success) {
        successes.set(category, {
          category,
          data: result.value.data as CategoryDataMap[typeof category],
          source: result.value.source!,
        });
      } else {
        const error =
          result.status === 'fulfilled'
            ? result.value.error
            : result.reason?.message ?? 'Unknown error';
        failures.push({ category, error: error ?? 'Unknown error' });
        this.log(`Failed to fetch ${category}: ${error}`);
      }
    });

    return { successes, failures };
  }

  /**
   * タイムアウト付きでカテゴリ情報を取得
   */
  private async fetchCategoryWithTimeout<K extends TravelInfoCategory>(
    destination: string,
    category: K,
    options?: TravelInfoOptions
  ): Promise<SourceResult<CategoryDataMap[K]>> {
    const timeout = options?.timeout ?? this.categoryTimeout;

    return Promise.race([
      this.getCategoryInfo(destination, category, options),
      new Promise<SourceResult<CategoryDataMap[K]>>((_, reject) =>
        setTimeout(
          () => reject(new TravelInfoServiceError('TIMEOUT', `Timeout fetching ${category}`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * フォールバック付きでソースを試行
   */
  private async trySourcesWithFallback(
    sources: ITravelInfoSource[],
    destination: string,
    category: TravelInfoCategory,
    options?: TravelInfoOptions
  ): Promise<{
    success: boolean;
    data?: unknown;
    source?: TravelInfoSource;
    error?: string;
    fallbackUsed?: boolean;
    fallbackSource?: string;
  }> {
    let fallbackUsed = false;
    let lastSource: ITravelInfoSource | undefined;

    const result = await executeFallbackChain(
      sources,
      async (source) => {
        const isAvailable = await source.isAvailable();
        if (!isAvailable) {
          throw new Error('Source not available');
        }

        lastSource = source;
        fallbackUsed = sources.indexOf(source) > 0;

        const fetchResult = await source.fetch(destination, {
          travelDate: options?.travelDate,
          timeout: options?.timeout ?? this.defaultTimeout,
          language: options?.language ?? this.defaultLanguage,
          country: options?.country,
          additionalParams: { category },
        });

        if (!fetchResult.success) {
          this.circuitBreaker.recordFailure(source.sourceName);
          throw new Error(fetchResult.error);
        }

        this.circuitBreaker.recordSuccess(source.sourceName);
        return fetchResult;
      },
      {
        timeoutMs: this.categoryTimeout,
        onFailure: (source, error) => {
          this.log(`Source ${source.sourceName} failed: ${error.message}`);
        },
      }
    );

    if (result.success && result.data) {
      const successResult = result.data as SourceResult<unknown>;
      if (successResult.success) {
        return {
          success: true,
          data: successResult.data,
          source: successResult.source,
          fallbackUsed,
          fallbackSource: fallbackUsed ? lastSource?.sourceName : undefined,
        };
      }
    }

    return {
      success: false,
      error: result.lastError,
      fallbackUsed,
    };
  }

  /**
   * レスポンスを構築
   */
  private buildResponse(
    destination: string,
    categoryResults: Map<TravelInfoCategory, CategoryDataEntry>,
    failedCategories: FailedCategory[]
  ): TravelInfoResponse {
    const country = this.extractCountry(destination);

    // 使用したソースを収集
    const sources: TravelInfoSource[] = [];
    categoryResults.forEach((entry) => {
      sources.push(entry.source);
    });

    // 信頼性スコアでソートし、最も信頼性の高いソースを先頭に
    const rankedSources = this.reliabilityScorer.rankSources(sources);

    return {
      destination,
      country,
      categories: categoryResults,
      sources: rankedSources,
      generatedAt: new Date(),
      disclaimer:
        '本情報は参考情報です。最新かつ正確な情報は各公式サイトをご確認ください。',
      failedCategories: failedCategories.length > 0 ? failedCategories : undefined,
    };
  }

  /**
   * カテゴリリストの最小TTLを取得（秒）
   */
  private getMinTtlForCategories(categories: TravelInfoCategory[]): number {
    if (categories.length === 0) {
      return 3600; // デフォルト1時間
    }

    return Math.min(...categories.map((cat) => getCategoryTtlSeconds(cat)));
  }

  /**
   * 目的地から国名を抽出
   * TODO: より高度な実装（ジオコーディングAPI等）
   */
  private extractCountry(destination: string): string {
    return destination;
  }

  /**
   * デバッグログを出力
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[travel-info-service] ${message}`);
    }
  }

  // ============================================
  // 管理メソッド
  // ============================================

  /**
   * サーキットブレーカーをリセット
   */
  resetCircuitBreaker(sourceId?: string): void {
    this.circuitBreaker.reset(sourceId);
    this.log(`Circuit breaker reset${sourceId ? ` for ${sourceId}` : ''}`);
  }
}

// ============================================
// ファクトリ関数
// ============================================

/**
 * サービスインスタンスを作成するファクトリ関数
 */
export function createTravelInfoService(
  config: TravelInfoServiceConfig
): ITravelInfoService {
  return new TravelInfoService(config);
}
