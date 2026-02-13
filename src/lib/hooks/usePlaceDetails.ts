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
// Hook
// ============================================

/**
 * スポットの詳細情報を Lazy Loading で取得するフック
 *
 * @param spotName - スポット名
 * @param location - 検索対象の近辺地域（目的地）
 * @param locationEn - 英語の場所名（国際スポット検索のフォールバック用）
 */
export function usePlaceDetails(
  spotName: string,
  location?: string,
  locationEn?: string
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
      const params = new URLSearchParams({ q: spotName });
      if (location) {
        params.append('near', location);
      }
      if (locationEn) {
        params.append('locationEn', locationEn);
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
  }, [spotName, location, locationEn, details, isLoading]);

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
