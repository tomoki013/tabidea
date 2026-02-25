"use client";

/**
 * StaticItineraryMap — 静的全日程マップ (Anonymous/Free ティア)
 *
 * 全日程のスポットをリスト形式で日別に色分け表示。
 * Google Maps への外部リンクを提供。
 */

import { useState, useMemo, useCallback } from "react";
import { FaMapMarkerAlt, FaExternalLinkAlt } from "react-icons/fa";
import { MapPin } from "lucide-react";
import type { ItineraryMapBaseProps, MapSpot } from "./types";
import { getDayColor, extractCoordinates } from "./types";

// ============================================================================
// Component
// ============================================================================

export default function StaticItineraryMap({
  days,
  destination,
  selectedDay: externalSelectedDay,
  onDaySelect,
  onSpotSelect,
  className = "",
}: ItineraryMapBaseProps) {
  const [internalSelectedDay, setInternalSelectedDay] = useState<
    number | undefined
  >(undefined);

  const selectedDay = externalSelectedDay ?? internalSelectedDay;

  // Extract spots
  const spots = useMemo(() => extractCoordinates(days), [days]);

  // Filter by selected day
  const filteredSpots = useMemo(() => {
    if (!selectedDay) return spots;
    return spots.filter((s) => s.day === selectedDay);
  }, [spots, selectedDay]);

  // Handle day selection
  const handleDaySelect = useCallback(
    (day: number | undefined) => {
      setInternalSelectedDay(day);
      onDaySelect?.(day ?? 0);
    },
    [onDaySelect],
  );

  // Google Maps URL
  const googleMapsUrl = useMemo(() => {
    const target = filteredSpots.length > 0 ? filteredSpots : spots;
    if (target.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    }
    if (target.length === 1) {
      const s = target[0];
      return s.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${s.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
    }

    const sorted = [...target].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.activityIndex - b.activityIndex;
    });
    const limited = sorted.slice(0, 25);
    return `https://www.google.com/maps/dir/${limited.map((s) => `${s.lat},${s.lng}`).join("/")}`;
  }, [filteredSpots, spots, destination]);

  if (spots.length === 0) {
    return (
      <div
        className={`bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 ${className}`}
        style={{ minHeight: "200px" }}
      >
        <div className="text-center p-4">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">位置情報のあるスポットがありません</p>
          <p className="text-xs mt-1 text-stone-400">
            スポットカードを開いて詳細を取得してください
          </p>
        </div>
      </div>
    );
  }

  // Group by day
  const spotsByDay = useMemo(() => {
    const map = new Map<number, MapSpot[]>();
    for (const s of filteredSpots) {
      const list = map.get(s.day) ?? [];
      list.push(s);
      map.set(s.day, list);
    }
    return map;
  }, [filteredSpots]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 ${className}`}
      style={{ minHeight: "300px" }}
    >
      {/* Day Filter Tabs */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1 z-10">
        <button
          onClick={() => handleDaySelect(undefined)}
          className={`px-2 py-1 text-xs rounded-full transition-colors shadow-sm ${
            selectedDay === undefined
              ? "bg-stone-800 text-white"
              : "bg-white/90 text-stone-700 hover:bg-white"
          }`}
        >
          すべて
        </button>
        {Array.from({ length: days.length }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => handleDaySelect(day)}
            className="px-2 py-1 text-xs rounded-full transition-colors shadow-sm"
            style={{
              backgroundColor:
                selectedDay === day
                  ? getDayColor(day)
                  : "rgba(255,255,255,0.9)",
              color: selectedDay === day ? "white" : getDayColor(day),
            }}
          >
            {day}日目
          </button>
        ))}
      </div>

      {/* Spot List */}
      <div className="pt-14 px-4 pb-4 space-y-3 max-h-[500px] overflow-y-auto">
        {Array.from(spotsByDay.entries())
          .sort(([a], [b]) => a - b)
          .map(([dayNum, daySpots]) => {
            const color = getDayColor(dayNum);
            return (
              <div key={dayNum}>
                <div
                  className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1.5"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {dayNum}日目
                </div>
                <div className="space-y-1">
                  {daySpots
                    .sort((a, b) => a.activityIndex - b.activityIndex)
                    .map((spot, idx) => (
                      <button
                        key={`${spot.day}-${spot.activityIndex}`}
                        onClick={() =>
                          onSpotSelect?.(
                            spot.name,
                            spot.day,
                            spot.activityIndex,
                          )
                        }
                        className="w-full flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2 hover:bg-white transition-colors text-left"
                      >
                        <div
                          className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-sm text-stone-700 truncate flex-1">
                          {spot.name}
                        </span>
                        <FaMapMarkerAlt
                          className="text-stone-300 shrink-0"
                          size={10}
                        />
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-stone-100 to-transparent flex items-center justify-between">
        <p className="text-[10px] text-stone-400">
          Proプランで対話型マップが利用可能
        </p>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg shadow-sm text-xs font-bold text-primary hover:bg-white transition-colors"
        >
          <FaExternalLinkAlt size={10} />
          Google Maps
        </a>
      </div>
    </div>
  );
}
