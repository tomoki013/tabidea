'use server';

/**
 * 渡航情報取得サーバーアクション
 * リファクタリング後：TravelInfoServiceを使用するように変更
 */

import type {
  TravelInfoCategory,
  TravelInfoResponse,
  CategoryDataEntry,
} from '@/lib/types/travel-info';
import { CATEGORY_LABELS } from '@/lib/types/travel-info';
import { createDefaultTravelInfoService } from '@/lib/travel-info';
import { extractCountryFromDestination } from './country-extractor';
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
 * 取得オプション
 */
interface TravelInfoOptions {
  travelDates?: { start: string; end: string };
  forceRefresh?: boolean;
}

// ============================================
// 定数
// ============================================

const DEFAULT_CATEGORIES: TravelInfoCategory[] = ['basic', 'safety'];

// ============================================
// メイン関数
// ============================================

/**
 * 渡航情報を取得するメイン関数
 *
 * @param destination - 目的地（都市名または国名）
 * @param categories - 取得するカテゴリ一覧（デフォルト: basic, safety）
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

  try {
    // サービスインスタンスの作成
    const service = createDefaultTravelInfoService();

    // 渡航日程のパース
    const travelDates = options?.travelDates
      ? {
          start: new Date(options.travelDates.start),
          end: new Date(options.travelDates.end),
        }
      : undefined;

    // TravelInfoServiceを使用して情報を取得
    const result = await service.getInfo(destination, categories, {
      travelDate: travelDates?.start, // 開始日を使用
      useCache: !options?.forceRefresh,
    });

    const elapsed = Date.now() - startTime;

    logInfo('getTravelInfo', '処理完了', {
      requestId,
      destination,
      elapsedMs: elapsed,
      successCount: result.categories.size,
      totalCategories: categories.length,
    });

    return { success: true, data: result };
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

    // サービスインスタンスの作成
    const service = createDefaultTravelInfoService();

    // 渡航日程のパース
    const travelDates = options?.travelDates
      ? {
          start: new Date(options.travelDates.start),
          end: new Date(options.travelDates.end),
        }
      : undefined;

    // 単一カテゴリの情報を取得
    // Note: service.getCategoryInfoはSourceResultを返すため、CategoryDataEntryに変換が必要
    const result = await service.getCategoryInfo(destination, category, {
      travelDate: travelDates?.start,
    });

    const elapsed = Date.now() - startTime;

    if (result.success && result.data && result.source) {
      logInfo('getSingleCategoryInfo', '取得成功', {
        requestId,
        category,
        elapsedMs: elapsed,
        source: result.source.sourceName,
      });

      return {
        success: true,
        category,
        country,
        data: {
          category,
          data: result.data,
          source: result.source,
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
