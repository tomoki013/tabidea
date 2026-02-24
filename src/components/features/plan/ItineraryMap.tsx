"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { DayPlan } from "@/types";
import { MapPin, Maximize2, Minimize2, Navigation } from "lucide-react";
import MapErrorBoundary from "@/components/ui/MapErrorBoundary";

// ============================================================================
// Types
// ============================================================================

export interface MapSpot {
  /** スポット名 */
  name: string;
  /** 緯度 */
  lat: number;
  /** 経度 */
  lng: number;
  /** 日数（1-indexed） */
  day: number;
  /** アクティビティインデックス */
  activityIndex: number;
  /** Place ID */
  placeId?: string;
}

export interface ItineraryMapProps {
  /** 日程データ */
  days: DayPlan[];
  /** 目的地 */
  destination: string;
  /** 選択中の日 */
  selectedDay?: number;
  /** 日選択時のコールバック */
  onDaySelect?: (day: number) => void;
  /** スポット選択時のコールバック */
  onSpotSelect?: (spotName: string, day: number, activityIndex: number) => void;
  /** クラス名 */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DAY_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6366F1", // indigo
];

const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 }; // Tokyo
const DEFAULT_ZOOM = 12;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * アクティビティから座標を抽出
 */
function extractCoordinates(
  days: DayPlan[]
): MapSpot[] {
  const spots: MapSpot[] = [];

  days.forEach((day) => {
    day.activities.forEach((activity, activityIndex) => {
      // validation.details に緯度経度がある場合
      const validation = activity.validation;
      if (
        validation?.details &&
        'latitude' in validation.details &&
        'longitude' in validation.details
      ) {
        const details = validation.details as { latitude?: number; longitude?: number };
        if (details.latitude && details.longitude) {
          spots.push({
            name: activity.activity,
            lat: details.latitude,
            lng: details.longitude,
            day: day.day,
            activityIndex,
            placeId: validation.placeId,
          });
        }
      }
    });
  });

  return spots;
}

/**
 * 日の色を取得
 */
function getDayColor(day: number): string {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

// ============================================================================
// Sub Components
// ============================================================================

interface MapControlsProps {
  selectedDay?: number;
  totalDays: number;
  onDaySelect: (day: number | undefined) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function MapControls({
  selectedDay,
  totalDays,
  onDaySelect,
  isExpanded,
  onToggleExpand,
}: MapControlsProps) {
  return (
    <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
      {/* Day Filter Tabs */}
      <div className="flex flex-wrap gap-1 pointer-events-auto">
        <button
          onClick={() => onDaySelect(undefined)}
          className={`px-2 py-1 text-xs rounded-full transition-colors ${
            selectedDay === undefined
              ? "bg-stone-800 text-white"
              : "bg-white/90 text-stone-700 hover:bg-white"
          } shadow-sm`}
        >
          すべて
        </button>
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => onDaySelect(day)}
            className={`px-2 py-1 text-xs rounded-full transition-colors shadow-sm`}
            style={{
              backgroundColor:
                selectedDay === day ? getDayColor(day) : "rgba(255,255,255,0.9)",
              color: selectedDay === day ? "white" : getDayColor(day),
            }}
          >
            {day}日目
          </button>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={onToggleExpand}
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
  );
}

interface MarkerClusterProps {
  spots: MapSpot[];
  selectedDay?: number;
  destination: string;
  onSpotClick: (spot: MapSpot) => void;
  selectedSpot: MapSpot | null;
  onInfoWindowClose: () => void;
}

function MarkerCluster({
  spots,
  selectedDay,
  destination,
  onSpotClick,
  selectedSpot,
  onInfoWindowClose,
}: MarkerClusterProps) {
  const filteredSpots = selectedDay
    ? spots.filter((s) => s.day === selectedDay)
    : spots;

  return (
    <>
      {filteredSpots.map((spot, index) => (
        <AdvancedMarker
          key={`${spot.day}-${spot.activityIndex}-${index}`}
          position={{ lat: spot.lat, lng: spot.lng }}
          onClick={() => onSpotClick(spot)}
        >
          <Pin
            background={getDayColor(spot.day)}
            borderColor="#ffffff"
            glyphColor="#ffffff"
          >
            <span className="text-xs font-bold">{spot.activityIndex + 1}</span>
          </Pin>
        </AdvancedMarker>
      ))}

      {/* Info Window */}
      {selectedSpot && (
        <InfoWindow
          position={{ lat: selectedSpot.lat, lng: selectedSpot.lng }}
          onCloseClick={onInfoWindowClose}
        >
          <div className="p-1 max-w-[200px]">
            <div
              className="text-xs font-medium mb-1 px-1.5 py-0.5 rounded-full inline-block text-white"
              style={{ backgroundColor: getDayColor(selectedSpot.day) }}
            >
              {selectedSpot.day}日目
            </div>
            <h3 className="font-bold text-sm text-stone-800 mt-1">
              {selectedSpot.name}
            </h3>
            <a
              href={
                selectedSpot.placeId
                  ? `https://www.google.com/maps/place/?q=place_id:${selectedSpot.placeId}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedSpot.name} ${destination}`)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
            >
              <Navigation className="w-3 h-3" />
              Google マップで開く
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface MapContentProps {
  spots: MapSpot[];
  selectedDay?: number;
  destination: string;
  onSpotSelect?: (spotName: string, day: number, activityIndex: number) => void;
}

function MapContent({ spots, selectedDay, destination, onSpotSelect }: MapContentProps) {
  const map = useMap();
  const coreLibrary = useMapsLibrary("core");
  const [selectedSpot, setSelectedSpot] = useState<MapSpot | null>(null);

  // Fit bounds to visible spots
  useEffect(() => {
    if (!map || !coreLibrary || spots.length === 0) return;

    const visibleSpots = selectedDay
      ? spots.filter((s) => s.day === selectedDay)
      : spots;

    if (visibleSpots.length === 0) return;

    const bounds = new coreLibrary.LatLngBounds();
    visibleSpots.forEach((spot) => {
      bounds.extend({ lat: spot.lat, lng: spot.lng });
    });

    map.fitBounds(bounds, 50);
  }, [map, coreLibrary, spots, selectedDay]);

  const handleSpotClick = useCallback(
    (spot: MapSpot) => {
      setSelectedSpot(spot);
      onSpotSelect?.(spot.name, spot.day, spot.activityIndex);
    },
    [onSpotSelect]
  );

  return (
    <MarkerCluster
      spots={spots}
      selectedDay={selectedDay}
      destination={destination}
      onSpotClick={handleSpotClick}
      selectedSpot={selectedSpot}
      onInfoWindowClose={() => setSelectedSpot(null)}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ItineraryMap({
  days,
  destination,
  selectedDay: externalSelectedDay,
  onDaySelect,
  onSpotSelect,
  className = "",
}: ItineraryMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalSelectedDay, setInternalSelectedDay] = useState<number | undefined>(undefined);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDay = externalSelectedDay ?? internalSelectedDay;

  // Extract spots with coordinates
  const spots = useMemo(() => extractCoordinates(days), [days]);

  // Calculate center from spots or use default
  const center = useMemo(() => {
    if (spots.length === 0) return DEFAULT_CENTER;

    const sumLat = spots.reduce((sum, s) => sum + s.lat, 0);
    const sumLng = spots.reduce((sum, s) => sum + s.lng, 0);

    return {
      lat: sumLat / spots.length,
      lng: sumLng / spots.length,
    };
  }, [spots]);

  // Lazy load map when visible
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Handle day selection
  const handleDaySelect = useCallback(
    (day: number | undefined) => {
      setInternalSelectedDay(day);
      onDaySelect?.(day ?? 0);
    },
    [onDaySelect]
  );

  // No API key warning
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        ref={containerRef}
        className={`bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 ${className}`}
        style={{ minHeight: isExpanded ? "100vh" : "300px" }}
      >
        <div className="text-center p-4">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">地図を表示するには</p>
          <p className="text-sm">Google Maps API キーが必要です</p>
        </div>
      </div>
    );
  }

  // No spots to show
  if (spots.length === 0) {
    return (
      <div
        ref={containerRef}
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

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden ${className} ${
        isExpanded ? "fixed inset-0 z-50" : ""
      }`}
      style={{ minHeight: isExpanded ? "100vh" : "300px" }}
    >
      {isVisible && (
        <MapErrorBoundary className="w-full h-full">
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              defaultZoom={DEFAULT_ZOOM}
              mapId="itinerary-map"
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              className="w-full h-full"
              style={{ width: "100%", height: "100%" }}
            >
              <MapContent
                spots={spots}
                selectedDay={selectedDay}
                destination={destination}
                onSpotSelect={onSpotSelect}
              />
            </Map>
          </APIProvider>
        </MapErrorBoundary>
      )}

      {/* Map Controls */}
      <MapControls
        selectedDay={selectedDay}
        totalDays={days.length}
        onDaySelect={handleDaySelect}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />

      {/* Expanded overlay backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
