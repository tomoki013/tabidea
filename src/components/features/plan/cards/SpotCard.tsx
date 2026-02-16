"use client";

import { useEffect, useState } from "react";
import { MapPin, Clock, Star, ExternalLink, Camera, AlertCircle, Loader2, Trash2 } from "lucide-react";
import BaseCard, { CardState } from "./BaseCard";
import { Activity, ActivityValidation, PlacePhoto } from "@/types";
import TrustBadge from "./TrustBadge";
import CitationBadge from "@/components/features/planner/CitationBadge";
import { usePlaceDetails } from "@/lib/hooks/usePlaceDetails";
import { shouldSkipPlacesSearch, classifyActivity } from "@/lib/utils/activity-classifier";
import { EditableText } from "@/components/ui/editable/EditableText";

// ============================================================================
// Types
// ============================================================================

export interface SpotCardProps {
  /** Activity data */
  activity: Activity;
  /** Destination for location-based search */
  destination?: string;
  /** Card state */
  state?: CardState;
  /** Callback when state changes */
  onStateChange?: (state: CardState) => void;
  /** Custom class name */
  className?: string;
  /** Whether the card is editable */
  isEditable?: boolean;
  /** Callback when activity is updated */
  onUpdate?: (updates: Partial<Activity>) => void;
  /** Callback when activity is deleted */
  onDelete?: () => void;
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

      {/* Rating skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-stone-200" />
        <div className="w-20 h-4 rounded bg-stone-200" />
      </div>

      {/* Hours skeleton */}
      <div className="space-y-1">
        <div className="w-full h-3 rounded bg-stone-200" />
        <div className="w-3/4 h-3 rounded bg-stone-200" />
      </div>

      {/* Address skeleton */}
      <div className="w-2/3 h-4 rounded bg-stone-200" />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function SpotCard({
  activity,
  destination,
  state = "collapsed",
  onStateChange,
  className = "",
  isEditable = false,
  onUpdate,
  onDelete,
}: SpotCardProps) {
  const { time, activity: name, description, validation, activityType } = activity;

  // Determine if this activity should trigger Places API search
  const classification = classifyActivity(name, description, activityType);
  const skipPlacesSearch = classification.decision === 'skip';

  // Lazy loading hook (pass locationEn for better international spot search)
  const {
    details: fetchedDetails,
    isLoading,
    error,
    fetchDetails,
  } = usePlaceDetails(name, destination, activity.locationEn, activity.searchQuery);

  // Merge validation data with fetched details
  const mergedValidation: ActivityValidation | undefined = fetchedDetails
    ? {
        spotName: fetchedDetails.spotName,
        isVerified: fetchedDetails.isVerified,
        confidence: fetchedDetails.confidence,
        source: fetchedDetails.source,
        placeId: fetchedDetails.placeId,
        details: fetchedDetails.details
          ? {
              address: fetchedDetails.details.address,
              rating: fetchedDetails.details.rating,
              openingHours: fetchedDetails.details.openingHours,
              photos: fetchedDetails.details.photos?.map((p) => p.url || "").filter(Boolean),
            }
          : undefined,
      }
    : validation;

  // Photos from fetched details (with full PlacePhoto data)
  const photos = fetchedDetails?.details?.photos || [];

  // Trigger fetch when card is expanded (skip for transit/accommodation/free time)
  useEffect(() => {
    if (state === "expanded" && !skipPlacesSearch && !validation?.isVerified && !fetchedDetails && !isLoading) {
      fetchDetails();
    }
  }, [state, skipPlacesSearch, validation?.isVerified, fetchedDetails, isLoading, fetchDetails]);

  // Determine trust level from validation
  const getTrustLevel = (): "verified" | "ai_generated" | "needs_check" | "unverified" => {
    if (skipPlacesSearch) return "ai_generated";
    const v = mergedValidation;
    if (!v) return "ai_generated";
    if (v.isVerified && v.confidence === "high") return "verified";
    if (v.confidence === "medium") return "needs_check";
    if (v.confidence === "low" || v.confidence === "unverified") return "unverified";
    if (v.isVerified) return "verified";
    return "ai_generated";
  };

  // Check if spot was not found in Places API
  const isNotFound = mergedValidation?.confidence === "unverified" || mergedValidation?.confidence === "low";

  // Choose icon based on classification
  const getCardIcon = () => {
    switch (classification.category) {
      case 'transport':
        return <MapPin className="w-5 h-5" />;
      case 'hotel':
        return <MapPin className="w-5 h-5" />;
      case 'free_time':
        return <Clock className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  return (
    <BaseCard
      cardType="spot"
      icon={getCardIcon()}
      title={
        isEditable ? (
          <EditableText
            value={name}
            onChange={(val) => onUpdate?.({ activity: val })}
            isEditable={true}
            className="font-bold text-lg font-hand"
          />
        ) : name
      }
      subtitle={
        isEditable ? (
          <EditableText
            value={description}
            onChange={(val) => onUpdate?.({ description: val })}
            isEditable={true}
            className="text-sm text-stone-500 font-hand block w-full truncate"
          />
        ) : (description.length > 50 ? description.substring(0, 50) + "..." : description)
      }
      time={
        isEditable ? (
          <EditableText
            value={time}
            onChange={(val) => onUpdate?.({ time: val })}
            isEditable={true}
            type="time"
            className="font-mono text-xs text-stone-600 bg-stone-50 px-1 rounded border border-stone-200"
          />
        ) : time
      }
      state={state}
      onStateChange={onStateChange}
      colorTheme="orange"
      className={className}
      badge={skipPlacesSearch ? undefined : <TrustBadge level={getTrustLevel()} size="sm" showLabel={getTrustLevel() === "unverified"} />}
      actions={
        isEditable && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('この予定を削除しますか？')) {
                onDelete();
              }
            }}
            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )
      }
    >
      {/* Expanded Content */}
      <div className="space-y-4 pt-2">
        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-stone-700">詳細</h4>
            {activity.source && <CitationBadge source={activity.source} />}
          </div>
          {isEditable ? (
            <EditableText
              value={description}
              onChange={(val) => onUpdate?.({ description: val })}
              isEditable={true}
              multiline
              className="text-sm text-stone-600 leading-relaxed w-full min-h-[100px] p-2 bg-stone-50 rounded border border-stone-200"
            />
          ) : (
            <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Unverified spot alert */}
        {isNotFound && !skipPlacesSearch && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>位置情報未確認：Google Placesで該当スポットが見つかりませんでした。AI生成の情報のため、実在しない可能性があります。</span>
          </div>
        )}

        {/* Places API details - only show for searchable activities */}
        {!skipPlacesSearch && !isNotFound && (
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
            {photos.length > 0 && <PhotoCarousel photos={photos} />}

            {/* Validation Details (if available) */}
            {mergedValidation?.details && !isLoading && (
              <div className="space-y-2">
                {/* Rating */}
                {mergedValidation.details.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-stone-700">
                      {mergedValidation.details.rating.toFixed(1)}
                    </span>
                    {fetchedDetails?.details?.reviewCount && (
                      <span className="text-sm text-stone-500">
                        ({fetchedDetails.details.reviewCount}件の口コミ)
                      </span>
                    )}
                  </div>
                )}

                {/* Opening Hours */}
                {mergedValidation.details.openingHours && mergedValidation.details.openingHours.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-stone-500 mt-0.5" />
                    <div className="text-sm text-stone-600">
                      {mergedValidation.details.openingHours.slice(0, 3).map((hours, i) => (
                        <div key={i}>{hours}</div>
                      ))}
                      {mergedValidation.details.openingHours.length > 3 && (
                        <details className="mt-1">
                          <summary className="text-blue-600 cursor-pointer hover:underline">
                            すべての営業時間を見る
                          </summary>
                          <div className="mt-1">
                            {mergedValidation.details.openingHours.slice(3).map((hours, i) => (
                              <div key={i}>{hours}</div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {mergedValidation.details.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-stone-500 mt-0.5" />
                    <span className="text-sm text-stone-600">
                      {mergedValidation.details.address}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Fetch Button (if not yet fetched and no validation) */}
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

            {/* Google Maps Link */}
            {(mergedValidation?.placeId || fetchedDetails?.details?.googleMapsUrl || name) && (
              <a
                href={
                  fetchedDetails?.details?.googleMapsUrl ||
                  (mergedValidation?.placeId
                    ? `https://www.google.com/maps/place/?q=place_id:${mergedValidation.placeId}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination ? `${name} ${destination}` : name)}`)
                }
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
        )}
      </div>
    </BaseCard>
  );
}
