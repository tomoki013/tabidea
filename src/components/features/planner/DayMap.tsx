"use client";

/**
 * DayMap — 後方互換ラッパー
 *
 * MapRenderer に委譲し、ユーザーのティアに応じたマッププロバイダーを表示する。
 * 新しいコードでは MapRenderer を直接使うこと。
 *
 * @deprecated MapRenderer を直接使用してください
 */

import type { Activity } from "@/types";
import type { MapProviderType } from "@/lib/limits/config";
import { MapRenderer } from "@/components/features/plan/map";

// ============================================================================
// Types
// ============================================================================

interface DayMapProps {
  activities: Activity[];
  dayNumber: number;
  className?: string;
  /** マッププロバイダー (デフォルト: google_maps — 後方互換) */
  mapProvider?: MapProviderType;
}

// ============================================================================
// Component
// ============================================================================

/**
 * @deprecated MapRenderer を直接使用してください
 */
export default function DayMap({
  activities,
  dayNumber,
  className = "",
  mapProvider = "static",
}: DayMapProps) {
  return (
    <MapRenderer
      mapProvider={mapProvider}
      activities={activities}
      dayNumber={dayNumber}
      className={className}
    />
  );
}
