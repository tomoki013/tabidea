'use server';

/**
 * 渡航情報取得サーバーアクション
 * リファクタリング後：generateObjectを使用してJSON形式を保証
 */

import type {
  TravelInfoCategory,
  TravelInfoResponse,
  TravelInfoSource,
  CategoryDataEntry,
  SourceType,
  FailedCategory,
  AnyCategoryData,
} from '@/lib/types/travel-info';
import { CATEGORY_LABELS } from '@/lib/types/travel-info';
import { getTravelInfoGenerator } from '@/lib/ai/travel-info-generator';
import { extractCountryFromDestination } from './country-extractor';
import {
  getSourceName,
  convertParsedSourcesToTravelInfoSources,
  mergeInfoSources,
  calculateOverallReliability,
  generateDisclaimer,
  sleep,
} from './helpers';
import { logInfo, logWarn, logError, generateRequestId } from './logger';

// ============================================
// 型定義
// ============================================

/**
 * 渡航情報取得結果
 */
export type TravelInfoResult =
  | { success: true; data: TravelInfoResponse }
  | {
      success: false;
      error: string;
      partialData?: Partial<TravelInfoResponse>;
    };

/**
 * カテゴリ別取得結果（内部用）
 */
type CategoryFetchResult =
  | { success: true; data: AnyCategoryData; confidence: number; sources: unknown[] }
  | { success: false; error: string };

/**
 * 取得オプション
 */
interface TravelInfoOptions {
  travelDates?: { start: string; end: string };
  forceRefresh?: boolean;
}

// ============================================
// 定数
// ============================================

const DEFAULT_CATEGORIES: TravelInfoCategory[] = ['basic', 'safety', 'climate'];
const MAX_RETRIES = 2;

// ============================================
// メイン関数
// ============================================

/**
 * 渡航情報を取得するメイン関数
 *
 * @param destination - 目的地（都市名または国名）
 * @param categories - 取得するカテゴリ一覧（デフォルト: basic, safety, climate）
 * @param options - オプション（渡航日程、キャッシュ無視フラグ）
 * @returns 渡航情報の取得結果
 */
export async function getTravelInfo(
  destination: string,
  categories: TravelInfoCategory[] = DEFAULT_CATEGORIES,
  options?: TravelInfoOptions
): Promise<TravelInfoResult> {
  const startTime = Date.now();
  const requestId = generateRequestId();

  logInfo('getTravelInfo', '処理開始', {
    requestId,
    destination,
    categories,
    options,
  });

  // 入力バリデーション
  if (!destination || destination.trim().length === 0) {
    logWarn('getTravelInfo', 'バリデーションエラー: 目的地が空', { requestId });
    return { success: false, error: '目的地を指定してください。' };
  }

  if (categories.length === 0) {
    logWarn('getTravelInfo', 'バリデーションエラー: カテゴリが空', { requestId });
    return { success: false, error: 'カテゴリを1つ以上指定してください。' };
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logError('getTravelInfo', 'APIキーが設定されていません', undefined, { requestId });
    return {
      success: false,
      error: 'システムエラーが発生しました。管理者にお問い合わせください。',
    };
  }

  try {
    // 目的地から国名を抽出
    logInfo('getTravelInfo', '国名抽出開始', { requestId, destination });
    const countryStartTime = Date.now();
    const country = await extractCountryFromDestination(destination);
    logInfo('getTravelInfo', '国名抽出完了', {
      requestId,
      country,
      elapsedMs: Date.now() - countryStartTime,
    });

    // 渡航日程のパース
    const travelDates = options?.travelDates
      ? {
          start: new Date(options.travelDates.start),
          end: new Date(options.travelDates.end),
        }
      : undefined;

    // カテゴリごとに情報を取得
    const categoryResults = new Map<TravelInfoCategory, CategoryFetchResult>();
    const allSources: TravelInfoSource[] = [];
    const confidenceScores: number[] = [];

    logInfo('getTravelInfo', 'カテゴリ情報取得開始', {
      requestId,
      categoriesCount: categories.length,
    });
    const categoryFetchStartTime = Date.now();

    // 並列で全カテゴリの情報を取得
    const fetchPromises = categories.map(async (category) => {
      const categoryStartTime = Date.now();
      logInfo('fetchCategory', `カテゴリ取得開始: ${category}`, {
        requestId,
        category,
        destination,
        country,
      });

      const result = await fetchCategoryInfoWithRetry(
        category,
        destination,
        country,
        travelDates
      );

      const categoryElapsed = Date.now() - categoryStartTime;
      if (result.success) {
        logInfo('fetchCategory', `カテゴリ取得成功: ${category}`, {
          requestId,
          category,
          elapsedMs: categoryElapsed,
          confidence: result.confidence,
        });
      } else {
        logWarn('fetchCategory', `カテゴリ取得失敗: ${category}`, {
          requestId,
          category,
          error: result.error,
          elapsedMs: categoryElapsed,
        });
      }

      return { category, result };
    });

    // Promise.allSettled を使用して、成功・失敗を個別に処理
    const settledResults = await Promise.allSettled(fetchPromises);

    logInfo('getTravelInfo', 'カテゴリ情報取得完了', {
      requestId,
      totalElapsedMs: Date.now() - categoryFetchStartTime,
    });

    // 結果を整理
    let successCount = 0;
    const failedCategoriesInfo: FailedCategory[] = [];

    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        const { category, result } = settledResult.value;
        categoryResults.set(category, result);

        if (result.success) {
          successCount++;
          confidenceScores.push(result.confidence);

          // ソース情報を変換して追加
          if (Array.isArray(result.sources)) {
            const convertedSources = convertParsedSourcesToTravelInfoSources(
              result.sources as { name: string; url: string; type: 'official' | 'news' | 'commercial' | 'personal' }[],
              'ai_generated'
            );
            allSources.push(...convertedSources);
          }
        } else {
          failedCategoriesInfo.push({
            category,
            error: result.error || '情報の取得に失敗しました',
          });
        }
      } else {
        logError('getTravelInfo', 'Promise rejected', settledResult.reason, { requestId });
      }
    }

    // 全カテゴリ失敗の場合
    if (successCount === 0) {
      logError('getTravelInfo', '全カテゴリの取得に失敗', undefined, {
        requestId,
        failedCategories: failedCategoriesInfo.map((fc) => fc.category),
      });
      return {
        success: false,
        error: '渡航情報の取得に失敗しました。しばらく経ってから再度お試しください。',
      };
    }

    // カテゴリデータをMapに変換
    const categoriesMap = new Map<TravelInfoCategory, CategoryDataEntry>();
    for (const [category, result] of categoryResults) {
      if (result.success) {
        categoriesMap.set(category, {
          category,
          data: result.data,
          source: {
            sourceType: 'ai_generated' as SourceType,
            sourceName: getSourceName('ai_generated'),
            retrievedAt: new Date(),
            reliabilityScore: result.confidence,
          },
        });
      }
    }

    // ソースをマージ・重複排除
    const mergedSources = mergeInfoSources(allSources);

    // 総合信頼性を計算
    const overallReliability = calculateOverallReliability(confidenceScores);

    // 免責事項を生成
    const disclaimer = generateDisclaimer(overallReliability, categories);

    const response: TravelInfoResponse = {
      destination,
      country,
      categories: categoriesMap,
      sources: mergedSources,
      generatedAt: new Date(),
      disclaimer,
      ...(failedCategoriesInfo.length > 0 && {
        failedCategories: failedCategoriesInfo,
      }),
    };

    const elapsed = Date.now() - startTime;

    if (successCount < categories.length) {
      logWarn('getTravelInfo', '一部カテゴリの取得に失敗', {
        requestId,
        successCount,
        totalCategories: categories.length,
        failedCategories: failedCategoriesInfo.map((fc) => fc.category),
        elapsedMs: elapsed,
      });
    } else {
      logInfo('getTravelInfo', '処理完了（全カテゴリ成功）', {
        requestId,
        successCount,
        totalCategories: categories.length,
        sourcesCount: mergedSources.length,
        elapsedMs: elapsed,
      });
    }

    return { success: true, data: response };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logError('getTravelInfo', '予期しないエラー発生', error, {
      requestId,
      destination,
      categories,
      elapsedMs: elapsed,
    });
    return {
      success: false,
      error: '予期しないエラーが発生しました。しばらく経ってから再度お試しください。',
    };
  }
}

// ============================================
// カテゴリ情報取得
// ============================================

/**
 * リトライ付きでカテゴリ情報を取得
 */
async function fetchCategoryInfoWithRetry(
  category: TravelInfoCategory,
  destination: string,
  country: string,
  travelDates?: { start: Date; end: Date }
): Promise<CategoryFetchResult> {
  let lastError: string = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const generator = getTravelInfoGenerator();
      const result = await generator.generateCategoryInfo(
        category,
        destination,
        country,
        travelDates
      );

      if (result.success) {
        return {
          success: true,
          data: result.data.content as AnyCategoryData,
          confidence: result.data.confidence,
          sources: result.data.sources,
        };
      }

      lastError = result.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }

    // リトライ前に待機（指数バックオフ）
    if (attempt < MAX_RETRIES - 1) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await sleep(backoffMs);
    }
  }

  return {
    success: false,
    error: lastError || `${category}情報の取得に失敗しました`,
  };
}

// ============================================
// 単一カテゴリ取得API（プログレッシブローディング用）
// ============================================

/**
 * 単一カテゴリ取得結果
 */
export type SingleCategoryResult =
  | {
      success: true;
      category: TravelInfoCategory;
      data: CategoryDataEntry;
      country: string;
    }
  | {
      success: false;
      category: TravelInfoCategory;
      error: string;
    };

/**
 * 単一カテゴリの渡航情報を取得する
 * プログレッシブローディング用：各カテゴリを独立して取得し、逐次表示する
 *
 * @param destination - 目的地（都市名または国名）
 * @param category - 取得するカテゴリ
 * @param options - オプション（渡航日程等）
 * @returns 単一カテゴリの取得結果
 */
export async function getSingleCategoryInfo(
  destination: string,
  category: TravelInfoCategory,
  options?: {
    travelDates?: { start: string; end: string };
    knownCountry?: string;
  }
): Promise<SingleCategoryResult> {
  const startTime = Date.now();
  const requestId = generateRequestId(`single_${category}`);

  logInfo('getSingleCategoryInfo', '処理開始', {
    requestId,
    destination,
    category,
  });

  // 入力バリデーション
  if (!destination || destination.trim().length === 0) {
    logWarn('getSingleCategoryInfo', 'バリデーションエラー: 目的地が空', { requestId });
    return { success: false, category, error: '目的地を指定してください。' };
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    logError('getSingleCategoryInfo', 'APIキーが設定されていません', undefined, { requestId });
    return {
      success: false,
      category,
      error: 'システムエラーが発生しました。',
    };
  }

  try {
    // 目的地から国名を抽出
    let country: string;
    if (options?.knownCountry) {
      country = options.knownCountry;
      logInfo('getSingleCategoryInfo', '国名抽出スキップ（指定あり）', {
        requestId,
        country,
      });
    } else {
      country = await extractCountryFromDestination(destination);
      logInfo('getSingleCategoryInfo', '国名抽出完了', {
        requestId,
        country,
      });
    }

    // 渡航日程のパース
    const travelDates = options?.travelDates
      ? {
          start: new Date(options.travelDates.start),
          end: new Date(options.travelDates.end),
        }
      : undefined;

    // カテゴリ情報を取得
    const result = await fetchCategoryInfoWithRetry(
      category,
      destination,
      country,
      travelDates
    );

    const elapsed = Date.now() - startTime;

    if (result.success) {
      logInfo('getSingleCategoryInfo', '取得成功', {
        requestId,
        category,
        elapsedMs: elapsed,
      });

      return {
        success: true,
        category,
        country,
        data: {
          category,
          data: result.data,
          source: {
            sourceType: 'ai_generated' as SourceType,
            sourceName: getSourceName('ai_generated'),
            retrievedAt: new Date(),
            reliabilityScore: result.confidence,
          },
        },
      };
    } else {
      logWarn('getSingleCategoryInfo', '取得失敗', {
        requestId,
        category,
        error: result.error,
        elapsedMs: elapsed,
      });

      return {
        success: false,
        category,
        error:
          result.error ||
          `${CATEGORY_LABELS[category]}の取得に失敗しました。しばらく経ってから再度お試しください。`,
      };
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logError('getSingleCategoryInfo', '予期しないエラー発生', error, {
      requestId,
      category,
      elapsedMs: elapsed,
    });

    return {
      success: false,
      category,
      error: `${CATEGORY_LABELS[category]}の取得中にエラーが発生しました。`,
    };
  }
}
