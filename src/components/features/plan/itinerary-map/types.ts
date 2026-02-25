/**
 * ItineraryMap 共通型定義
 */

import type { DayPlan } from "@/types";
import type { MapProviderType } from "@/lib/limits/config";

// ============================================================================
// Map Spot
// ============================================================================

export interface MapSpot {
  /** スポット名 */
  name: string;
  /** 緯度 */
  lat: number;
  /** 経度 */
  lng: number;
  /** 日数（1-indexed） */
  day: number;
  /** アクティビティインデックス */
  activityIndex: number;
  /** Place ID */
  placeId?: string;
}

// ============================================================================
// Props
// ============================================================================

export interface ItineraryMapBaseProps {
  /** 日程データ */
  days: DayPlan[];
  /** 目的地 */
  destination: string;
  /** 選択中の日 */
  selectedDay?: number;
  /** 日選択時のコールバック */
  onDaySelect?: (day: number) => void;
  /** スポット選択時のコールバック */
  onSpotSelect?: (
    spotName: string,
    day: number,
    activityIndex: number,
  ) => void;
  /** クラス名 */
  className?: string;
}

export interface ItineraryMapRendererProps extends ItineraryMapBaseProps {
  /** マッププロバイダー */
  mapProvider: MapProviderType;
}

// ============================================================================
// Day Colors
// ============================================================================

export const DAY_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6366F1", // indigo
] as const;

export function getDayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

// ============================================================================
// Helper: Extract coordinates
// ============================================================================

export function extractCoordinates(days: DayPlan[]): MapSpot[] {
  const spots: MapSpot[] = [];

  days.forEach((day) => {
    day.activities.forEach((activity, activityIndex) => {
      const validation = activity.validation;
      if (
        validation?.details &&
        "latitude" in validation.details &&
        "longitude" in validation.details
      ) {
        const details = validation.details as {
          latitude?: number;
          longitude?: number;
        };
        if (details.latitude && details.longitude) {
          spots.push({
            name: activity.activity,
            lat: details.latitude,
            lng: details.longitude,
            day: day.day,
            activityIndex,
            placeId: validation.placeId,
          });
        }
      }
    });
  });

  return spots;
}
