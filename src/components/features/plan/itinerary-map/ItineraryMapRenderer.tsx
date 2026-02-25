"use client";

/**
 * ItineraryMapRenderer — ティア別全日程マップファクトリー
 *
 * | ティア           | プロバイダー  | コスト |
 * |-----------------|-------------|--------|
 * | anonymous/free  | static      | ゼロ   |
 * | pro             | leaflet     | ゼロ   |
 * | premium/admin   | google_maps | 有料   |
 */

import dynamic from "next/dynamic";
import type { ItineraryMapRendererProps } from "./types";
import StaticItineraryMap from "./StaticItineraryMap";

// Leaflet は SSR 非対応のため dynamic import
const LeafletItineraryMap = dynamic(
  () => import("./LeafletItineraryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[300px] bg-stone-100 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-stone-400 text-sm">マップを読み込み中...</span>
      </div>
    ),
  },
);

// Google Maps (既存の ItineraryMap) も dynamic import
const GoogleItineraryMap = dynamic(
  () => import("../ItineraryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[300px] bg-stone-100 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-stone-400 text-sm">マップを読み込み中...</span>
      </div>
    ),
  },
);

// ============================================================================
// Component
// ============================================================================

export default function ItineraryMapRenderer({
  mapProvider,
  days,
  destination,
  selectedDay,
  onDaySelect,
  onSpotSelect,
  className,
}: ItineraryMapRendererProps) {
  const baseProps = {
    days,
    destination,
    selectedDay,
    onDaySelect,
    onSpotSelect,
    className,
  };

  switch (mapProvider) {
    case "google_maps":
      return <GoogleItineraryMap {...baseProps} />;

    case "leaflet":
      return <LeafletItineraryMap {...baseProps} />;

    case "static":
    default:
      return <StaticItineraryMap {...baseProps} />;
  }
}
