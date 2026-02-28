"use client";

/**
 * StaticRouteView — 静的ルート表示 (Anonymous/Free ティア)
 *
 * Google Maps/Leaflet API を使わず、全日程のスポットをリスト形式で表示。
 * ゼロコスト。Google Maps への外部リンクを提供。
 */

import { useState, useMemo, useCallback } from "react";
import {
  FaMapMarkedAlt,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import type { MapRouteViewBaseProps, RouteMarker } from "./types";
import { getDayColor } from "./types";
import { useRouteMarkers } from "./useRouteMarkers";

// ============================================================================
// Component
// ============================================================================

export default function StaticRouteView({
  days,
  destination,
  className = "",
}: MapRouteViewBaseProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { markers } = useRouteMarkers(days);

  // Filter markers by selected day
  const filteredMarkers = useMemo(() => {
    if (selectedDay === null) return markers;
    return markers.filter((m) => m.dayNumber === selectedDay);
  }, [markers, selectedDay]);

  // Google Maps URL for filtered markers
  const googleMapsUrl = useMemo(() => {
    const target = filteredMarkers.length > 0 ? filteredMarkers : markers;
    if (target.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    }
    if (target.length === 1) {
      const m = target[0];
      return m.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${m.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${m.position.lat},${m.position.lng}`;
    }

    const sorted = [...target].sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      return a.spotIndex - b.spotIndex;
    });
    const limited = sorted.slice(0, 25);
    return `https://www.google.com/maps/dir/${limited.map((m) => `${m.position.lat},${m.position.lng}`).join("/")}`;
  }, [filteredMarkers, markers, destination]);

  const handleDayFilter = useCallback((dayNum: number | null) => {
    setSelectedDay((prev) => (prev === dayNum ? null : dayNum));
  }, []);

  // Group markers by day
  const markersByDay = useMemo(() => {
    const map = new Map<number, RouteMarker[]>();
    for (const m of filteredMarkers) {
      const list = map.get(m.dayNumber) ?? [];
      list.push(m);
      map.set(m.dayNumber, list);
    }
    return map;
  }, [filteredMarkers]);

  if (markers.length === 0) return null;

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FaMapMarkedAlt className="text-primary" />
          <span className="font-bold text-sm text-stone-700">
            全日程マップ
          </span>
          <span className="text-xs text-stone-500">
            ({markers.length} spots)
          </span>
        </div>
        {isExpanded ? (
          <FaChevronUp className="text-stone-400 w-3 h-3" />
        ) : (
          <FaChevronDown className="text-stone-400 w-3 h-3" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Day Filter Buttons */}
          <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-stone-100">
            <button
              onClick={() => handleDayFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                selectedDay === null
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              全日程
            </button>
            {days.map((day) => {
              const color = getDayColor(day.day - 1);
              const isActive = selectedDay === day.day;
              return (
                <button
                  key={day.day}
                  onClick={() => handleDayFilter(day.day)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: isActive ? color.bg : `${color.bg}20`,
                    color: isActive ? "#fff" : color.bg,
                  }}
                >
                  Day {day.day}
                </button>
              );
            })}
          </div>

          {/* Spot List */}
          <div className="px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto">
            {Array.from(markersByDay.entries())
              .sort(([a], [b]) => a - b)
              .map(([dayNum, dayMarkers]) => {
                const color = getDayColor(dayNum - 1);
                return (
                  <div key={dayNum}>
                    <div
                      className="text-xs font-bold px-2 py-1 rounded-full inline-block mb-2"
                      style={{
                        backgroundColor: `${color.bg}15`,
                        color: color.bg,
                      }}
                    >
                      Day {dayNum}
                    </div>
                    <div className="space-y-1.5 ml-1">
                      {dayMarkers
                        .sort((a, b) => a.spotIndex - b.spotIndex)
                        .map((marker) => (
                          <div
                            key={`${marker.dayNumber}-${marker.spotIndex}`}
                            className="flex items-center gap-2.5 bg-stone-50 rounded-lg px-3 py-2"
                          >
                            <div
                              className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                              style={{ backgroundColor: color.bg }}
                            >
                              {marker.label}
                            </div>
                            <span className="text-sm text-stone-700 truncate flex-1">
                              {marker.name}
                            </span>
                            <FaMapMarkerAlt
                              className="text-stone-300 shrink-0"
                              size={10}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between">
            <p className="text-[10px] text-stone-400">
              Proプランで対話型マップが利用可能になります
            </p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <FaExternalLinkAlt size={10} />
              Google Mapsで見る
            </a>
          </div>
        </>
      )}
    </div>
  );
}
