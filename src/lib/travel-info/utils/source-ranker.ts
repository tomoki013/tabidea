/**
 * ソースランカー
 * 情報源のランキングとフォールバック順序を管理
 */

import {
  TravelInfoCategory,
  TravelInfoSource,
  SourceType,
} from '@/lib/types/travel-info';

import { ITravelInfoSource } from '../interfaces';
import { ReliabilityScorer, createReliabilityScorer, ExtendedReliabilityFactors } from './reliability-scorer';

// ============================================
// ソース優先度設定
// ============================================

/**
 * カテゴリ別のソースタイプ優先順位
 * 左から順に優先度が高い
 */
export const SOURCE_PRIORITY: Record<TravelInfoCategory, SourceType[]> = {
  safety: ['official_api', 'web_search', 'ai_generated'],
  climate: ['official_api', 'web_search', 'ai_generated'],
  basic: ['official_api', 'web_search', 'ai_generated'],
  visa: ['official_api', 'web_search', 'ai_generated'],
  manner: ['web_search', 'ai_generated', 'blog'],
  transport: ['official_api', 'web_search', 'ai_generated'],
  local_food: ['web_search', 'ai_generated', 'blog'],
  souvenir: ['web_search', 'ai_generated', 'blog'],
  events: ['official_api', 'web_search', 'ai_generated'],
};

/**
 * ソースタイプの優先度スコア
 */
const SOURCE_TYPE_PRIORITY_SCORE: Record<SourceType, number> = {
  official_api: 100,
  web_search: 60,
  ai_generated: 40,
  blog: 20,
};

// ============================================
// ソースランカークラス
// ============================================

/**
 * ソースランキングのオプション
 */
export interface SourceRankingOptions {
  /** カテゴリ（カテゴリ別優先度を使用する場合） */
  category?: TravelInfoCategory;
  /** 信頼性要因 */
  reliabilityFactors?: ExtendedReliabilityFactors;
  /** 利用可能なソースのみを返すか */
  availableOnly?: boolean;
}

/**
 * ランク付けされたソース情報
 */
export interface RankedSource<T extends ITravelInfoSource = ITravelInfoSource> {
  /** ソースインスタンス */
  source: T;
  /** ランキングスコア */
  score: number;
  /** 優先度順位 */
  rank: number;
  /** 利用可能かどうか */
  available?: boolean;
}

/**
 * ソースランカー
 * 複数の情報源をランキングし、最適な取得順序を決定
 */
export class SourceRanker {
  private readonly reliabilityScorer: ReliabilityScorer;

  constructor(reliabilityScorer?: ReliabilityScorer) {
    this.reliabilityScorer = reliabilityScorer ?? createReliabilityScorer();
  }

  /**
   * ソースをランキング
   * @param sources ソースの配列
   * @param options オプション
   * @returns ランク付けされたソースの配列
   */
  rankSources<T extends ITravelInfoSource>(
    sources: T[],
    options?: SourceRankingOptions
  ): RankedSource<T>[] {
    const category = options?.category;

    const ranked = sources.map((source) => {
      const score = this.calculateSourceScore(source, category, options?.reliabilityFactors);
      return {
        source,
        score,
        rank: 0, // 後で設定
        available: undefined,
      };
    });

    // スコアの降順でソート
    ranked.sort((a, b) => b.score - a.score);

    // ランクを設定
    ranked.forEach((item, index) => {
      item.rank = index + 1;
    });

    return ranked;
  }

  /**
   * 利用可能なソースをランキング
   * @param sources ソースの配列
   * @param options オプション
   * @returns ランク付けされたソースの配列（利用可能なもののみ）
   */
  async rankAvailableSources<T extends ITravelInfoSource>(
    sources: T[],
    options?: SourceRankingOptions
  ): Promise<RankedSource<T>[]> {
    // 全ソースの利用可能性を並列チェック
    const availabilityChecks = await Promise.allSettled(
      sources.map(async (source) => ({
        source,
        available: await source.isAvailable(),
      }))
    );

    const availabilityMap = new Map<T, boolean>();
    availabilityChecks.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        availabilityMap.set(sources[index], result.value.available);
      } else {
        availabilityMap.set(sources[index], false);
      }
    });

    // ランキング計算
    const ranked = this.rankSources(sources, options);

    // 利用可能性情報を追加
    ranked.forEach((item) => {
      item.available = availabilityMap.get(item.source) ?? false;
    });

    // 利用可能なもののみフィルタリング
    if (options?.availableOnly) {
      return ranked.filter((item) => item.available);
    }

    return ranked;
  }

  /**
   * カテゴリに最適なソース順序を取得
   * @param sources 全ソース
   * @param category カテゴリ
   * @returns ソートされたソース配列
   */
  getSourcesForCategory<T extends ITravelInfoSource>(
    sources: T[],
    category: TravelInfoCategory
  ): T[] {
    // カテゴリをサポートするソースのみフィルタリング
    const supportedSources = sources.filter((source) =>
      source.supportedCategories.includes(category)
    );

    // ランキングしてソースのみ返す
    const ranked = this.rankSources(supportedSources, { category });
    return ranked.map((r) => r.source);
  }

  /**
   * TravelInfoSourceをランキング
   * （既に取得済みの情報源データをランキング）
   */
  rankTravelInfoSources(
    sources: TravelInfoSource[],
    factors?: ExtendedReliabilityFactors
  ): TravelInfoSource[] {
    return sources
      .map((source) => ({
        source,
        score: this.reliabilityScorer.calculateScore(source, factors),
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.source);
  }

  /**
   * 最も信頼性の高いソースを取得
   * @param sources ソースの配列
   * @returns 最も信頼性の高いソース
   */
  getBestSource<T extends ITravelInfoSource>(sources: T[]): T | null {
    if (sources.length === 0) {
      return null;
    }

    const ranked = this.rankSources(sources);
    return ranked[0].source;
  }

  // ============================================
  // プライベートメソッド
  // ============================================

  /**
   * ソースのスコアを計算
   */
  private calculateSourceScore(
    source: ITravelInfoSource,
    category?: TravelInfoCategory,
    factors?: ExtendedReliabilityFactors
  ): number {
    let score = 0;

    // 基本信頼性スコア（ソース固有）
    score += source.reliabilityScore;

    // ソースタイプの優先度スコア
    score += SOURCE_TYPE_PRIORITY_SCORE[source.sourceType] ?? 0;

    // カテゴリ別の優先度ボーナス
    if (category) {
      const categoryPriority = SOURCE_PRIORITY[category];
      const typeIndex = categoryPriority.indexOf(source.sourceType);
      if (typeIndex >= 0) {
        // 優先度が高いほどボーナス（最大30点）
        score += (categoryPriority.length - typeIndex) * 10;
      }
    }

    // 信頼性要因による調整
    if (factors) {
      // 簡易的なスコア調整（詳細はReliabilityScorerで計算）
      if (factors.freshness !== undefined) {
        score += factors.freshness * 10;
      }
      if (factors.sourceReputation !== undefined) {
        score += (factors.sourceReputation - 0.5) * 20;
      }
    }

    return score;
  }
}

// ============================================
// フォールバックチェーン
// ============================================

/**
 * フォールバックチェーンの設定
 */
export interface FallbackChainConfig {
  /** 最大試行回数 */
  maxAttempts?: number;
  /** タイムアウト（ミリ秒） */
  timeoutMs?: number;
  /** 失敗時のコールバック */
  onFailure?: (source: ITravelInfoSource, error: Error) => void;
}

/**
 * フォールバック結果
 */
export interface FallbackResult<T> {
  /** 成功したかどうか */
  success: boolean;
  /** 結果データ */
  data?: T;
  /** 使用されたソース */
  source?: ITravelInfoSource;
  /** 試行したソース数 */
  attemptedSources: number;
  /** 最後のエラー */
  lastError?: string;
}

/**
 * フォールバックチェーンを実行
 * 複数のソースを順番に試行し、最初に成功したものを返す
 *
 * @param sources ソースの配列（優先度順）
 * @param fetcher 各ソースに対して実行する関数
 * @param config 設定
 * @returns フォールバック結果
 */
export async function executeFallbackChain<T>(
  sources: ITravelInfoSource[],
  fetcher: (source: ITravelInfoSource) => Promise<T>,
  config?: FallbackChainConfig
): Promise<FallbackResult<T>> {
  const maxAttempts = config?.maxAttempts ?? sources.length;
  let lastError: string | undefined;
  let attemptedSources = 0;

  for (let i = 0; i < Math.min(sources.length, maxAttempts); i++) {
    const source = sources[i];
    attemptedSources++;

    try {
      // タイムアウト付きで実行
      const timeoutMs = config?.timeoutMs ?? 10000;
      const result = await Promise.race([
        fetcher(source),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        ),
      ]);

      return {
        success: true,
        data: result,
        source,
        attemptedSources,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      config?.onFailure?.(source, error instanceof Error ? error : new Error(lastError));
    }
  }

  return {
    success: false,
    attemptedSources,
    lastError,
  };
}

// ============================================
// ファクトリ関数
// ============================================

/**
 * ソースランカーを作成
 */
export function createSourceRanker(reliabilityScorer?: ReliabilityScorer): SourceRanker {
  return new SourceRanker(reliabilityScorer);
}

// ============================================
// シングルトン
// ============================================

let sharedSourceRanker: SourceRanker | null = null;

export function getSharedSourceRanker(): SourceRanker {
  if (!sharedSourceRanker) {
    sharedSourceRanker = createSourceRanker();
  }
  return sharedSourceRanker;
}
