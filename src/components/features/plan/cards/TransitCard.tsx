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
} from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import { TransitInfo, TransitType } from "@/types";
import {
  generateFlightLinks,
  trackAffiliateClick,
} from "@/lib/utils/affiliate-links";
import { EditableText } from "@/components/ui/editable/EditableText";

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
  /** Whether the card is editable */
  isEditable?: boolean;
  /** Callback when lock status changes */
  onLockToggle?: () => void;
  /** Callback when transit info is updated */
  onUpdate?: (updates: Partial<TransitInfo>) => void;
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
  isEditable = false,
  onLockToggle,
  onUpdate,
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
  const route = isEditable ? (
    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <EditableText
        value={transit.departure.place}
        onChange={(val) => onUpdate?.({ departure: { ...transit.departure, place: val } })}
        isEditable={true}
        className="font-bold border-b border-stone-300"
      />
      <ArrowRight className="w-4 h-4 text-stone-400" />
      <EditableText
        value={transit.arrival.place}
        onChange={(val) => onUpdate?.({ arrival: { ...transit.arrival, place: val } })}
        isEditable={true}
        className="font-bold border-b border-stone-300"
      />
    </div>
  ) : `${transit.departure.place} → ${transit.arrival.place}`;

  // Build subtitle with times if available
  const buildSubtitle = () => {
    if (isEditable) {
      return (
        <div className="flex items-center gap-2 text-sm text-stone-500" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center gap-1">
              <span>発:</span>
              <EditableText
                 value={transit.departure.time || ''}
                 onChange={(val) => onUpdate?.({ departure: { ...transit.departure, time: val } })}
                 isEditable={true}
                 type="time"
                 className="w-20 bg-stone-50 border border-stone-200"
              />
           </div>
           <span>-</span>
           <div className="flex items-center gap-1">
              <span>着:</span>
              <EditableText
                 value={transit.arrival.time || ''}
                 onChange={(val) => onUpdate?.({ arrival: { ...transit.arrival, time: val } })}
                 isEditable={true}
                 type="time"
                 className="w-20 bg-stone-50 border border-stone-200"
              />
           </div>
        </div>
      );
    }
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
      time={isEditable ? (
         <EditableText
            value={transit.duration || ''}
            onChange={(val) => onUpdate?.({ duration: val })}
            isEditable={true}
            placeholder="所要時間"
            className="w-16 text-xs"
         />
      ) : transit.duration}
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
        {/* Route Details - Visual Route Card */}
        <div className="bg-gradient-to-r from-stone-50 to-stone-100/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            {/* Departure */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-stone-500 font-medium mb-0.5">出発</div>
              <div className="text-base font-bold text-stone-800 truncate">
                {transit.departure.place}
              </div>
              {transit.departure.time && (
                <div className="text-sm text-stone-500 font-mono">
                  {transit.departure.time}
                </div>
              )}
            </div>

            {/* Route Line */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-stone-400" />
                <div className="w-8 sm:w-12 h-0.5 bg-stone-300 relative">
                  <Icon className="w-4 h-4 text-stone-500 absolute -top-1.5 left-1/2 -translate-x-1/2" />
                </div>
                <ArrowRight className="w-3 h-3 text-stone-400" />
              </div>
              {transit.duration && (
                <div className="flex items-center gap-1 text-[11px] text-stone-500 mt-1.5">
                  <Clock className="w-3 h-3" />
                  {transit.duration}
                </div>
              )}
            </div>

            {/* Arrival */}
            <div className="flex-1 min-w-0 text-right">
              <div className="text-xs text-stone-500 font-medium mb-0.5">到着</div>
              <div className="text-base font-bold text-stone-800 truncate">
                {transit.arrival.place}
              </div>
              {transit.arrival.time && (
                <div className="text-sm text-stone-500 font-mono">
                  {transit.arrival.time}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Memo */}
        {(transit.memo || isEditable) && (
          <div>
            <h4 className="text-sm font-bold text-stone-700 mb-1">メモ</h4>
            {isEditable ? (
               <EditableText
                  value={transit.memo || ''}
                  onChange={(val) => onUpdate?.({ memo: val })}
                  isEditable={true}
                  multiline
                  placeholder="メモを入力..."
                  className="text-sm w-full min-h-[60px] p-2 bg-stone-50 border border-stone-200 rounded"
               />
            ) : (
               <p className="text-sm text-stone-600">{transit.memo}</p>
            )}
          </div>
        )}

        {/* Flight Affiliate Links */}
        {transit.type === "flight" && flightLinks.length > 0 && (
          <div className="pt-2 space-y-2 border-t border-stone-100">
            {transit.isBooked && (
              <p className="text-xs text-green-600 font-medium text-center">
                予約済みですが、別の航空券も検索できます
              </p>
            )}
            {/* Flight Search Button */}
            <a
              href={flightLinks[0].url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={handleFlightLinkClick}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-bold shadow-sm hover:shadow-md"
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
        {isEditable && onLockToggle && (
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
