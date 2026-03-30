import { randomUUID } from 'crypto';
import type {
  Activity,
  ActivityType,
  ActivityValidation,
  DayPlan,
  Itinerary,
  ItineraryBookingStatus,
  ItinerarySourceOfTruth,
  ModelInfo,
  TimelineItem,
  TransitInfo,
  TransitType,
} from '@/types/itinerary';
import type { PlanGenerationSession, VerificationStatus, VerifiedEntity } from '@/types/plan-generation';
import { injectAccommodations, type AccommodationInjectionContext } from '@/lib/services/itinerary/inject-accommodations';
import { injectFlights, type FlightInjectionContext } from '@/lib/services/itinerary/inject-flights';
import { enrichItineraryMetadata } from '@/lib/trips/metadata';
import { inferTransitType } from '@/lib/services/google/distance-estimator';
import { reconstructTimelineDays } from './draft-to-timeline';

const DEFAULT_EDITABLE_FIELDS = ['time', 'activity', 'description'];

function mapVerificationStatus(status?: VerificationStatus): Activity['verificationStatus'] {
  switch (status) {
    case 'confirmed':
      return 'verified';
    case 'weakly_confirmed':
      return 'partial';
    case 'invalid':
    case 'unverifiable':
    default:
      return 'unknown';
  }
}

function mapConfidence(aiConfidence: 'high' | 'medium' | 'low', status?: VerificationStatus): number {
  if (status === 'confirmed') return 0.92;
  if (status === 'weakly_confirmed') return 0.72;
  if (status === 'invalid') return 0.1;

  switch (aiConfidence) {
    case 'high':
      return 0.65;
    case 'medium':
      return 0.5;
    case 'low':
    default:
      return 0.35;
  }
}

function buildSourceOfTruth(verified?: VerifiedEntity): ItinerarySourceOfTruth[] {
  if (verified?.details?.placeId) {
    return [{
      kind: 'tool',
      tool: 'search_places',
      provider: 'google_places',
      verifiedAt: verified.verifiedAt,
    }];
  }

  return [{ kind: 'llm', provider: 'tabidea_v4' }];
}

function buildRiskFlags(verified: VerifiedEntity | undefined, warnings: string[]): string[] {
  const flags = new Set<string>(warnings);
  if (!verified) {
    flags.add('verification_pending');
    return [...flags];
  }

  switch (verified.status) {
    case 'unverifiable':
      flags.add('place_unverified');
      break;
    case 'weakly_confirmed':
      flags.add('weak_match');
      break;
    case 'invalid':
      flags.add('invalid_place');
      break;
    default:
      break;
  }

  if (verified.details?.scheduleConflict) {
    flags.add('schedule_conflict');
  }
  if (verified.details?.geographicMismatch) {
    flags.add('geographic_mismatch');
  }

  return [...flags];
}

function buildBookingStatus(activityType: ActivityType): ItineraryBookingStatus {
  if (activityType === 'accommodation') {
    return { type: 'optional' };
  }

  return { type: 'not_required' };
}

function mapRoleToActivityType(role: string): ActivityType {
  switch (role) {
    case 'meal':
      return 'meal';
    case 'accommodation':
      return 'accommodation';
    default:
      return 'spot';
  }
}

function buildValidation(stopName: string, verified?: VerifiedEntity): ActivityValidation | undefined {
  if (!verified?.details) {
    return undefined;
  }

  const confidence =
    verified.status === 'confirmed'
      ? 'high'
      : verified.status === 'weakly_confirmed'
        ? 'medium'
        : 'unverified';

  return {
    spotName: stopName,
    isVerified: verified.status === 'confirmed',
    confidence,
    source: 'google_places',
    placeId: verified.details.placeId,
    errorCode: verified.status === 'invalid' ? 'ZERO_RESULTS' : undefined,
    details: {
      address: verified.details.formattedAddress,
      rating: verified.details.rating,
      latitude: verified.details.latitude,
      longitude: verified.details.longitude,
    },
  };
}

function buildActivity(
  node: ReturnType<typeof reconstructTimelineDays>[number]['nodes'][number],
  description: string,
): Activity {
  const verificationStatus = mapVerificationStatus(node.verified?.status);
  const activityType = mapRoleToActivityType(node.draftStop.role);
  const activityName =
    node.draftStop.activityLabel
    ?? node.placeDetails?.name
    ?? node.draftStop.name;

  return {
    time: node.arrivalTime,
    activity: activityName,
    description,
    activityType,
    locationEn: node.draftStop.locationEn,
    searchQuery: node.draftStop.searchQuery,
    validation: buildValidation(node.draftStop.name, node.verified),
    metadata: {
      nodeId: node.draftId,
      semanticId: node.draftId,
    },
    sourceOfTruth: buildSourceOfTruth(node.verified),
    confidence: mapConfidence(node.draftStop.aiConfidence, node.verified?.status),
    needsConfirmation: verificationStatus !== 'verified',
    verificationStatus,
    fallbackCandidates: [],
    editableFields: [...DEFAULT_EDITABLE_FIELDS],
    riskFlags: buildRiskFlags(node.verified, node.warnings),
    bookingStatus: buildBookingStatus(activityType),
  };
}

function buildTransitInfo(
  leg: ReturnType<typeof reconstructTimelineDays>[number]['legs'][number],
  fromActivity: Activity,
  toActivity: Activity,
): TransitInfo {
  return {
    type: inferTransitType(leg.distanceKm, leg.mode) as TransitType,
    departure: {
      place: fromActivity.activity,
      time: fromActivity.time,
    },
    arrival: {
      place: toActivity.activity,
      time: toActivity.time,
    },
    duration: `${leg.durationMinutes}m`,
    memo: `${leg.distanceKm.toFixed(1)}km`,
  };
}

export function sessionToItinerary(session: PlanGenerationSession): Itinerary {
  const { draftPlan, normalizedInput, narrativeState, generationProfile, evaluationReport } = session;
  if (!draftPlan || !normalizedInput || !session.timelineState || !narrativeState) {
    throw new Error('Cannot build itinerary from incomplete run state');
  }

  const timelineDays = reconstructTimelineDays(session);
  const narrativeByDay = new Map(narrativeState.dayNarratives.map((day) => [day.day, day]));

  let days: DayPlan[] = timelineDays.map((timelineDay) => {
    const narrativeDay = narrativeByDay.get(timelineDay.day);
    const activities = timelineDay.nodes.map((node) => {
      const narrativeActivity = narrativeDay?.activities.find((activity) => activity.draftId === node.draftId);
      return buildActivity(node, narrativeActivity?.description ?? node.draftStop.rationale);
    });

    const timelineItems: TimelineItem[] = [];
    for (let index = 0; index < activities.length; index += 1) {
      if (index > 0 && timelineDay.legs[index - 1]) {
        timelineItems.push({
          itemType: 'transit',
          data: buildTransitInfo(timelineDay.legs[index - 1], activities[index - 1], activities[index]),
          time: activities[index - 1].time,
        });
      }

      timelineItems.push({
        itemType: 'activity',
        data: activities[index],
      });
    }

    return {
      day: timelineDay.day,
      title: narrativeDay?.title ?? timelineDay.title,
      activities,
      timelineItems,
    };
  });

  const flightContext: FlightInjectionContext = {
    homeBaseCity: normalizedInput.homeBaseCity ?? session.pipelineContext?.homeBaseCity,
    destination: draftPlan.destination,
    durationDays: draftPlan.days.length,
    startDate: normalizedInput.startDate,
    fixedSchedule: normalizedInput.fixedSchedule ?? [],
  };
  days = injectFlights(days, flightContext);

  const accommodationContext: AccommodationInjectionContext = {
    overnightLocations: draftPlan.days.map((day) => day.overnightLocation),
    startDate: normalizedInput.startDate,
    destination: draftPlan.destination,
  };
  days = injectAccommodations(days, accommodationContext);

  const modelInfo: ModelInfo | undefined = generationProfile
    ? {
        modelName: generationProfile.modelName,
        tier: generationProfile.modelTier,
      }
    : undefined;

  const totalStops = draftPlan.days.reduce((sum, day) => sum + day.stops.length, 0);
  const verifiedCount = session.verifiedEntities.filter((entity) => entity.status === 'confirmed').length;

  return enrichItineraryMetadata({
    id: randomUUID(),
    destination: draftPlan.destination,
    description: narrativeState.description || draftPlan.description,
    reasoning: draftPlan.tripIntentSummary,
    days,
    modelInfo,
    memoryApplied: Boolean(session.pipelineContext?.memoryEnabled),
    scores: evaluationReport
      ? {
          utility: Number((evaluationReport.overallScore / 100).toFixed(2)),
        }
      : undefined,
  }, {
    completionLevel:
      verifiedCount === 0
        ? 'draft_only'
        : verifiedCount >= totalStops
          ? 'fully_verified'
          : 'partial_verified',
    title: `${draftPlan.destination} ${draftPlan.days.length}日間の旅程`,
    destinationSummary: {
      primaryDestination: draftPlan.destination,
      durationDays: draftPlan.days.length,
      travelDates: normalizedInput.startDate
        ? {
            start: normalizedInput.startDate,
          }
        : undefined,
      styleTags: draftPlan.themes,
    },
    generatedConstraints: {
      toolBudgetMode: verifiedCount > 0 ? 'selective_verify' : 'draft_only',
    },
  });
}
