"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Clock,
  MapPin,
  Star,
  Camera,
  AlertCircle,
  Lock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Activity, PlacePhoto } from "@/types";
import { usePlaceDetails } from "@/lib/hooks/usePlaceDetails";
import ActivityMap from "./ActivityMap";

// ============================================================================
// Types
// ============================================================================

export interface ActivityAccordionProps {
  /** アクティビティデータ */
  activity: Activity;
  /** 目的地（場所検索のコンテキスト用） */
  destination: string;
  /** 日のインデックス（0-indexed） */
  dayIndex: number;
  /** アクティビティのインデックス（0-indexed） */
  activityIndex: number;
  /** クラス名 */
  className?: string;
  /** UI タイプ */
  uiType?: "default" | "compact" | "narrative";
}

// ============================================================================
// Photo Carousel Component
// ============================================================================

interface PhotoCarouselProps {
  photos: PlacePhoto[];
}

function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div className="relative">
      {/* Photo */}
      <div className="aspect-video rounded-lg overflow-hidden bg-stone-100">
        {photos[currentIndex]?.url ? (
          <img
            src={photos[currentIndex].url}
            alt={`写真 ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400">
            <Camera className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Navigation dots */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`写真 ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Attribution */}
      {photos[currentIndex]?.attributions?.length > 0 && (
        <div className="absolute bottom-2 right-2 text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
          📷 {photos[currentIndex].attributions[0]}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton Component
// ============================================================================

function DetailsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Photo skeleton */}
      <div className="aspect-video rounded-lg bg-stone-200" />

      {/* Map skeleton */}
      <div className="h-48 rounded-lg bg-stone-200" />

      {/* Rating skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-stone-200" />
        <div className="w-20 h-4 rounded bg-stone-200" />
      </div>

      {/* Address skeleton */}
      <div className="w-2/3 h-4 rounded bg-stone-200" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ActivityAccordion({
  activity,
  destination,
  dayIndex,
  activityIndex,
  className = "",
  uiType = "default",
}: ActivityAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { time, activity: name, description, validation, isLocked } = activity;

  // Lazy loading hook for place details
  const {
    details: fetchedDetails,
    isLoading,
    error,
    fetchDetails,
  } = usePlaceDetails(name, destination);

  // Merge validation data with fetched details
  const mergedDetails = fetchedDetails?.details || (validation?.isVerified ? validation.details : undefined);
  const placeId = fetchedDetails?.placeId || validation?.placeId;

  // Photos from fetched details
  const photos = fetchedDetails?.details?.photos || [];

  // Trigger fetch when accordion is expanded
  useEffect(() => {
    if (isExpanded && !validation?.isVerified && !fetchedDetails && !isLoading) {
      fetchDetails();
    }
  }, [isExpanded, validation?.isVerified, fetchedDetails, isLoading, fetchDetails]);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Confidence badge color
  const getConfidenceBadge = () => {
    const confidence = fetchedDetails?.confidence || validation?.confidence;
    if (!confidence) return null;

    const badges = {
      high: { text: "確認済み", className: "bg-green-100 text-green-700 border-green-200" },
      medium: { text: "要確認", className: "bg-amber-100 text-amber-700 border-amber-200" },
      low: { text: "未確認", className: "bg-red-100 text-red-700 border-red-200" },
      unverified: { text: "AI生成", className: "bg-stone-100 text-stone-600 border-stone-200" },
    };

    const badge = badges[confidence];
    return (
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  // Render compact UI
  if (uiType === "compact") {
    return (
      <div
        className={`bg-white rounded-lg border border-stone-100 overflow-hidden transition-all duration-300 hover:shadow-sm cursor-pointer ${className}`}
        onClick={handleToggle}
      >
        {/* Compact Header */}
        <div className="flex items-center gap-3 p-3">
          <div className="flex-shrink-0 w-14 text-stone-500 text-xs font-mono font-bold text-right">
            {time}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-stone-800 truncate">{name}</h4>
              {isLocked && <Lock size={10} className="text-amber-500 flex-shrink-0" />}
              {getConfidenceBadge()}
            </div>
            <p className="text-stone-500 text-xs truncate">{description}</p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4 text-stone-400" />
          </motion.div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pb-4 pt-2 border-t border-stone-100 space-y-3">
                <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
                {renderExpandedContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render narrative UI
  if (uiType === "narrative") {
    return (
      <div
        className={`relative cursor-pointer ${className}`}
        onClick={handleToggle}
      >
        <div className="border-l-4 border-primary/20 pl-6 py-1">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-primary font-serif font-bold text-lg">{time}</span>
            <h4 className="text-2xl font-serif font-bold text-stone-800">{name}</h4>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Lock size={10} />
                固定
              </span>
            )}
            {getConfidenceBadge()}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="ml-auto"
            >
              <ChevronDown className="w-5 h-5 text-stone-400" />
            </motion.div>
          </div>
          <p className="text-stone-600 leading-relaxed text-lg font-serif">{description}</p>
        </div>

        {/* Expanded Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pl-6 pt-4 space-y-4">
                {renderExpandedContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render expanded content (shared between all UI types)
  function renderExpandedContent() {
    return (
      <>
        {/* Loading State */}
        {isLoading && <DetailsSkeleton />}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Photos Carousel */}
        {photos.length > 0 && !isLoading && <PhotoCarousel photos={photos} />}

        {/* Map */}
        {mergedDetails?.latitude && mergedDetails?.longitude && !isLoading && (
          <ActivityMap
            name={name}
            latitude={mergedDetails.latitude}
            longitude={mergedDetails.longitude}
            placeId={placeId}
            googleMapsUrl={fetchedDetails?.details?.googleMapsUrl}
            destination={destination}
          />
        )}

        {/* Place Details */}
        {mergedDetails && !isLoading && (
          <div className="space-y-2">
            {/* Rating */}
            {mergedDetails.rating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-stone-700">
                  {mergedDetails.rating.toFixed(1)}
                </span>
                {(fetchedDetails?.details?.reviewCount || mergedDetails.reviewCount) && (
                  <span className="text-sm text-stone-500">
                    ({fetchedDetails?.details?.reviewCount || mergedDetails.reviewCount}件の口コミ)
                  </span>
                )}
              </div>
            )}

            {/* Opening Hours */}
            {mergedDetails.openingHours && mergedDetails.openingHours.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-stone-500 mt-0.5" />
                <div className="text-sm text-stone-600">
                  {mergedDetails.openingHours.slice(0, 2).map((hours, i) => (
                    <div key={i}>{hours}</div>
                  ))}
                  {mergedDetails.openingHours.length > 2 && (
                    <details className="mt-1">
                      <summary className="text-blue-600 cursor-pointer hover:underline text-xs">
                        すべての営業時間を見る
                      </summary>
                      <div className="mt-1">
                        {mergedDetails.openingHours.slice(2).map((hours, i) => (
                          <div key={i}>{hours}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            {mergedDetails.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-stone-500 mt-0.5" />
                <span className="text-sm text-stone-600">{mergedDetails.address}</span>
              </div>
            )}
          </div>
        )}

        {/* Fetch Button (if not yet fetched) */}
        {!isLoading && !fetchedDetails && !validation?.isVerified && !error && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchDetails();
            }}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Loader2 className="w-4 h-4" />
            詳細情報を取得
          </button>
        )}

        {/* Google Maps Link (if no coordinates but has placeId) */}
        {placeId && !mergedDetails?.latitude && (
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
      </>
    );
  }

  // Default UI
  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer group ${
        isExpanded
          ? "border-primary/40 shadow-md"
          : "border-stone-100 shadow-sm hover:shadow-md hover:-translate-y-1"
      } ${className}`}
      onClick={handleToggle}
    >
      {/* Decorative left border */}
      <div
        className={`absolute top-0 left-0 w-1 h-full transition-colors ${
          isExpanded ? "bg-primary" : "bg-stone-200 group-hover:bg-primary"
        }`}
      />

      {/* Header */}
      <div className="p-6 pl-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-stone-500 text-sm font-mono bg-stone-100 px-2 py-1 rounded-md flex items-center gap-2">
                <Clock className="text-primary/70 w-3.5 h-3.5" />
                {time}
              </div>
              {isLocked && (
                <div className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  <Lock size={10} />
                  <span>固定</span>
                </div>
              )}
              {getConfidenceBadge()}
            </div>

            <h4 className="text-xl font-bold text-stone-800 mb-2 font-serif">{name}</h4>

            {!isExpanded && (
              <p className="text-stone-600 leading-relaxed text-sm line-clamp-2">{description}</p>
            )}
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 mt-2"
          >
            <ChevronDown className="w-5 h-5 text-stone-400" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pb-6 pl-8 pt-0 border-t border-stone-100 space-y-4">
              {/* Full Description */}
              <div>
                <h5 className="text-sm font-bold text-stone-700 mb-1">詳細</h5>
                <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
              </div>

              {renderExpandedContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
