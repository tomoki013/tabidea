'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { DayPlan } from '@/types';
import { shouldSkipPlacesSearch } from '@/lib/utils/activity-classifier';

// ============================================
// Types
// ============================================

interface SpotCoordinate {
  latitude: number;
  longitude: number;
  placeId?: string;
}

/** 座標データのマップ（スポット名 → 座標） */
export type CoordinatesMap = Map<string, SpotCoordinate>;

export interface UseSpotCoordinatesReturn {
  /** 座標データが注入された日程データ */
  enrichedDays: DayPlan[];
  /** 読み込み中のスポット数 */
  loadingCount: number;
  /** 座標が取得済みのスポット数 */
  resolvedCount: number;
  /** 全スポット数 */
  totalCount: number;
}

// ============================================
// Constants
// ============================================

/** 同時リクエスト数の上限 */
const MAX_CONCURRENT = 5;

/** リクエスト間隔（ミリ秒） */
const REQUEST_INTERVAL_MS = 100;

// ============================================
// Hook
// ============================================

/**
 * 全アクティビティの座標をバッチ取得し、enrichedDays として返すフック
 * MapRouteView や DayMap で座標付きデータを利用可能にする
 */
export function useSpotCoordinates(
  days: DayPlan[],
  destination: string
): UseSpotCoordinatesReturn {
  const [coordinatesMap, setCoordinatesMap] = useState<CoordinatesMap>(new Map());
  const [loadingCount, setLoadingCount] = useState(0);
  const fetchedRef = useRef<Set<string>>(new Set());

  // 対象スポット数
  const totalCount = days.reduce((count, day) => {
    return count + day.activities.filter(act =>
      !shouldSkipPlacesSearch(act.activity, act.description, act.activityType)
    ).length;
  }, 0);

  // 既に座標を持つスポット数
  const alreadyResolved = days.reduce((count, day) => {
    return count + day.activities.filter(act => {
      if (shouldSkipPlacesSearch(act.activity, act.description, act.activityType)) return false;
      return act.validation?.details?.latitude && act.validation?.details?.longitude;
    }).length;
  }, 0);

  const resolvedCount = alreadyResolved + coordinatesMap.size;

  // 座標取得
  useEffect(() => {
    // 取得が必要なスポットを計算
    const spots: Array<{ name: string }> = [];
    for (const day of days) {
      for (const act of day.activities) {
        if (shouldSkipPlacesSearch(act.activity, act.description, act.activityType)) continue;
        // 既に座標があるスポットはスキップ
        if (act.validation?.details?.latitude && act.validation?.details?.longitude) continue;
        // 既に取得済み or 取得中のスポットはスキップ
        if (fetchedRef.current.has(act.activity)) continue;
        spots.push({ name: act.activity });
      }
    }

    if (spots.length === 0) return;

    const controller = new AbortController();

    const fetchCoordinates = async () => {
      let activeCount = 0;

      for (const spot of spots) {
        if (controller.signal.aborted) break;
        if (fetchedRef.current.has(spot.name)) continue;

        fetchedRef.current.add(spot.name);

        // 同時リクエスト数制限
        while (activeCount >= MAX_CONCURRENT) {
          await new Promise(r => setTimeout(r, 50));
          if (controller.signal.aborted) return;
        }

        activeCount++;
        setLoadingCount(prev => prev + 1);

        // 非同期でフェッチ
        (async () => {
          try {
            const params = new URLSearchParams({ q: spot.name });
            if (destination) {
              params.append('near', destination);
            }

            const response = await fetch(`/api/places/search?${params.toString()}`, {
              signal: controller.signal,
            });

            if (!response.ok) return;

            const data = await response.json();

            if (data.success && data.validation?.details) {
              const { latitude, longitude } = data.validation.details;
              if (latitude && longitude) {
                setCoordinatesMap(prev => {
                  const next = new Map(prev);
                  next.set(spot.name, {
                    latitude,
                    longitude,
                    placeId: data.validation.placeId,
                  });
                  return next;
                });
              }
            }
          } catch {
            // フェッチエラーは無視（マップに表示されないだけ）
          } finally {
            activeCount--;
            setLoadingCount(prev => Math.max(0, prev - 1));
          }
        })();

        // リクエスト間隔
        await new Promise(r => setTimeout(r, REQUEST_INTERVAL_MS));
      }
    };

    fetchCoordinates();

    return () => {
      controller.abort();
    };
  }, [days, destination]);

  // enrichedDays を計算: 元のdaysに座標データを注入（useMemo で派生）
  const enrichedDays = useMemo(() => {
    if (coordinatesMap.size === 0) return days;

    return days.map(day => ({
      ...day,
      activities: day.activities.map(act => {
        // 既にvalidation座標がある場合はスキップ
        if (act.validation?.details?.latitude && act.validation?.details?.longitude) {
          return act;
        }

        const coords = coordinatesMap.get(act.activity);
        if (!coords) return act;

        return {
          ...act,
          validation: {
            ...act.validation,
            spotName: act.validation?.spotName || act.activity,
            isVerified: act.validation?.isVerified ?? true,
            confidence: act.validation?.confidence || ('medium' as const),
            source: act.validation?.source || ('google_places' as const),
            placeId: coords.placeId || act.validation?.placeId,
            details: {
              ...act.validation?.details,
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          },
        };
      }),
    }));
  }, [days, coordinatesMap]);

  return {
    enrichedDays,
    loadingCount,
    resolvedCount,
    totalCount,
  };
}
