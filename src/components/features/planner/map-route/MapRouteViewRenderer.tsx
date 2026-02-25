"use client";

/**
 * MapRouteViewRenderer — ティア別ルートマップファクトリー
 *
 * | ティア           | プロバイダー  | コスト |
 * |-----------------|-------------|--------|
 * | anonymous/free  | static      | ゼロ   |
 * | pro             | leaflet     | ゼロ   |
 * | premium/admin   | google_maps | 有料   |
 */

import dynamic from "next/dynamic";
import type { MapRouteViewProps } from "./types";
import StaticRouteView from "./StaticRouteView";

// Leaflet は SSR 非対応のため dynamic import
const LeafletRouteView = dynamic(() => import("./LeafletRouteView"), {
  ssr: false,
  loading: () => (
    <div className="w-full min-h-[300px] bg-stone-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-stone-400 text-sm">マップを読み込み中...</span>
    </div>
  ),
});

// Google Maps (既存の MapRouteView) も dynamic import
const GoogleRouteView = dynamic(
  () => import("../MapRouteView"),
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

export default function MapRouteViewRenderer({
  mapProvider,
  days,
  destination,
  className,
}: MapRouteViewProps) {
  switch (mapProvider) {
    case "google_maps":
      return (
        <GoogleRouteView
          days={days}
          destination={destination}
          className={className}
        />
      );

    case "leaflet":
      return (
        <LeafletRouteView
          days={days}
          destination={destination}
          className={className}
        />
      );

    case "static":
    default:
      return (
        <StaticRouteView
          days={days}
          destination={destination}
          className={className}
        />
      );
  }
}
