"use client";

import { useState, useMemo } from "react";
import { Building2, MapPin, ExternalLink, Star, ChevronDown } from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import TrustBadge from "./TrustBadge";
import {
  generateHotelLinks,
  trackAffiliateClick,
  type TravelRegion,
  type AffiliateLink,
} from "@/lib/utils/affiliate-links";

// ============================================================================
// Types
// ============================================================================

export interface AccommodationData {
  /** Area or hotel name */
  name: string;
  /** Optional description */
  description?: string;
  /** Check-in date (YYYY-MM-DD) for affiliate link */
  checkInDate?: string;
  /** Check-out date (YYYY-MM-DD) for affiliate link */
  checkOutDate?: string;
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
  /** Destination for affiliate links */
  destination?: string;
  /** Travel region */
  region?: TravelRegion;
  /** Number of adults */
  adults?: number;
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
// Affiliate Links Dropdown
// ============================================================================

interface AffiliateDropdownProps {
  links: AffiliateLink[];
  destination: string;
}

function AffiliateDropdown({ links, destination }: AffiliateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (links.length === 0) return null;

  const handleClick = (link: AffiliateLink, e: React.MouseEvent) => {
    e.stopPropagation();
    trackAffiliateClick(link.service, destination, "hotel");
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all text-sm font-bold border border-purple-200/60 shadow-sm"
      >
        <Building2 className="w-4 h-4" />
        ホテルを探す
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-200/80 overflow-hidden z-50 min-w-[200px]">
            {links.map((link) => (
              <a
                key={link.service}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={(e) => handleClick(link, e)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-sm text-stone-700 border-b border-stone-100 last:border-b-0 group"
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium group-hover:text-purple-700 transition-colors">{link.displayName}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-stone-300 group-hover:text-purple-500 transition-colors" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function AccommodationCard({
  accommodation,
  destination,
  region,
  adults = 2,
  dayNumber,
  state = "collapsed",
  onStateChange,
  className = "",
}: AccommodationCardProps) {
  const {
    name,
    description,
    checkIn,
    checkOut,
    checkInDate,
    checkOutDate,
    rating,
    address,
    bookingUrl,
    isVerified,
    placeId,
  } = accommodation;

  // Generate affiliate links
  const affiliateLinks = useMemo(() => {
    const searchDestination = destination || name;
    return generateHotelLinks(
      {
        destination: searchDestination,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults,
        rooms: 1,
      },
      region
    );
  }, [destination, name, checkInDate, checkOutDate, adults, region]);

  // Build time range if available
  const timeRange =
    checkIn && checkOut ? `${checkIn} - ${checkOut}` : checkIn || checkOut;

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
            <p className="text-sm text-stone-600 leading-relaxed">
              {description}
            </p>
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
                  <span className="text-purple-600 font-medium">
                    チェックイン
                  </span>
                  <div className="text-purple-800 font-bold">{checkIn}</div>
                </div>
              )}
              {checkOut && (
                <div>
                  <span className="text-purple-600 font-medium">
                    チェックアウト
                  </span>
                  <div className="text-purple-800 font-bold">{checkOut}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Affiliate Links Section */}
        <div className="pt-2 space-y-3">
          {/* Affiliate Dropdown */}
          <AffiliateDropdown
            links={affiliateLinks}
            destination={destination || name}
          />

          {/* Direct booking link if available */}
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              予約サイトを見る
            </a>
          )}
        </div>

        {/* Google Maps Link */}
        {placeId && (
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${placeId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Google マップで見る
          </a>
        )}
      </div>
    </BaseCard>
  );
}
