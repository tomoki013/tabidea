"use client";

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
} from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import { TransitInfo, TransitType } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface TransitCardProps {
  /** Transit information */
  transit: TransitInfo;
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
  state = "collapsed",
  onStateChange,
  isEditing = false,
  onLockToggle,
  className = "",
}: TransitCardProps) {
  const config = TRANSIT_CONFIG[transit.type];
  const Icon = config.icon;

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
              <div className="text-sm text-stone-500">{transit.departure.time}</div>
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
              <div className="text-sm text-stone-500">{transit.arrival.time}</div>
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
