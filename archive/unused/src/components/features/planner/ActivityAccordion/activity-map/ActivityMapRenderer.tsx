"use client";

/**
 * ActivityMapRenderer — ティア別アクティビティマップファクトリー
 *
 * | ティア           | プロバイダー  | コスト |
 * |-----------------|-------------|--------|
 * | anonymous/free  | static      | ゼロ   |
 * | pro             | leaflet     | ゼロ   |
 * | premium/admin   | google_maps | 有料   |
 */

import dynamic from "next/dynamic";
import type { ActivityMapRendererProps } from "./types";
import StaticActivityMap from "./StaticActivityMap";

// Leaflet は SSR 非対応のため dynamic import
const LeafletActivityMap = dynamic(
  () => import("./LeafletActivityMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 rounded-lg bg-stone-100 animate-pulse flex items-center justify-center">
        <span className="text-stone-400 text-sm">マップを読み込み中...</span>
      </div>
    ),
  },
);

// Google Maps (既存の ActivityMap) も dynamic import
const GoogleActivityMap = dynamic(
  () => import("../ActivityMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 rounded-lg bg-stone-100 animate-pulse flex items-center justify-center">
        <span className="text-stone-400 text-sm">マップを読み込み中...</span>
      </div>
    ),
  },
);

// ============================================================================
// Component
// ============================================================================

export default function ActivityMapRenderer({
  mapProvider,
  name,
  latitude,
  longitude,
  placeId,
  googleMapsUrl,
  destination,
  className,
}: ActivityMapRendererProps) {
  const baseProps = {
    name,
    latitude,
    longitude,
    placeId,
    googleMapsUrl,
    destination,
    className,
  };

  switch (mapProvider) {
    case "google_maps":
      return <GoogleActivityMap {...baseProps} />;

    case "leaflet":
      return <LeafletActivityMap {...baseProps} />;

    case "static":
    default:
      return <StaticActivityMap {...baseProps} />;
  }
}
