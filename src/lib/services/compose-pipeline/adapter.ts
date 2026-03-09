/**
 * Adapter: ComposedItinerary → Itinerary 変換
 * 後方互換性維持のための変換レイヤー
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
  TransportMode,
} from '@/types/compose-pipeline';
import type { TransitType } from '@/types/itinerary';

// ============================================
// Transport mode mapping
// ============================================

const MODE_TO_TRANSIT_TYPE: Record<TransportMode, TransitType> = {
  walking: 'other',
  public_transit: 'train',
  car: 'car',
  bicycle: 'other',
};

const MODE_TO_LABEL: Record<TransportMode, string> = {
  walking: '徒歩',
  public_transit: '公共交通',
  car: '車',
  bicycle: '自転車',
};

// ============================================
// Public API
// ============================================

/**
 * ComposedItinerary を Itinerary 型に変換
 */
export function composedToItinerary(
  composed: ComposedItinerary,
  modelInfo?: ModelInfo
): Itinerary {
  const id = Math.random().toString(36).substring(2, 15);

  const days: DayPlan[] = composed.days.map((day) =>
    convertDay(day)
  );

  return {
    id,
    destination: composed.destination,
    description: composed.description,
    heroImage: composed.heroImage?.url,
    heroImagePhotographer: composed.heroImage?.photographer,
    heroImagePhotographerUrl: composed.heroImage?.photographerUrl,
    days,
    modelInfo,
  };
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

  const result: Activity = {
    time: node.arrivalTime,
    activity: activity.activityName,
    description: activity.description,
    activityType,
    searchQuery: candidate.searchQuery,
    source: activity.source,
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

  return {
    type: MODE_TO_TRANSIT_TYPE[leg.mode],
    departure: {
      place: fromName,
      time: fromActivity?.node.departureTime,
    },
    arrival: {
      place: toName,
      time: toActivity?.node.arrivalTime,
    },
    duration: formatDuration(leg.durationMinutes),
    memo: `${MODE_TO_LABEL[leg.mode]} (${leg.distanceKm.toFixed(1)}km)`,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
