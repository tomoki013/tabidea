'use server';

/**
 * 渡航情報取得サーバーアクション
 *
 * このファイルは後方互換性のためのラッパーです。
 * 内部的には新しいモジュール（./travel-info/index.ts）を使用しています。
 */

import type {
  TravelInfoCategory,
  TravelInfoResponse,
  CategoryDataEntry,
} from '@/lib/types/travel-info';
import {
  getTravelInfo as _getTravelInfo,
  getSingleCategoryInfo as _getSingleCategoryInfo,
} from './travel-info/index';

// ============================================
// 型定義のリエクスポート
// ============================================

export type TravelInfoResult =
  | { success: true; data: TravelInfoResponse }
  | {
      success: false;
      error: string;
      partialData?: Partial<TravelInfoResponse>;
    };

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

// ============================================
// サーバーアクション
// ============================================

/**
 * 渡航情報を取得するメイン関数
 */
export async function getTravelInfo(
  destination: string,
  categories?: TravelInfoCategory[],
  options?: {
    travelDates?: { start: string; end: string };
    forceRefresh?: boolean;
  }
): Promise<TravelInfoResult> {
  return _getTravelInfo(destination, categories, options);
}

/**
 * 単一カテゴリの渡航情報を取得する
 */
export async function getSingleCategoryInfo(
  destination: string,
  category: TravelInfoCategory,
  options?: {
    travelDates?: { start: string; end: string };
    knownCountry?: string;
  }
): Promise<SingleCategoryResult> {
  return _getSingleCategoryInfo(destination, category, options);
}
