/**
 * 渡航情報ページ用URLユーティリティ
 *
 * URL共有機能の実装
 */

import { type TravelInfoCategory, ALL_TRAVEL_INFO_CATEGORIES } from '@/types';

/**
 * 渡航情報URLパラメータの型定義
 */
export interface TravelInfoUrlParams {
  destination: string;
  categories: TravelInfoCategory[];
  dates?: { start: string; end: string };
}

/**
 * 渡航情報URLをエンコードする
 *
 * @param destination - 目的地
 * @param categories - 選択されたカテゴリ
 * @param dates - 渡航日程（オプション）
 * @returns エンコードされたURLパス
 */
export function encodeTravelInfoUrl(
  destination: string,
  categories: TravelInfoCategory[],
  dates?: { start: string; end: string }
): string {
  // 目的地をURLエンコード
  const encodedDestination = encodeURIComponent(destination);

  // クエリパラメータを構築
  const params = new URLSearchParams();

  if (categories.length > 0) {
    params.set('categories', categories.join(','));
  }

  if (dates?.start && dates?.end) {
    params.set('dates', `${dates.start},${dates.end}`);
  }

  const queryString = params.toString();
  const basePath = `/travel-info/${encodedDestination}`;

  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * URLから渡航情報パラメータをデコードする
 *
 * @param destinationParam - URLパスの目的地部分
 * @param searchParams - URLSearchParamsオブジェクト
 * @returns デコードされたパラメータ
 */
export function decodeTravelInfoUrl(
  destinationParam: string,
  searchParams: URLSearchParams
): TravelInfoUrlParams {
  // 目的地をデコード
  const destination = decodeURIComponent(destinationParam);

  // カテゴリをパース
  const categoriesParam = searchParams.get('categories');
  const categories: TravelInfoCategory[] = categoriesParam
    ? (categoriesParam.split(',').filter((c): c is TravelInfoCategory =>
        ALL_TRAVEL_INFO_CATEGORIES.includes(c as TravelInfoCategory)
      ))
    : ['basic', 'safety']; // デフォルト

  // 日程をパース
  const datesParam = searchParams.get('dates');
  let dates: { start: string; end: string } | undefined;
  if (datesParam) {
    const [start, end] = datesParam.split(',');
    if (start && end) {
      dates = { start, end };
    }
  }

  return { destination, categories, dates };
}

/**
 * 共有可能なフルURLを生成する
 *
 * @param destination - 目的地
 * @param categories - 選択されたカテゴリ
 * @param dates - 渡航日程（オプション）
 * @returns フルURL文字列
 */
export function generateShareableUrl(
  destination: string,
  categories: TravelInfoCategory[],
  dates?: { start: string; end: string }
): string {
  // ブラウザ環境でのみ動作
  if (typeof window === 'undefined') {
    return encodeTravelInfoUrl(destination, categories, dates);
  }

  const path = encodeTravelInfoUrl(destination, categories, dates);
  return `${window.location.origin}${path}`;
}

/**
 * TwitterシェアURLを生成する
 *
 * @param destination - 目的地
 * @param categories - 選択されたカテゴリ
 * @returns Twitter共有URL
 */
export function generateTwitterShareUrl(
  destination: string,
  categories: TravelInfoCategory[]
): string {
  const shareUrl = generateShareableUrl(destination, categories);
  const text = `${destination}の渡航情報をチェック！`;
  const hashtags = 'AI旅行プランナー,渡航情報';

  return `https://twitter.com/intent/tweet?${new URLSearchParams({
    url: shareUrl,
    text,
    hashtags,
  }).toString()}`;
}

/**
 * LINEシェアURLを生成する
 *
 * @param destination - 目的地
 * @param categories - 選択されたカテゴリ
 * @returns LINE共有URL
 */
export function generateLineShareUrl(
  destination: string,
  categories: TravelInfoCategory[]
): string {
  const shareUrl = generateShareableUrl(destination, categories);
  const text = `${destination}の渡航情報 - AI Travel Planner`;

  return `https://social-plugins.line.me/lineit/share?${new URLSearchParams({
    url: shareUrl,
    text,
  }).toString()}`;
}

/**
 * URLをクリップボードにコピーする
 *
 * @param destination - 目的地
 * @param categories - 選択されたカテゴリ
 * @param dates - 渡航日程（オプション）
 * @returns コピー成功の Promise
 */
export async function copyShareUrlToClipboard(
  destination: string,
  categories: TravelInfoCategory[],
  dates?: { start: string; end: string }
): Promise<boolean> {
  try {
    const shareUrl = generateShareableUrl(destination, categories, dates);
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch (error) {
    console.error('Failed to copy URL to clipboard:', error);
    return false;
  }
}

/**
 * URLパラメータからカテゴリリストを取得（サーバーサイド用）
 *
 * @param categoriesParam - カンマ区切りのカテゴリ文字列
 * @returns 有効なカテゴリの配列
 */
export function parseCategoriesParam(
  categoriesParam: string | undefined | null
): TravelInfoCategory[] {
  if (!categoriesParam) {
    return ['basic', 'safety']; // デフォルト
  }

  return categoriesParam
    .split(',')
    .filter((c): c is TravelInfoCategory =>
      ALL_TRAVEL_INFO_CATEGORIES.includes(c as TravelInfoCategory)
    );
}

/**
 * URLパラメータから日程を取得（サーバーサイド用）
 *
 * @param datesParam - カンマ区切りの日程文字列
 * @returns 日程オブジェクトまたはundefined
 */
export function parseDatesParam(
  datesParam: string | undefined | null
): { start: string; end: string } | undefined {
  if (!datesParam) {
    return undefined;
  }

  const [start, end] = datesParam.split(',');

  // 日付形式の簡易バリデーション
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (start && end && dateRegex.test(start) && dateRegex.test(end)) {
    return { start, end };
  }

  return undefined;
}
