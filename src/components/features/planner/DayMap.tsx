"use client";

import { useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import type { Activity } from "@/types";
import { shouldSkipPlacesSearch } from "@/lib/utils/activity-classifier";

// ============================================================================
// Types
// ============================================================================

interface DayMapProps {
  activities: Activity[];
  dayNumber: number;
  className?: string;
}

interface MarkerData {
  position: { lat: number; lng: number };
  label: string;
  name: string;
  index: number;
}

// ============================================================================
// Component
// ============================================================================

export default function DayMap({
  activities,
  dayNumber,
  className = "",
}: DayMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Collect markers from activities with lat/lng data
  const markers: MarkerData[] = useMemo(() => {
    const result: MarkerData[] = [];
    let spotIndex = 1;

    for (const act of activities) {
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
          index: spotIndex,
        });
        spotIndex++;
      }
    }

    return result;
  }, [activities]);

  // Calculate center and bounds (must be before early return)
  const center = useMemo(() => {
    if (markers.length === 0) return { lat: 0, lng: 0 };
    const avgLat = markers.reduce((sum, m) => sum + m.position.lat, 0) / markers.length;
    const avgLng = markers.reduce((sum, m) => sum + m.position.lng, 0) / markers.length;
    return { lat: avgLat, lng: avgLng };
  }, [markers]);

  // Calculate zoom level based on spread of markers
  const zoom = useMemo(() => {
    if (markers.length <= 1) return 14;

    const lats = markers.map(m => m.position.lat);
    const lngs = markers.map(m => m.position.lng);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread > 5) return 6;
    if (maxSpread > 2) return 8;
    if (maxSpread > 1) return 10;
    if (maxSpread > 0.5) return 11;
    if (maxSpread > 0.1) return 13;
    return 14;
  }, [markers]);

  // Don't render if no valid markers or no API key
  if (!apiKey || markers.length === 0) {
    return null;
  }

  return (
    <div className={`w-full rounded-xl overflow-hidden border border-stone-200 shadow-sm ${className}`}>
      <APIProvider apiKey={apiKey}>
        <div className="relative w-full h-48 sm:h-56 md:h-64">
          <Map
            defaultCenter={center}
            defaultZoom={zoom}
            gestureHandling="cooperative"
            disableDefaultUI={true}
            zoomControl={true}
            mapId="day-map"
            style={{ width: "100%", height: "100%" }}
          >
            {markers.map((marker) => (
              <AdvancedMarker
                key={`day${dayNumber}-marker-${marker.index}`}
                position={marker.position}
                title={marker.name}
              >
                <Pin
                  background="#e67e22"
                  borderColor="#d35400"
                  glyphColor="#fff"
                  glyph={marker.label}
                />
              </AdvancedMarker>
            ))}
          </Map>

          {/* Map Legend */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-stone-600 shadow-sm border border-stone-200/50">
            <span className="font-medium">Day {dayNumber}</span>
            <span className="mx-1.5 text-stone-300">|</span>
            <span>{markers.length} spots</span>
          </div>
        </div>
      </APIProvider>
    </div>
  );
}
