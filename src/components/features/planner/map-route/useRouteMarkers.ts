/**
 * useRouteMarkers — DayPlan 配列からルートマーカーを抽出する共通フック
 */

import { useMemo } from "react";
import type { DayPlan } from "@/types";
import type { RouteMarker } from "./types";
import { shouldSkipPlacesSearch } from "@/lib/utils/activity-classifier";

/**
 * DayPlan 配列から有効な座標を持つマーカーを抽出
 */
export function useRouteMarkers(days: DayPlan[]): {
  markers: RouteMarker[];
  center: { lat: number; lng: number };
} {
  const markers = useMemo(() => {
    const result: RouteMarker[] = [];

    for (const day of days) {
      let spotIndex = 1;
      for (const act of day.activities) {
        if (
          shouldSkipPlacesSearch(
            act.activity,
            act.description,
            act.activityType,
          )
        ) {
          continue;
        }

        const lat = act.validation?.details?.latitude;
        const lng = act.validation?.details?.longitude;

        if (lat && lng && lat !== 0 && lng !== 0) {
          result.push({
            position: { lat, lng },
            label: String(spotIndex),
            name: act.activity,
            dayNumber: day.day,
            spotIndex,
            placeId: act.validation?.placeId,
          });
          spotIndex++;
        }
      }
    }

    return result;
  }, [days]);

  const center = useMemo(() => {
    if (markers.length === 0) return { lat: 35.6762, lng: 139.6503 }; // 東京デフォルト
    const avgLat =
      markers.reduce((sum, m) => sum + m.position.lat, 0) / markers.length;
    const avgLng =
      markers.reduce((sum, m) => sum + m.position.lng, 0) / markers.length;
    return { lat: avgLat, lng: avgLng };
  }, [markers]);

  return { markers, center };
}
