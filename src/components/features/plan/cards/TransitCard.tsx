"use client";

import { useMemo } from "react";
import {
  Plane,
  Train,
  Bus,
  Ship,
  Car,
  MapPin,
  ArrowRight,
  Clock,
  Lock,
  Unlock,
  ExternalLink,
  Info,
} from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import { TransitInfo, TransitType } from "@/types";
import {
  generateFlightLinks,
  trackAffiliateClick,
} from "@/lib/utils/affiliate-links";

// ============================================================================
// Types
// ============================================================================

export interface TransitCardProps {
  /** Transit information */
  transit: TransitInfo;
  /** Departure date (YYYY-MM-DD) for affiliate links */
  departureDate?: string;
  /** Return date (YYYY-MM-DD) for affiliate links */
  returnDate?: string;
  /** Number of adults */
  adults?: number;
  /** Card state */
  state?: CardState;
  /** Callback when state changes */
  onStateChange?: (state: CardState) => void;
  /** Whether in edit mode */
  isEditing?: boolean;
  /** Callback when lock status changes */
  onLockToggle?: () => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Transit Type Configuration
// ============================================================================

const TRANSIT_CONFIG: Record<
  TransitType,
  {
    icon: typeof Plane;
    label: string;
    colorTheme: "blue" | "green" | "orange" | "purple" | "teal";
  }
> = {
  flight: {
    icon: Plane,
    label: "飛行機",
    colorTheme: "blue",
  },
  train: {
    icon: Train,
    label: "電車",
    colorTheme: "green",
  },
  bus: {
    icon: Bus,
    label: "バス",
    colorTheme: "orange",
  },
  ship: {
    icon: Ship,
    label: "船",
    colorTheme: "teal",
  },
  car: {
    icon: Car,
    label: "車",
    colorTheme: "purple",
  },
  other: {
    icon: MapPin,
    label: "その他",
    colorTheme: "orange",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function TransitCard({
  transit,
  departureDate,
  returnDate,
  adults = 1,
  state = "collapsed",
  onStateChange,
  isEditing = false,
  onLockToggle,
  className = "",
}: TransitCardProps) {
  const config = TRANSIT_CONFIG[transit.type];
  const Icon = config.icon;

  // Generate flight affiliate links (only for flights)
  const flightLinks = useMemo(() => {
    if (transit.type !== "flight") return [];

    return generateFlightLinks({
      origin: transit.departure.place,
      destination: transit.arrival.place,
      departureDate,
      returnDate,
      adults,
    });
  }, [transit.type, transit.departure.place, transit.arrival.place, departureDate, returnDate, adults]);

  // Build route string
  const route = `${transit.departure.place} → ${transit.arrival.place}`;

  // Build subtitle with times if available
  const buildSubtitle = (): string => {
    const parts: string[] = [];
    if (transit.departure.time) {
      parts.push(`${transit.departure.time}発`);
    }
    if (transit.arrival.time) {
      parts.push(`${transit.arrival.time}着`);
    }
    if (parts.length === 0 && transit.memo) {
      return transit.memo;
    }
    return parts.join(" - ");
  };

  const handleFlightLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (flightLinks.length > 0) {
      trackAffiliateClick(
        flightLinks[0].service,
        transit.arrival.place,
        "flight"
      );
    }
  };

  return (
    <BaseCard
      cardType="transit"
      icon={<Icon className="w-5 h-5" />}
      title={route}
      subtitle={buildSubtitle()}
      time={transit.duration}
      state={state}
      onStateChange={onStateChange}
      colorTheme={config.colorTheme}
      className={className}
      badge={
        transit.isBooked ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            予約済み
          </span>
        ) : undefined
      }
    >
      {/* Expanded Content */}
      <div className="space-y-4 pt-2">
        {/* Route Details */}
        <div className="flex items-center justify-between bg-stone-50 rounded-lg p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-stone-800">
              {transit.departure.place}
            </div>
            {transit.departure.time && (
              <div className="text-sm text-stone-500">
                {transit.departure.time}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center px-4">
            <ArrowRight className="w-6 h-6 text-stone-400" />
            {transit.duration && (
              <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                <Clock className="w-3 h-3" />
                {transit.duration}
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-stone-800">
              {transit.arrival.place}
            </div>
            {transit.arrival.time && (
              <div className="text-sm text-stone-500">
                {transit.arrival.time}
              </div>
            )}
          </div>
        </div>

        {/* Memo */}
        {transit.memo && (
          <div>
            <h4 className="text-sm font-bold text-stone-700 mb-1">メモ</h4>
            <p className="text-sm text-stone-600">{transit.memo}</p>
          </div>
        )}

        {/* Flight Affiliate Links */}
        {transit.type === "flight" && flightLinks.length > 0 && !transit.isBooked && (
          <div className="pt-2 space-y-3 border-t border-stone-100">
            {/* PR disclosure */}
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Info className="w-3 h-3" />
              <span>PR: 以下は広告リンクです</span>
            </div>

            {/* Flight Search Button */}
            <a
              href={flightLinks[0].url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={handleFlightLinkClick}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <Plane className="w-4 h-4" />
              航空券を探す
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
            <p className="text-xs text-stone-400 text-center">
              {flightLinks[0].displayName}で航空券を検索
            </p>
          </div>
        )}

        {/* Edit Mode Controls */}
        {isEditing && onLockToggle && (
          <div className="flex justify-end pt-2 border-t border-stone-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLockToggle();
              }}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  transit.isLocked
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }
              `}
            >
              {transit.isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  ロック中
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  ロック
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </BaseCard>
  );
}
