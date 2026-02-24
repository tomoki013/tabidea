"use client";

/**
 * StaticMapView — 静的マップ表示 (Anonymous/Free ティア)
 *
 * Google Maps API を使わず、ピン位置をSVGで表示するゼロコストマップ。
 * 各スポットのリストのみ表示し、座標が見えることをヒントとして伝える。
 */

import { FaMapMarkerAlt, FaExternalLinkAlt } from "react-icons/fa";
import type { MapViewProps } from "./types";
import { useMapMarkers } from "./useMapMarkers";

// ============================================================================
// Component
// ============================================================================

export default function StaticMapView({
  activities,
  dayNumber,
  className = "",
}: MapViewProps) {
  const { markers } = useMapMarkers(activities);

  if (markers.length === 0) return null;

  // Google Maps URL
  const googleMapsUrl =
    markers.length === 1
      ? markers[0].placeId
        ? `https://www.google.com/maps/place/?q=place_id:${markers[0].placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${markers[0].position.lat},${markers[0].position.lng}`
      : `https://www.google.com/maps/dir/${markers
          .sort((a, b) => a.index - b.index)
          .map((m) => `${m.position.lat},${m.position.lng}`)
          .join("/")}`;

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border border-stone-200 shadow-sm ${className}`}
    >
      <div className="relative bg-gradient-to-br from-stone-50 to-stone-100 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-stone-500">
            <FaMapMarkerAlt className="text-primary text-sm" />
            <span className="text-xs font-medium">
              Day {dayNumber} · {markers.length} spots
            </span>
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
          >
            <FaExternalLinkAlt size={8} />
            Google Mapsで見る
          </a>
        </div>

        {/* Spot List */}
        <div className="space-y-1.5">
          {markers.map((marker) => (
            <div
              key={marker.index}
              className="flex items-center gap-2.5 bg-white/60 rounded-lg px-3 py-2"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {marker.label}
              </div>
              <span className="text-sm text-stone-700 truncate flex-1">
                {marker.name}
              </span>
            </div>
          ))}
        </div>

        {/* Upgrade Hint */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-stone-400">
            Proプランで対話型マップが利用可能になります
          </p>
        </div>
      </div>
    </div>
  );
}
