"use client";

import { useMemo, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import type { Activity } from "@/types";
import { shouldSkipPlacesSearch } from "@/lib/utils/activity-classifier";
import { MapSkeleton } from "@/components/ui/MapSkeleton";
import { FaExternalLinkAlt } from "react-icons/fa";

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
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

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
        <div className="relative w-full h-48 sm:h-56 md:h-64 bg-stone-100">
           {!isMapLoaded && (
              <div className="absolute inset-0 z-10">
                 <MapSkeleton />
              </div>
           )}

          <Map
            defaultCenter={center}
            defaultZoom={zoom}
            gestureHandling="cooperative"
            disableDefaultUI={true}
            zoomControl={true}
            mapId="day-map"
            style={{ width: "100%", height: "100%" }}
            onTilesLoaded={() => setIsMapLoaded(true)}
          >
            {markers.map((marker) => (
              <AdvancedMarker
                key={`day${dayNumber}-marker-${marker.index}`}
                position={marker.position}
                onClick={() => setSelectedMarker(marker)}
              >
                <Pin
                  background="#e67e22"
                  borderColor="#d35400"
                  glyphColor="#fff"
                  glyphText={marker.label}
                />
              </AdvancedMarker>
            ))}

             {selectedMarker && (
                <InfoWindow
                  position={selectedMarker.position}
                  onCloseClick={() => setSelectedMarker(null)}
                  pixelOffset={[0, -30]}
                >
                  <div className="min-w-[180px] p-1">
                     <h3 className="font-bold text-xs text-stone-800 mb-1 line-clamp-2">{selectedMarker.name}</h3>
                     <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedMarker.position.lat},${selectedMarker.position.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline border-t border-stone-100 pt-1 mt-1"
                     >
                        <FaExternalLinkAlt size={8} /> Google Mapsで見る
                     </a>
                  </div>
                </InfoWindow>
             )}
          </Map>

          {/* External Link Button (Day) */}
          <a
             href={`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`}
             target="_blank"
             rel="noopener noreferrer"
             className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1.5 rounded-md shadow-sm text-[10px] font-bold text-stone-600 hover:bg-white hover:text-primary transition-colors flex items-center gap-1 z-10 hover:z-50"
             title="Google Mapsでエリアを見る"
          >
             <FaExternalLinkAlt size={10} />
             <span className="hidden sm:inline">Map</span>
          </a>

          {/* Map Legend */}
          <div className={`absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-stone-600 shadow-sm border border-stone-200/50 transition-opacity duration-300 ${isMapLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <span className="font-medium">Day {dayNumber}</span>
            <span className="mx-1.5 text-stone-300">|</span>
            <span>{markers.length} spots</span>
          </div>
        </div>
      </APIProvider>
    </div>
  );
}
