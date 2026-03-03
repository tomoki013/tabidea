"use client";

/**
 * LeafletActivityMap — Leaflet アクティビティマップ (Pro ティア)
 *
 * react-leaflet + OpenStreetMap による単一スポットの対話型マップ。ゼロコスト。
 */

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { FaExternalLinkAlt } from "react-icons/fa";
import type { ActivityMapBaseProps } from "./types";

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

const PIN_ICON = L.divIcon({
  className: "custom-leaflet-activity-marker",
  html: `<div style="
    width: 28px; height: 28px;
    background: #EA580C;
    border: 2px solid white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// ============================================================================
// Component
// ============================================================================

export default function LeafletActivityMap({
  name,
  latitude,
  longitude,
  placeId,
  googleMapsUrl,
  destination,
  className = "",
}: ActivityMapBaseProps) {
  useLeafletCSS();

  const searchQuery = destination ? `${name} ${destination}` : name;
  const mapsUrl =
    googleMapsUrl ||
    (placeId
      ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`);

  return (
    <div className={`relative ${className}`}>
      <div className="h-48 rounded-lg overflow-hidden border border-stone-200">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          style={{ width: "100%", height: "100%" }}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={[latitude, longitude]} icon={PIN_ICON}>
            <Popup>
              <div className="min-w-[160px]">
                <h3 className="font-bold text-xs text-stone-800 mb-1">
                  {name}
                </h3>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
                >
                  <FaExternalLinkAlt size={8} /> Google Mapsで見る
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Google Maps Link Overlay */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-md text-sm font-medium text-stone-700 hover:text-primary hover:bg-white transition-colors border border-stone-200 z-[1000]"
        onClick={(e) => e.stopPropagation()}
      >
        <FaExternalLinkAlt size={12} />
        Google Mapsで見る
      </a>
    </div>
  );
}
