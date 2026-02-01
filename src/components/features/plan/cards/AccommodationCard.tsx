"use client";

import { Building2, MapPin, ExternalLink, Star } from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import TrustBadge from "./TrustBadge";

// ============================================================================
// Types
// ============================================================================

export interface AccommodationData {
  /** Area or hotel name */
  name: string;
  /** Optional description */
  description?: string;
  /** Check-in time */
  checkIn?: string;
  /** Check-out time */
  checkOut?: string;
  /** Rating */
  rating?: number;
  /** Address */
  address?: string;
  /** Booking URL */
  bookingUrl?: string;
  /** Is verified */
  isVerified?: boolean;
  /** Google Place ID */
  placeId?: string;
}

export interface AccommodationCardProps {
  /** Accommodation data */
  accommodation: AccommodationData;
  /** Day number for display */
  dayNumber?: number;
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

export default function AccommodationCard({
  accommodation,
  dayNumber,
  state = "collapsed",
  onStateChange,
  className = "",
}: AccommodationCardProps) {
  const { name, description, checkIn, checkOut, rating, address, bookingUrl, isVerified, placeId } =
    accommodation;

  // Build time range if available
  const timeRange = checkIn && checkOut ? `${checkIn} - ${checkOut}` : checkIn || checkOut;

  return (
    <BaseCard
      cardType="accommodation"
      icon={<Building2 className="w-5 h-5" />}
      title={name}
      subtitle={description || (dayNumber ? `${dayNumber}日目の宿泊` : "宿泊")}
      time={timeRange}
      state={state}
      onStateChange={onStateChange}
      colorTheme="purple"
      className={className}
      badge={
        <TrustBadge
          level={isVerified ? "verified" : "ai_generated"}
          size="sm"
        />
      }
    >
      {/* Expanded Content */}
      <div className="space-y-4 pt-2">
        {/* Description */}
        {description && (
          <div>
            <h4 className="text-sm font-bold text-stone-700 mb-1">詳細</h4>
            <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
          </div>
        )}

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-medium text-stone-700">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-stone-500 mt-0.5" />
            <span className="text-sm text-stone-600">{address}</span>
          </div>
        )}

        {/* Check-in/out times */}
        {(checkIn || checkOut) && (
          <div className="bg-purple-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {checkIn && (
                <div>
                  <span className="text-purple-600 font-medium">チェックイン</span>
                  <div className="text-purple-800 font-bold">{checkIn}</div>
                </div>
              )}
              {checkOut && (
                <div>
                  <span className="text-purple-600 font-medium">チェックアウト</span>
                  <div className="text-purple-800 font-bold">{checkOut}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Links */}
        <div className="flex gap-3 pt-2">
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" />
              予約サイトを見る
            </a>
          )}
          {placeId && (
            <a
              href={`https://www.google.com/maps/place/?q=place_id:${placeId}`}
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
      </div>
    </BaseCard>
  );
}
