"use client";

/**
 * MapRenderer — UserType に基づくマップ切替ファクトリー
 *
 * | ティア           | プロバイダー  | コスト |
 * |-----------------|-------------|--------|
 * | anonymous/free  | static      | ゼロ   |
 * | pro             | leaflet     | ゼロ   |
 * | premium/admin   | google_maps | 有料   |
 */

import dynamic from "next/dynamic";
import type { MapRendererProps } from "./types";
import StaticMapView from "./StaticMapView";

// Leaflet は SSR 非対応のため dynamic import
const LeafletMapView = dynamic(() => import("./LeafletMapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 sm:h-56 md:h-64 bg-stone-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-stone-400 text-sm">マップを読み込み中...</span>
    </div>
  ),
});

// Google Maps も dynamic でバンドルサイズ最適化
const GoogleMapView = dynamic(() => import("./GoogleMapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 sm:h-56 md:h-64 bg-stone-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-stone-400 text-sm">マップを読み込み中...</span>
    </div>
  ),
});

// ============================================================================
// Component
// ============================================================================

export default function MapRenderer({
  mapProvider,
  activities,
  dayNumber,
  className,
}: MapRendererProps) {
  switch (mapProvider) {
    case "google_maps":
      return (
        <GoogleMapView
          activities={activities}
          dayNumber={dayNumber}
          className={className}
        />
      );

    case "leaflet":
      return (
        <LeafletMapView
          activities={activities}
          dayNumber={dayNumber}
          className={className}
        />
      );

    case "static":
    default:
      return (
        <StaticMapView
          activities={activities}
          dayNumber={dayNumber}
          className={className}
        />
      );
  }
}
