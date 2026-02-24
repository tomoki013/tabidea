"use client";

/**
 * LeafletMapView — Leaflet + OpenStreetMap マップ (Pro ティア)
 *
 * ゼロコストの対話型マップ。react-leaflet を使用。
 * SSR を避けるため dynamic import で使用すること。
 */

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { FaExternalLinkAlt } from "react-icons/fa";
import type { MapViewProps } from "./types";
import type { MapMarker } from "./types";
import { useMapMarkers } from "./useMapMarkers";

// ============================================================================
// Leaflet CSS (インライン注入)
// ============================================================================

// Leaflet CSS はヘッダーに link タグを追加して読み込む
// (Next.js の dynamic import 環境では import 'leaflet/dist/leaflet.css' が不安定)
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

function createNumberedIcon(number: string): L.DivIcon {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `<div style="
      width: 28px; height: 28px;
      background: #e67e22;
      border: 2px solid #d35400;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 12px; font-weight: bold;
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

function FitBoundsController({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      map.setView(
        [markers[0].position.lat, markers[0].position.lng],
        15,
      );
      return;
    }

    const bounds = L.latLngBounds(
      markers.map((m) => [m.position.lat, m.position.lng] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, markers]);

  return null;
}

// ============================================================================
// Component
// ============================================================================

export default function LeafletMapView({
  activities,
  dayNumber,
  className = "",
}: MapViewProps) {
  useLeafletCSS();
  const { markers, center } = useMapMarkers(activities);

  if (markers.length === 0) return null;

  // Google Maps URL
  const googleMapsUrl =
    markers.length === 1
      ? `https://www.google.com/maps/search/?api=1&query=${markers[0].position.lat},${markers[0].position.lng}`
      : `https://www.google.com/maps/dir/${markers
          .sort((a, b) => a.index - b.index)
          .map((m) => `${m.position.lat},${m.position.lng}`)
          .join("/")}`;

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border border-stone-200 shadow-sm ${className}`}
    >
      <div className="relative w-full h-48 sm:h-56 md:h-64">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ width: "100%", height: "100%" }}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {markers.map((marker) => (
            <Marker
              key={`day${dayNumber}-marker-${marker.index}`}
              position={[marker.position.lat, marker.position.lng]}
              icon={createNumberedIcon(marker.label)}
            >
              <Popup>
                <div className="min-w-[160px]">
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
                    className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                  >
                    <FaExternalLinkAlt size={8} /> Google Mapsで見る
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          <FitBoundsController markers={markers} />
        </MapContainer>

        {/* External Link Button */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1.5 rounded-md shadow-sm text-[10px] font-bold text-stone-600 hover:bg-white hover:text-primary transition-colors flex items-center gap-1 z-[1000]"
          title="Google Mapsでルートを見る"
        >
          <FaExternalLinkAlt size={10} />
          <span className="hidden sm:inline">Map</span>
        </a>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-stone-600 shadow-sm border border-stone-200/50 z-[1000]">
          <span className="font-medium">Day {dayNumber}</span>
          <span className="mx-1.5 text-stone-300">|</span>
          <span>{markers.length} spots</span>
        </div>
      </div>
    </div>
  );
}
