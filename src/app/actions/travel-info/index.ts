'use server';

/**
 * 渡航情報取得サーバーアクション
 * TravelInfoServiceを使用して渡航情報を取得
 */

import type {
  TravelInfoCategory,
  TravelInfoResponse,
  CategoryDataEntry,
  SourceType,
} from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { createDefaultTravelInfoService } from '@/lib/services/travel-info';
import { extractCountryFromDestination } from './country-extractor';
import {
  getSourceName,
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
 * 取得オプション
 */
interface TravelInfoActionOptions {
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
  options?: TravelInfoActionOptions
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

    // TravelInfoServiceのインスタンスを作成
    const service = createDefaultTravelInfoService();

    logInfo('getTravelInfo', 'TravelInfoService呼び出し開始', {
      requestId,
      destination,
      country,
      categories,
    });

    // サービスを使用して情報を取得
    const response = await service.getInfo(destination, categories, {
      travelDate: options?.travelDates ? new Date(options.travelDates.start) : undefined,
      useCache: !options?.forceRefresh,
      country: country, // 抽出した国名をコンテキストとして渡す
    });

    const elapsed = Date.now() - startTime;

    // 成功したカテゴリ数をカウント
    const successCount = response.categories.size;
    const failedCount = response.failedCategories?.length ?? 0;

    logInfo('getTravelInfo', '処理完了', {
      requestId,
      successCount,
      failedCount,
      elapsedMs: elapsed,
    });

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

    // TravelInfoServiceのインスタンスを作成
    const service = createDefaultTravelInfoService();

    // カテゴリ情報を取得
    const result = await service.getCategoryInfo(destination, category, {
      travelDate: options?.travelDates ? new Date(options.travelDates.start) : undefined,
      country: country,
    });

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
