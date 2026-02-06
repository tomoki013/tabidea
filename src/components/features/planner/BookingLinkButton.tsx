"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  generateBookingLinks,
  type BookingType,
} from "@/lib/utils/booking-links";
import { trackAffiliateClick, type AffiliateLink } from "@/lib/utils/affiliate-links";

// ============================================================================
// Types
// ============================================================================

interface BookingLinkButtonProps {
  type: BookingType;
  destination: string;
  label?: string;
  checkinDate?: string;
  checkoutDate?: string;
  origin?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function BookingLinkButton({
  type,
  destination,
  label,
  checkinDate,
  checkoutDate,
  origin,
  className = "",
}: BookingLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const bookingResult = useMemo(
    () =>
      generateBookingLinks({
        type,
        destination,
        checkinDate,
        checkoutDate,
        origin,
      }),
    [type, destination, checkinDate, checkoutDate, origin]
  );

  const displayLabel = label || bookingResult.label;

  const handleLinkClick = (link: AffiliateLink, e: React.MouseEvent) => {
    e.stopPropagation();
    trackAffiliateClick(
      link.service,
      destination,
      type === 'hotel' ? 'hotel' : 'flight'
    );
  };

  if (bookingResult.links.length === 0) return null;

  // 1つしかリンクがない場合はドロップダウンなしで直接リンク
  if (bookingResult.links.length === 1) {
    const link = bookingResult.links[0];
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={(e) => handleLinkClick(link, e)}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-stone-700 rounded-xl hover:bg-stone-50 transition-all text-sm font-bold border border-stone-200 shadow-sm hover:shadow-md ${className}`}
      >
        <span className="text-base">{bookingResult.icon}</span>
        <span>{displayLabel}</span>
        <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
      </a>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-stone-700 rounded-xl hover:bg-stone-50 transition-all text-sm font-bold border border-stone-200 shadow-sm hover:shadow-md w-full"
      >
        <span className="text-base">{bookingResult.icon}</span>
        <span>{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
            {bookingResult.links.map((link) => (
              <a
                key={link.service + link.displayName}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={(e) => handleLinkClick(link, e)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-sm text-stone-700 border-b border-stone-100 last:border-b-0 group"
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium group-hover:text-primary transition-colors">{link.displayName}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-auto text-stone-300 group-hover:text-primary/60 transition-colors" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
