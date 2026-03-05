"use client";

/**
 * MapRouteViewRenderer - Tier-based route map factory
 *
 * | Tier            | Provider    | Cost   |
 * |-----------------|-------------|--------|
 * | anonymous/free  | static      | zero   |
 * | pro             | leaflet     | zero   |
 * | premium/admin   | google_maps | paid   |
 */

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MapRouteViewProps } from "./types";
import StaticRouteView from "./StaticRouteView";

function MapLoadingPlaceholder() {
  const t = useTranslations("components.features.planner.mapRoute");
  return (
    <div className="w-full min-h-[300px] bg-stone-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-stone-400 text-sm">{t("mapLoading")}</span>
    </div>
  );
}

// Leaflet is SSR-incompatible, so use dynamic import.
const LeafletRouteView = dynamic(() => import("./LeafletRouteView"), {
  ssr: false,
  loading: () => <MapLoadingPlaceholder />,
});

// Google Maps route view is also loaded dynamically.
const GoogleRouteView = dynamic(
  () => import("../MapRouteView"),
  {
    ssr: false,
    loading: () => <MapLoadingPlaceholder />,
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
