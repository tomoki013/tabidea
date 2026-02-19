"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { DayPlan } from "@/types";
import { shouldSkipPlacesSearch } from "@/lib/utils/activity-classifier";
import { FaMapMarkedAlt, FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";
import { MapSkeleton } from "@/components/ui/MapSkeleton";
import MapErrorBoundary from "@/components/ui/MapErrorBoundary";

// ============================================================================
// Types
// ============================================================================

interface MapRouteViewProps {
  /** All days in the itinerary */
  days: DayPlan[];
  /** Destination name for display */
  destination: string;
  /** Custom class name */
  className?: string;
}

interface DayMarker {
  position: { lat: number; lng: number };
  label: string;
  name: string;
  dayNumber: number;
  spotIndex: number;
  placeId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Day colors for markers */
const DAY_COLORS = [
  { bg: "#e67e22", border: "#d35400" }, // Orange
  { bg: "#3498db", border: "#2980b9" }, // Blue
  { bg: "#2ecc71", border: "#27ae60" }, // Green
  { bg: "#9b59b6", border: "#8e44ad" }, // Purple
  { bg: "#e74c3c", border: "#c0392b" }, // Red
  { bg: "#1abc9c", border: "#16a085" }, // Teal
  { bg: "#f39c12", border: "#e67e22" }, // Yellow
  { bg: "#34495e", border: "#2c3e50" }, // Dark
];

function getDayColor(dayIndex: number) {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}

// ============================================================================
// FitBounds Controller
// ============================================================================

function FitBoundsController({ markers }: { markers: DayMarker[] }) {
  const map = useMap();
  const coreLibrary = useMapsLibrary("core");

  useEffect(() => {
    if (!map || !coreLibrary || markers.length === 0) return;

    if (markers.length === 1) {
      map.setCenter(markers[0].position);
      map.setZoom(14);
      return;
    }

    const bounds = new coreLibrary.LatLngBounds();
    markers.forEach((m) => {
      bounds.extend(m.position);
    });
    map.fitBounds(bounds, 50);
  }, [map, coreLibrary, markers]);

  return null;
}

// ============================================================================
// Route Line Component
// ============================================================================

type PolylineInstance = { setMap: (m: unknown) => void };

function RouteLines({
  markers,
  selectedDay,
}: {
  markers: DayMarker[];
  selectedDay: number | null;
}) {
  const map = useMap();
  const linesRef = useRef<PolylineInstance[]>([]);

  useEffect(() => {
    if (!map) return;
    // Wait for google.maps to be fully available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = window as any;
    if (typeof window === 'undefined' || !g.google?.maps?.Polyline) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gMaps = g.google.maps as { Polyline: new (opts: unknown) => PolylineInstance };

    // Clear existing polylines
    linesRef.current.forEach((line) => line.setMap(null));

    const lines: PolylineInstance[] = [];

    if (selectedDay === null) {
      // Connect all markers sequentially for the whole trip
      const sortedMarkers = [...markers].sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.spotIndex - b.spotIndex;
      });

      if (sortedMarkers.length >= 2) {
        const path = sortedMarkers.map((m) => m.position);

        // Use a neutral color or gradient-like style for the full route
        const polyline = new gMaps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#3b82f6", // Blue
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });
        lines.push(polyline);
      }
    } else {
      // Connect markers within the selected day
      const dayMarkers = markers.filter(m => m.dayNumber === selectedDay)
        .sort((a, b) => a.spotIndex - b.spotIndex);

      if (dayMarkers.length >= 2) {
        const color = getDayColor(selectedDay - 1);
        const path = dayMarkers.map((m) => m.position);

        const polyline = new gMaps.Polyline({
          path,
          geodesic: true,
          strokeColor: color.bg,
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });
        lines.push(polyline);
      }
    }

    linesRef.current = lines;

    return () => {
      lines.forEach((line) => line.setMap(null));
    };
  }, [map, markers, selectedDay]);

  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function MapRouteView({
  days,
  destination,
  className = "",
}: MapRouteViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<DayMarker | null>(null);

  // Collect all markers from all days
  const allMarkers: DayMarker[] = useMemo(() => {
    const result: DayMarker[] = [];

    for (const day of days) {
      let spotIndex = 1;
      for (const act of day.activities) {
        if (shouldSkipPlacesSearch(act.activity, act.description, act.activityType)) {
          continue;
        }

        const lat = act.validation?.details?.latitude;
        const lng = act.validation?.details?.longitude;

        if (lat && lng && lat !== 0 && lng !== 0) {
          result.push({
            position: { lat, lng },
            label: String(spotIndex),
            name: act.activity,
            dayNumber: day.day,
            spotIndex,
            placeId: act.validation?.placeId,
          });
          spotIndex++;
        }
      }
    }

    return result;
  }, [days]);

  // Filter markers by selected day
  const filteredMarkers = useMemo(() => {
    if (selectedDay === null) return allMarkers;
    return allMarkers.filter((m) => m.dayNumber === selectedDay);
  }, [allMarkers, selectedDay]);

  // Calculate center (used as defaultCenter before fitBounds runs)
  const center = useMemo(() => {
    const markers = filteredMarkers.length > 0 ? filteredMarkers : allMarkers;
    if (markers.length === 0) return { lat: 35.6762, lng: 139.6503 }; // Default Tokyo
    const avgLat = markers.reduce((sum, m) => sum + m.position.lat, 0) / markers.length;
    const avgLng = markers.reduce((sum, m) => sum + m.position.lng, 0) / markers.length;
    return { lat: avgLat, lng: avgLng };
  }, [filteredMarkers, allMarkers]);

  const handleDayFilter = useCallback((dayNum: number | null) => {
    setSelectedDay((prev) => (prev === dayNum ? null : dayNum));
    setSelectedMarker(null);
  }, []);

  const getGoogleMapsUrl = useCallback(() => {
    const markers = filteredMarkers.length > 0 ? filteredMarkers : allMarkers;
    if (markers.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    }
    if (markers.length === 1) {
      const m = markers[0];
      return m.placeId
        ? `https://www.google.com/maps/place/?q=place_id:${m.placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${m.position.lat},${m.position.lng}`;
    }

    // Use /maps/dir/ format for reliable multi-stop routing with all pins
    const sorted = [...markers].sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      return a.spotIndex - b.spotIndex;
    });

    // Limit to 25 stops (Google Maps URL limit)
    const limited = sorted.slice(0, 25);
    const stops = limited.map(m => `${m.position.lat},${m.position.lng}`).join('/');
    return `https://www.google.com/maps/dir/${stops}`;
  }, [filteredMarkers, allMarkers, destination]);

  // Don't render if no markers or no API key
  if (!apiKey || allMarkers.length === 0) {
    return null;
  }

  return (
    <div className={`w-full rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white ${className}`}>
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
            ({allMarkers.length} spots)
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
          <MapErrorBoundary className="w-full h-full min-h-[300px]">
            <APIProvider apiKey={apiKey}>
              <div className="relative w-full h-full min-h-[300px] bg-stone-100">

                {!isMapLoaded && (
                  <div className="absolute inset-0 z-10">
                      <MapSkeleton />
                  </div>
                )}

                <GoogleMap
                  defaultCenter={center}
                  defaultZoom={12}
                  gestureHandling="cooperative"
                  disableDefaultUI={true}
                  zoomControl={true}
                  mapId="route-map"
                  style={{ width: "100%", height: "100%" }}
                  onTilesLoaded={() => setIsMapLoaded(true)}
                >
                  {filteredMarkers.map((marker) => {
                    const color = getDayColor(marker.dayNumber - 1);
                    return (
                      <AdvancedMarker
                        key={`route-${marker.dayNumber}-${marker.spotIndex}`}
                        position={marker.position}
                        onClick={() => setSelectedMarker(marker)}
                      >
                        <div className="relative group cursor-pointer transform transition-transform hover:scale-110">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 shadow-md relative z-10"
                            style={{
                              backgroundColor: color.bg,
                              borderColor: color.border,
                            }}
                          >
                            {marker.label}
                          </div>
                          <div
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]"
                            style={{ borderTopColor: color.border }}
                          />
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                  <RouteLines markers={filteredMarkers} selectedDay={selectedDay} />
                  <FitBoundsController markers={filteredMarkers} />

                  {/* Info Window */}
                  {selectedMarker && (
                      <InfoWindow
                          position={selectedMarker.position}
                          onCloseClick={() => setSelectedMarker(null)}
                          pixelOffset={[0, -30]}
                      >
                          <div className="min-w-[200px] p-1">
                              <h3 className="font-bold text-sm text-stone-800 mb-1">{selectedMarker.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                  <span
                                      className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold"
                                      style={{ backgroundColor: getDayColor(selectedMarker.dayNumber - 1).bg }}
                                  >
                                      Day {selectedMarker.dayNumber}
                                  </span>
                              </div>
                              <a
                                  href={
                                    selectedMarker.placeId
                                      ? `https://www.google.com/maps/place/?q=place_id:${selectedMarker.placeId}`
                                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedMarker.name)}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary font-bold flex items-center gap-1 hover:underline border-t border-stone-100 pt-2"
                              >
                                  <FaExternalLinkAlt size={10} /> Google Mapsで見る
                              </a>
                          </div>
                      </InfoWindow>
                  )}
                </GoogleMap>

                {/* External Link Button (Overall) */}
                 <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-12 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs font-bold text-stone-600 hover:bg-white hover:text-primary transition-colors flex items-center gap-2 z-10 hover:z-50"
                    title="Google Mapsでルートを開く"
                    >
                    <FaExternalLinkAlt />
                    <span className="hidden sm:inline">Google Maps</span>
                </a>

                {/* Legend (Only show if map is loaded) */}
                <div className={`absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-stone-600 shadow-sm border border-stone-200/50 transition-opacity duration-300 ${isMapLoaded ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="font-medium">{destination}</span>
                  <span className="mx-1.5 text-stone-300">|</span>
                  <span>
                    {selectedDay ? `Day ${selectedDay}` : `${days.length}日間`}
                  </span>
                </div>
              </div>
            </APIProvider>
          </MapErrorBoundary>
        </>
      )}
    </div>
  );
}
