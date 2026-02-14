/**
 * Place Details フック
 * Lazy Loading でスポット詳細を取得
 */

'use client';

import { useState, useCallback } from 'react';
import type { PlaceValidationResult } from '@/types/places';

// ============================================
// Types
// ============================================

export interface UsePlaceDetailsReturn {
  /** 詳細情報 */
  details: PlaceValidationResult | null;
  /** 読み込み中か */
  isLoading: boolean;
  /** エラー */
  error: string | null;
  /** キャッシュから取得したか */
  fromCache: boolean;
  /** 詳細を取得する */
  fetchDetails: () => Promise<void>;
  /** 状態をリセット */
  reset: () => void;
}

// ============================================
// Helpers
// ============================================

/**
 * アクティビティ名からスポット名を抽出するクライアントサイドクリーニング
 * サーバー側でも同様の処理があるが、二重防御として事前にクリーニングする
 */
function cleanSpotName(name: string): string {
  let cleaned = name;

  // 括弧内の補足情報を除去
  cleaned = cleaned.replace(/\s*[（(][^）)]*[）)]\s*/g, '');

  // 先頭の時間参照を除去
  cleaned = cleaned.replace(/^(午前中?|午後|朝|昼|夕方|夜|早朝|深夜)の?/, '');

  // 先頭の順序表現を除去
  cleaned = cleaned.replace(/^(最後|最初|[0-9０-９]+つ目|次|まず)の?/, '');

  // 「〜で + アクション」パターン
  const dePattern = /^(.{2,})で.{0,10}(散策|食べ歩き|体験|見学|観光|参拝|ショッピング|買い物|食事|昼食|夕食|朝食|ランチ|ディナー|休憩|鑑賞|堪能|満喫|探索|巡り|めぐり|探訪|訪問|楽しむ|過ごす|味わう|食べる|見る|買う|遊ぶ|歩く|撮る|学ぶ|触れる).*$/;
  const deMatch = cleaned.match(dePattern);
  if (deMatch) cleaned = deMatch[1];

  // 「〜を + アクション」パターン
  const woPattern = /^(.{2,})を(散策|見学|観光|参拝|探索|巡る|訪れる|訪問|堪能|満喫|楽しむ|味わう|鑑賞|食べる|見る|眺める).*$/;
  const woMatch = cleaned.match(woPattern);
  if (woMatch) cleaned = woMatch[1];

  // 「〜から〜」パターン
  const karaPattern = /^(.{2,})からの?.+$/;
  const karaMatch = cleaned.match(karaPattern);
  if (karaMatch && karaMatch[1].length >= 2) cleaned = karaMatch[1];

  // 末尾のアクション動詞を除去
  const suffixes = [
    '散策', '探索', '観光', '見学', '体験', '参拝', '巡り', 'めぐり',
    '探訪', '訪問', 'ショッピング', '買い物', '食べ歩き',
    '鑑賞', '堪能', '満喫', '散歩', 'ハイキング', 'ツアー',
  ];
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length) {
      cleaned = cleaned.slice(0, -suffix.length);
      break;
    }
  }

  // 先頭の絵文字を除去
  cleaned = cleaned.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\s]+/u, '');

  cleaned = cleaned.trim();
  return cleaned.length >= 2 ? cleaned : name.trim();
}

// ============================================
// Hook
// ============================================

/**
 * スポットの詳細情報を Lazy Loading で取得するフック
 *
 * @param spotName - スポット名
 * @param location - 検索対象の近辺地域（目的地）
 * @param locationEn - 英語の場所名（国際スポット検索のフォールバック用）
 * @param searchQuery - AI生成の検索用クエリ（優先使用）
 */
export function usePlaceDetails(
  spotName: string,
  location?: string,
  locationEn?: string,
  searchQuery?: string
): UsePlaceDetailsReturn {
  const [details, setDetails] = useState<PlaceValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchDetails = useCallback(async () => {
    // すでに取得済みの場合はスキップ
    if (details || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const cleanedName = searchQuery || cleanSpotName(spotName);
      const params = new URLSearchParams({ q: cleanedName });
      if (location) {
        params.append('near', location);
      }
      if (locationEn) {
        params.append('locationEn', locationEn);
      }
      if (searchQuery) {
        params.append('searchQuery', searchQuery);
      }

      const response = await fetch(`/api/places/search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '詳細を取得できませんでした');
      }

      setDetails(data.validation || null);
      setFromCache(data.fromCache || false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '詳細を取得できませんでした';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [spotName, location, locationEn, searchQuery, details, isLoading]);

  const reset = useCallback(() => {
    setDetails(null);
    setIsLoading(false);
    setError(null);
    setFromCache(false);
  }, []);

  return {
    details,
    isLoading,
    error,
    fromCache,
    fetchDetails,
    reset,
  };
}
