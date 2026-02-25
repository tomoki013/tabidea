"use client";

/**
 * LeafletRouteView — Leaflet ルート表示 (Pro ティア)
 *
 * react-leaflet + OpenStreetMap によるゼロコストの対話型ルートマップ。
 * 複数日のマーカーを色分け表示し、ルートラインを描画。
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  FaMapMarkedAlt,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
} from "react-icons/fa";
import type { MapRouteViewBaseProps, RouteMarker } from "./types";
import { getDayColor } from "./types";
import { useRouteMarkers } from "./useRouteMarkers";

// ============================================================================
// Leaflet CSS Injection
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

function createDayMarkerIcon(number: string, bgColor: string): L.DivIcon {
  return L.divIcon({
    className: "custom-leaflet-route-marker",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${bgColor};
      border: 2px solid white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// ============================================================================
// FitBounds Controller
// ============================================================================

function FitBoundsController({ markers }: { markers: RouteMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      map.setView(
        [markers[0].position.lat, markers[0].position.lng],
        14,
      );
      return;
    }

    const bounds = L.latLngBounds(
      markers.map(
        (m) => [m.position.lat, m.position.lng] as L.LatLngTuple,
      ),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, markers]);

  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function LeafletRouteView({
  days,
  destination,
  className = "",
}: MapRouteViewBaseProps) {
  useLeafletCSS();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { markers, center } = useRouteMarkers(days);

  // Filter markers by selected day
  const filteredMarkers = useMemo(() => {
    if (selectedDay === null) return markers;
    return markers.filter((m) => m.dayNumber === selectedDay);
  }, [markers, selectedDay]);

  // Route polyline paths (grouped by day)
  const routeLines = useMemo(() => {
    const lines: { path: L.LatLngTuple[]; color: string }[] = [];

    if (selectedDay === null) {
      // Show all days' routes
      const dayGroups = new Map<number, RouteMarker[]>();
      for (const m of markers) {
        const group = dayGroups.get(m.dayNumber) ?? [];
        group.push(m);
        dayGroups.set(m.dayNumber, group);
      }

      for (const [dayNum, group] of dayGroups) {
        const sorted = [...group].sort((a, b) => a.spotIndex - b.spotIndex);
        if (sorted.length >= 2) {
          lines.push({
            path: sorted.map(
              (m) => [m.position.lat, m.position.lng] as L.LatLngTuple,
            ),
            color: getDayColor(dayNum - 1).bg,
          });
        }
      }
    } else {
      const dayMarkers = filteredMarkers
        .filter((m) => m.dayNumber === selectedDay)
        .sort((a, b) => a.spotIndex - b.spotIndex);

      if (dayMarkers.length >= 2) {
        lines.push({
          path: dayMarkers.map(
            (m) => [m.position.lat, m.position.lng] as L.LatLngTuple,
          ),
          color: getDayColor(selectedDay - 1).bg,
        });
      }
    }

    return lines;
  }, [markers, filteredMarkers, selectedDay]);

  // Google Maps URL
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

          {/* Map */}
          <div className="relative w-full min-h-[300px] h-full bg-stone-100">
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={12}
              scrollWheelZoom={false}
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
                  key={`route-${idx}`}
                  positions={line.path}
                  pathOptions={{
                    color: line.color,
                    weight: 4,
                    opacity: 0.8,
                  }}
                />
              ))}

              {/* Markers */}
              {filteredMarkers.map((marker) => {
                const color = getDayColor(marker.dayNumber - 1);
                return (
                  <Marker
                    key={`route-${marker.dayNumber}-${marker.spotIndex}`}
                    position={[marker.position.lat, marker.position.lng]}
                    icon={createDayMarkerIcon(marker.label, color.bg)}
                  >
                    <Popup>
                      <div className="min-w-[180px]">
                        <div
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block text-white mb-1"
                          style={{ backgroundColor: color.bg }}
                        >
                          Day {marker.dayNumber}
                        </div>
                        <h3 className="font-bold text-xs text-stone-800 mb-1">
                          {marker.name}
                        </h3>
                        <a
                          href={
                            marker.placeId
                              ? `https://www.google.com/maps/place/?q=place_id:${marker.placeId}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.name)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline border-t border-stone-100 pt-1 mt-1"
                        >
                          <FaExternalLinkAlt size={8} /> Google Mapsで見る
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              <FitBoundsController markers={filteredMarkers} />
            </MapContainer>

            {/* External Link Button */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs font-bold text-stone-600 hover:bg-white hover:text-primary transition-colors flex items-center gap-2 z-[1000]"
              title="Google Mapsでルートを開く"
            >
              <FaExternalLinkAlt />
              <span className="hidden sm:inline">Google Maps</span>
            </a>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-stone-600 shadow-sm border border-stone-200/50 z-[1000]">
              <span className="font-medium">{destination}</span>
              <span className="mx-1.5 text-stone-300">|</span>
              <span>
                {selectedDay ? `Day ${selectedDay}` : `${days.length}日間`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
