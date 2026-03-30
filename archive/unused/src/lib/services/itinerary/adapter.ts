/**
 * Adapter: ComposedItinerary → Itinerary 変換
 * 後方互換性維持のための変換レイヤー
 * + フライト・宿泊の注入、移動手段の詳細化
 */

import type {
  Itinerary,
  DayPlan,
  Activity,
  ActivityType,
  TransitInfo,
  TimelineItem,
  ActivityValidation,
  ModelInfo,
} from '@/types/itinerary';
import type {
  ComposedItinerary,
  NarrativeDay,
  NarrativeActivity,
  RouteLeg,
} from '@/types/itinerary-pipeline';
import { MODE_TO_LABEL } from './constants';
import { inferTransitType } from '@/lib/services/google/distance-estimator';
import { injectFlights, type FlightInjectionContext } from './inject-flights';
import { injectAccommodations, type AccommodationInjectionContext } from './inject-accommodations';
import { enrichItineraryMetadata } from '@/lib/trips/metadata';
import type { FixedScheduleItem } from '@/types/user-input';

// ============================================
// Adapter Context (from pipeline)
// ============================================

export interface AdapterContext {
  homeBaseCity?: string;
  departureCity?: string;
  arrivalCity?: string;
  destination: string;
  durationDays: number;
  startDate?: string;
  overnightLocations: string[];
  fixedSchedule: FixedScheduleItem[];
  region?: string;
}

// ============================================
// Public API
// ============================================

/**
 * ComposedItinerary を Itinerary 型に変換
 */
export function composedToItinerary(
  composed: ComposedItinerary,
  modelInfo?: ModelInfo,
  context?: AdapterContext
): Itinerary {
  const id = Math.random().toString(36).substring(2, 15);

  let days: DayPlan[] = composed.days.map((day) =>
    convertDay(day)
  );

  // フライト注入
  if (context) {
    const flightContext: FlightInjectionContext = {
      homeBaseCity: context.homeBaseCity,
      departureCity: context.departureCity,
      arrivalCity: context.arrivalCity,
      destination: context.destination,
      durationDays: context.durationDays,
      startDate: context.startDate,
      fixedSchedule: context.fixedSchedule,
      region: context.region,
    };
    days = injectFlights(days, flightContext);

    // 宿泊注入
    const accommodationContext: AccommodationInjectionContext = {
      overnightLocations: context.overnightLocations,
      startDate: context.startDate,
      destination: context.destination,
    };
    days = injectAccommodations(days, accommodationContext);
  }

  const itinerary: Itinerary = {
    id,
    destination: composed.destination,
    description: composed.description,
    heroImage: composed.heroImage?.url,
    heroImagePhotographer: composed.heroImage?.photographer,
    heroImagePhotographerUrl: composed.heroImage?.photographerUrl,
    days,
    modelInfo,
  };

  return enrichItineraryMetadata(itinerary);
}

// ============================================
// Day conversion
// ============================================

function convertDay(day: NarrativeDay): DayPlan {
  const activities: Activity[] = day.activities.map((a) =>
    convertActivity(a)
  );

  // TimelineItems: transit + activity interleaved
  const timelineItems: TimelineItem[] = [];
  for (let i = 0; i < activities.length; i++) {
    // Add transit before this activity (if leg exists)
    if (i > 0 && day.legs[i - 1]) {
      const leg = day.legs[i - 1];
      const transitInfo = convertLeg(leg, day.activities, i);
      timelineItems.push({
        itemType: 'transit',
        data: transitInfo,
        time: day.activities[i - 1].node.departureTime,
      });
    }

    timelineItems.push({
      itemType: 'activity',
      data: activities[i],
    });
  }

  return {
    day: day.day,
    title: day.title,
    activities,
    timelineItems,
  };
}

// ============================================
// Activity conversion
// ============================================

function convertActivity(activity: NarrativeActivity): Activity {
  const node = activity.node;
  const candidate = node.stop.candidate;
  const placeDetails = node.stop.placeDetails;

  const activityType = mapRoleToActivityType(candidate.role);
  const groundedActivityName = resolveGroundedActivityName(activity.activityName, candidate, placeDetails);

  const result: Activity = {
    time: node.arrivalTime,
    activity: groundedActivityName,
    description: activity.description,
    activityType,
    searchQuery: candidate.searchQuery,
    source: activity.source,
    // v3: nodeId / semanticId をメタデータに保存
    metadata: {
      ...(node.nodeId && { nodeId: node.nodeId }),
      ...(node.semanticId && { semanticId: node.semanticId }),
    },
  };

  // locationEn
  if (candidate.locationEn) {
    result.locationEn = candidate.locationEn;
  } else if (placeDetails) {
    result.locationEn = placeDetails.name;
  }

  // Place validation data
  if (placeDetails) {
    result.validation = buildValidation(placeDetails, candidate.searchQuery);
  }

  return result;
}

function resolveGroundedActivityName(
  generatedName: string,
  candidate: NarrativeActivity['node']['stop']['candidate'],
  placeDetails: NarrativeActivity['node']['stop']['placeDetails']
): string {
  const canonicalPlaceName = placeDetails?.name || candidate.searchQuery || candidate.name;
  const preferredLabels = [generatedName, candidate.activityLabel, candidate.name].filter(
    (label): label is string => Boolean(label && label.trim())
  );

  const groundedLabel = preferredLabels.find((label) =>
    mentionsCanonicalPlace(label, canonicalPlaceName, candidate.searchQuery, candidate.name)
  );

  if (groundedLabel) {
    return groundedLabel;
  }

  return canonicalPlaceName;
}

function mentionsCanonicalPlace(
  label: string,
  canonicalPlaceName: string,
  searchQuery: string,
  candidateName: string
): boolean {
  const normalizedLabel = normalizeLabel(label);
  const normalizedCandidates = [canonicalPlaceName, searchQuery, candidateName]
    .map(normalizeLabel)
    .filter(Boolean);

  return normalizedCandidates.some((value) => normalizedLabel.includes(value) || value.includes(normalizedLabel));
}

function normalizeLabel(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s,./\()（）・'-]+/g, '');
}

function mapRoleToActivityType(
  role: string
): ActivityType {
  switch (role) {
    case 'meal':
      return 'meal';
    case 'accommodation':
      return 'accommodation';
    case 'must_visit':
    case 'recommended':
    case 'filler':
    default:
      return 'spot';
  }
}

function buildValidation(
  placeDetails: NonNullable<NarrativeActivity['node']['stop']['placeDetails']>,
  searchQuery: string
): ActivityValidation {
  return {
    spotName: searchQuery,
    isVerified: true,
    confidence: 'high',
    source: 'google_places',
    placeId: placeDetails.placeId,
    details: {
      address: placeDetails.formattedAddress,
      rating: placeDetails.rating,
      openingHours: placeDetails.openingHours?.weekdayText,
      latitude: placeDetails.latitude,
      longitude: placeDetails.longitude,
      reviewCount: placeDetails.userRatingsTotal,
      googleMapsUrl: placeDetails.googleMapsUrl,
    },
  };
}

// ============================================
// Leg conversion
// ============================================

/** TransitType ごとの表示ラベル */
const TRANSIT_TYPE_LABEL: Record<string, string> = {
  walking: '徒歩',
  bus: 'バス',
  train: '電車',
  bullet_train: '新幹線',
  car: '車',
  taxi: 'タクシー',
  other: '移動',
};

function convertLeg(
  leg: RouteLeg,
  activities: NarrativeActivity[],
  toIndex: number
): TransitInfo {
  const fromActivity = activities[toIndex - 1];
  const toActivity = activities[toIndex];

  const fromName =
    fromActivity?.node.stop.placeDetails?.name ||
    fromActivity?.node.stop.candidate.name ||
    '';
  const toName =
    toActivity?.node.stop.placeDetails?.name ||
    toActivity?.node.stop.candidate.name ||
    '';

  const transitType = inferTransitType(leg.distanceKm, leg.mode);
  const label = TRANSIT_TYPE_LABEL[transitType] || MODE_TO_LABEL[leg.mode];

  return {
    type: transitType,
    departure: {
      place: fromName,
      time: fromActivity?.node.departureTime,
    },
    arrival: {
      place: toName,
      time: toActivity?.node.arrivalTime,
    },
    duration: formatDuration(leg.durationMinutes),
    memo: `${label} (${leg.distanceKm.toFixed(1)}km)`,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
