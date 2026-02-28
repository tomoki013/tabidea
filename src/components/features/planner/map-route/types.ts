/**
 * MapRouteView 共通型定義
 */

import type { DayPlan } from "@/types";
import type { MapProviderType } from "@/lib/limits/config";

// ============================================================================
// Route Marker
// ============================================================================

export interface RouteMarker {
  position: { lat: number; lng: number };
  label: string;
  name: string;
  dayNumber: number;
  spotIndex: number;
  placeId?: string;
}

// ============================================================================
// Shared Props
// ============================================================================

export interface MapRouteViewBaseProps {
  /** All days in the itinerary */
  days: DayPlan[];
  /** Destination name for display */
  destination: string;
  /** Custom class name */
  className?: string;
}

export interface MapRouteViewProps extends MapRouteViewBaseProps {
  /** Map provider (tier-based) */
  mapProvider: MapProviderType;
}

// ============================================================================
// Day Colors
// ============================================================================

export const DAY_COLORS = [
  { bg: "#e67e22", border: "#d35400" }, // Orange
  { bg: "#3498db", border: "#2980b9" }, // Blue
  { bg: "#2ecc71", border: "#27ae60" }, // Green
  { bg: "#9b59b6", border: "#8e44ad" }, // Purple
  { bg: "#e74c3c", border: "#c0392b" }, // Red
  { bg: "#1abc9c", border: "#16a085" }, // Teal
  { bg: "#f39c12", border: "#e67e22" }, // Yellow
  { bg: "#34495e", border: "#2c3e50" }, // Dark
] as const;

export function getDayColor(dayIndex: number) {
  return DAY_COLORS[dayIndex % DAY_COLORS.length];
}
