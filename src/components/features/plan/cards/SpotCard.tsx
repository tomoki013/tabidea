"use client";

import { MapPin, Clock, Star, ExternalLink } from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import { Activity, ActivityValidation } from "@/types";
import TrustBadge from "./TrustBadge";

// ============================================================================
// Types
// ============================================================================

export interface SpotCardProps {
  /** Activity data */
  activity: Activity;
  /** Card state */
  state?: CardState;
  /** Callback when state changes */
  onStateChange?: (state: CardState) => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function SpotCard({
  activity,
  state = "collapsed",
  onStateChange,
  className = "",
}: SpotCardProps) {
  const { time, activity: name, description, validation } = activity;

  // Determine trust level from validation
  const getTrustLevel = (): "verified" | "ai_generated" | "needs_check" => {
    if (!validation) return "ai_generated";
    if (validation.isVerified) return "verified";
    if (validation.confidence === "low") return "needs_check";
    return "ai_generated";
  };

  return (
    <BaseCard
      cardType="spot"
      icon={<MapPin className="w-5 h-5" />}
      title={name}
      subtitle={description.length > 50 ? description.substring(0, 50) + "..." : description}
      time={time}
      state={state}
      onStateChange={onStateChange}
      colorTheme="orange"
      className={className}
      badge={<TrustBadge level={getTrustLevel()} size="sm" />}
    >
      {/* Expanded Content */}
      <div className="space-y-4 pt-2">
        {/* Description */}
        <div>
          <h4 className="text-sm font-bold text-stone-700 mb-1">詳細</h4>
          <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
        </div>

        {/* Validation Details (if available) */}
        {validation?.details && (
          <div className="space-y-2">
            {/* Rating */}
            {validation.details.rating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-stone-700">
                  {validation.details.rating.toFixed(1)}
                </span>
              </div>
            )}

            {/* Opening Hours */}
            {validation.details.openingHours && validation.details.openingHours.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-stone-500 mt-0.5" />
                <div className="text-sm text-stone-600">
                  {validation.details.openingHours.slice(0, 3).map((hours, i) => (
                    <div key={i}>{hours}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            {validation.details.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-stone-500 mt-0.5" />
                <span className="text-sm text-stone-600">
                  {validation.details.address}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Google Maps Link (placeholder for Phase 3) */}
        {validation?.placeId && (
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${validation.placeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
            Google マップで見る
          </a>
        )}
      </div>
    </BaseCard>
  );
}
