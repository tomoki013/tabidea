"use client";

/**
 * StaticActivityMap — 静的アクティビティマップ (Anonymous/Free ティア)
 *
 * API不使用。スポット名と座標を表示し、Google Maps への外部リンクを提供。
 */

import { FaMapMarkerAlt, FaExternalLinkAlt } from "react-icons/fa";
import type { ActivityMapBaseProps } from "./types";

export default function StaticActivityMap({
  name,
  latitude,
  longitude,
  placeId,
  googleMapsUrl,
  destination,
  className = "",
}: ActivityMapBaseProps) {
  const searchQuery = destination ? `${name} ${destination}` : name;
  const mapsUrl =
    googleMapsUrl ||
    (placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`);

  return (
    <div className={`relative ${className}`}>
      <div className="h-32 rounded-lg overflow-hidden border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100">
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <FaMapMarkerAlt className="text-primary text-lg mb-2" />
          <p className="text-sm font-medium text-stone-700 line-clamp-1">
            {name}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Google Maps Link */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-md text-xs font-medium text-stone-700 hover:text-primary hover:bg-white transition-colors border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <FaExternalLinkAlt size={10} />
        Google Mapsで見る
      </a>
    </div>
  );
}
