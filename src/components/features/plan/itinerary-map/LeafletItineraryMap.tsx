"use client";

/**
 * LeafletItineraryMap — Leaflet 全日程マップ (Pro ティア)
 *
 * react-leaflet + OpenStreetMap による全日程対話型マップ。
 * 日別フィルター、色分けマーカー、ルートライン。ゼロコスト。
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Maximize2, Minimize2, Navigation } from "lucide-react";
import type { ItineraryMapBaseProps, MapSpot } from "./types";
import { getDayColor, extractCoordinates } from "./types";

// ============================================================================
// Leaflet CSS
// ============================================================================

function useLeafletCSS() {
  useEffect(() => {
    const id = "leaflet-css";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }, []);
}

// ============================================================================
// Custom Marker Icon
// ============================================================================

function createSpotIcon(number: number, bgColor: string): L.DivIcon {
  return L.divIcon({
    className: "custom-leaflet-itinerary-marker",
    html: `<div style="
      width: 26px; height: 26px;
      background: ${bgColor};
      border: 2px solid white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number + 1}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  });
}

// ============================================================================
// FitBounds Controller
// ============================================================================

function FitBoundsController({ spots }: { spots: MapSpot[] }) {
  const map = useMap();

  useEffect(() => {
    if (spots.length === 0) return;

    if (spots.length === 1) {
      map.setView([spots[0].lat, spots[0].lng], 15);
      return;
    }

    const bounds = L.latLngBounds(
      spots.map((s) => [s.lat, s.lng] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, spots]);

  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function LeafletItineraryMap({
  days,
  destination,
  selectedDay: externalSelectedDay,
  onDaySelect,
  onSpotSelect,
  className = "",
}: ItineraryMapBaseProps) {
  useLeafletCSS();
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalSelectedDay, setInternalSelectedDay] = useState<
    number | undefined
  >(undefined);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDay = externalSelectedDay ?? internalSelectedDay;

  // Extract spots
  const spots = useMemo(() => extractCoordinates(days), [days]);

  // Filter by day
  const visibleSpots = useMemo(() => {
    if (!selectedDay) return spots;
    return spots.filter((s) => s.day === selectedDay);
  }, [spots, selectedDay]);

  // Center
  const center = useMemo(() => {
    if (spots.length === 0) return { lat: 35.6762, lng: 139.6503 };
    const sumLat = spots.reduce((sum, s) => sum + s.lat, 0);
    const sumLng = spots.reduce((sum, s) => sum + s.lng, 0);
    return { lat: sumLat / spots.length, lng: sumLng / spots.length };
  }, [spots]);

  // Route lines by day
  const routeLines = useMemo(() => {
    const lines: { path: L.LatLngTuple[]; color: string }[] = [];
    const dayGroups = new Map<number, MapSpot[]>();

    for (const s of visibleSpots) {
      const group = dayGroups.get(s.day) ?? [];
      group.push(s);
      dayGroups.set(s.day, group);
    }

    for (const [dayNum, group] of dayGroups) {
      const sorted = [...group].sort(
        (a, b) => a.activityIndex - b.activityIndex,
      );
      if (sorted.length >= 2) {
        lines.push({
          path: sorted.map((s) => [s.lat, s.lng] as L.LatLngTuple),
          color: getDayColor(dayNum),
        });
      }
    }

    return lines;
  }, [visibleSpots]);

  // Lazy load
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Day selection
  const handleDaySelect = useCallback(
    (day: number | undefined) => {
      setInternalSelectedDay(day);
      onDaySelect?.(day ?? 0);
    },
    [onDaySelect],
  );

  if (spots.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 ${className}`}
        style={{ minHeight: "200px" }}
      >
        <div className="text-center p-4">
          <p className="text-sm">位置情報のあるスポットがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden ${className} ${
        isExpanded ? "fixed inset-0 z-50" : ""
      }`}
      style={{ minHeight: isExpanded ? "100vh" : "300px" }}
    >
      {isVisible && (
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", minHeight: "300px" }}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route Lines */}
          {routeLines.map((line, idx) => (
            <Polyline
              key={`itinerary-route-${idx}`}
              positions={line.path}
              pathOptions={{
                color: line.color,
                weight: 3,
                opacity: 0.7,
                dashArray: "8, 4",
              }}
            />
          ))}

          {/* Markers */}
          {visibleSpots.map((spot) => {
            const color = getDayColor(spot.day);
            return (
              <Marker
                key={`${spot.day}-${spot.activityIndex}`}
                position={[spot.lat, spot.lng]}
                icon={createSpotIcon(spot.activityIndex, color)}
                eventHandlers={{
                  click: () =>
                    onSpotSelect?.(
                      spot.name,
                      spot.day,
                      spot.activityIndex,
                    ),
                }}
              >
                <Popup>
                  <div className="min-w-[160px] p-1">
                    <div
                      className="text-xs font-medium mb-1 px-1.5 py-0.5 rounded-full inline-block text-white"
                      style={{ backgroundColor: color }}
                    >
                      {spot.day}日目
                    </div>
                    <h3 className="font-bold text-sm text-stone-800 mt-1">
                      {spot.name}
                    </h3>
                    <a
                      href={
                        spot.placeId
                          ? `https://www.google.com/maps/place/?q=place_id:${spot.placeId}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name} ${destination}`)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Navigation className="w-3 h-3" />
                      Google マップで開く
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <FitBoundsController spots={visibleSpots} />
        </MapContainer>
      )}

      {/* Day Filter Tabs */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-[1000]">
        <div className="flex flex-wrap gap-1 pointer-events-auto">
          <button
            onClick={() => handleDaySelect(undefined)}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              selectedDay === undefined
                ? "bg-stone-800 text-white"
                : "bg-white/90 text-stone-700 hover:bg-white"
            } shadow-sm`}
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

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 bg-white/90 rounded-lg shadow-sm hover:bg-white transition-colors pointer-events-auto"
          aria-label={isExpanded ? "縮小" : "拡大"}
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4 text-stone-700" />
          ) : (
            <Maximize2 className="w-4 h-4 text-stone-700" />
          )}
        </button>
      </div>

      {/* Expanded backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
