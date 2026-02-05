"use client";

import { useRef, useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import { MapPin, ExternalLink } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ActivityMapProps {
  /** スポット名 */
  name: string;
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
  /** Place ID (Google Maps リンク用) */
  placeId?: string;
  /** Google Maps URL */
  googleMapsUrl?: string;
  /** クラス名 */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ZOOM = 15;

// ============================================================================
// Component
// ============================================================================

export default function ActivityMap({
  name,
  latitude,
  longitude,
  placeId,
  googleMapsUrl,
  className = "",
}: ActivityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // No API key fallback
  if (!apiKey) {
    return (
      <div
        ref={containerRef}
        className={`bg-stone-100 rounded-lg flex items-center justify-center text-stone-500 h-48 ${className}`}
      >
        <div className="text-center p-4">
          <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">地図を表示するには</p>
          <p className="text-xs">Google Maps API キーが必要です</p>
        </div>
      </div>
    );
  }

  // Generate Google Maps URL
  const mapsUrl =
    googleMapsUrl ||
    (placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Map Container */}
      <div className="h-48 rounded-lg overflow-hidden border border-stone-200">
        {isVisible ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={{ lat: latitude, lng: longitude }}
              defaultZoom={DEFAULT_ZOOM}
              mapId="activity-map"
              gestureHandling="cooperative"
              disableDefaultUI={true}
              zoomControl={true}
              className="w-full h-full"
              style={{ width: "100%", height: "100%" }}
            >
              <AdvancedMarker position={{ lat: latitude, lng: longitude }}>
                <Pin
                  background="#EA580C"
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full bg-stone-100 animate-pulse flex items-center justify-center">
            <MapPin className="w-8 h-8 text-stone-300" />
          </div>
        )}
      </div>

      {/* Google Maps Link Overlay */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-md text-sm font-medium text-stone-700 hover:text-primary hover:bg-white transition-colors border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Google マップで開く
      </a>
    </div>
  );
}
