import type {
  DayStructure,
  SelectedStop,
  SemanticCandidate,
} from '@/types/itinerary-pipeline';
import type {
  DraftDay,
  DraftPlan,
  DraftStop,
  PlanGenerationSession,
  TimelineDayCompact,
  TimelineLegCompact,
  TimelineNodeCompact,
  TimelineState,
  VerifiedEntity,
} from '@/types/plan-generation';
import type { PlaceDetails } from '@/types/places';

const CONFIDENCE_TO_PRIORITY: Record<DraftStop['aiConfidence'], number> = {
  high: 8,
  medium: 5,
  low: 3,
};

export interface ReconstructedTimelineNode {
  day: number;
  draftId: string;
  arrivalTime: string;
  departureTime: string;
  stayMinutes: number;
  warnings: string[];
  draftStop: DraftStop;
  verified?: VerifiedEntity;
  placeDetails?: Partial<PlaceDetails>;
}

export interface ReconstructedTimelineDay {
  day: number;
  title: string;
  overnightLocation: string;
  startTime: string;
  legs: TimelineLegCompact[];
  nodes: ReconstructedTimelineNode[];
}

export function draftStopToSemanticCandidate(
  stop: DraftStop,
  dayNum: number,
): SemanticCandidate {
  return {
    name: stop.name,
    role: stop.role,
    priority: CONFIDENCE_TO_PRIORITY[stop.aiConfidence],
    dayHint: dayNum,
    timeSlotHint: stop.timeSlotHint,
    stayDurationMinutes: stop.stayDurationMinutes,
    searchQuery: stop.searchQuery,
    categoryHint: stop.categoryHint,
    activityLabel: stop.activityLabel,
    locationEn: stop.locationEn,
    semanticId: stop.draftId,
    rationale: stop.rationale,
    areaHint: stop.areaHint,
    indoorOutdoor: stop.indoorOutdoor,
    tags: stop.tags,
  };
}

export function draftStopToSelectedStop(
  stop: DraftStop,
  dayNum: number,
  verified?: VerifiedEntity,
): SelectedStop {
  const candidate = draftStopToSemanticCandidate(stop, dayNum);

  let placeDetails: PlaceDetails | undefined;
  if (verified?.details?.placeId) {
    placeDetails = {
      placeId: verified.details.placeId,
      name: stop.name,
      formattedAddress: verified.details.formattedAddress ?? '',
      latitude: verified.details.latitude ?? 0,
      longitude: verified.details.longitude ?? 0,
      rating: verified.details.rating,
      businessStatus: verified.details.businessStatus as PlaceDetails['businessStatus'],
      googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${verified.details.placeId}`,
    };
  }

  return {
    candidate,
    placeDetails,
    feasibilityScore: CONFIDENCE_TO_PRIORITY[stop.aiConfidence] * 10,
    warnings: [],
    semanticId: stop.draftId,
  };
}

export function draftPlanToDayStructures(plan: DraftPlan): DayStructure[] {
  return plan.days.map((day: DraftDay) => ({
    day: day.day,
    title: day.title,
    mainArea: day.mainArea,
    overnightLocation: day.overnightLocation,
    summary: day.summary,
  }));
}

export function timelineDaysToTimelineState(
  timelineDays: Array<{
    day: number;
    title: string;
    overnightLocation: string;
    startTime: string;
    nodes: Array<{
      arrivalTime: string;
      departureTime: string;
      stayMinutes: number;
      warnings: string[];
      semanticId?: string;
      stop: {
        semanticId?: string;
        placeDetails?: {
          placeId?: string;
          latitude?: number;
          longitude?: number;
        };
      };
    }>;
    legs: Array<{
      fromIndex: number;
      toIndex: number;
      distanceKm: number;
      durationMinutes: number;
      mode: TimelineLegCompact['mode'];
    }>;
  }>,
  verifiedEntities: VerifiedEntity[],
): TimelineState {
  const verifiedMap = new Map(verifiedEntities.map((entity) => [entity.draftId, entity]));
  let totalTravelMinutes = 0;
  let totalStops = 0;

  const days: TimelineDayCompact[] = timelineDays.map((timelineDay) => {
    const nodes: TimelineNodeCompact[] = timelineDay.nodes.map((node) => {
      totalStops += 1;
      const draftId = node.semanticId ?? node.stop.semanticId ?? '';
      const verified = verifiedMap.get(draftId);
      return {
        draftId,
        arrivalTime: node.arrivalTime,
        departureTime: node.departureTime,
        stayMinutes: node.stayMinutes,
        warnings: node.warnings,
        placeId: verified?.details?.placeId ?? node.stop.placeDetails?.placeId,
        latitude: node.stop.placeDetails?.latitude,
        longitude: node.stop.placeDetails?.longitude,
      };
    });

    const legs: TimelineLegCompact[] = timelineDay.legs.map((leg) => {
      totalTravelMinutes += leg.durationMinutes;
      return {
        fromIndex: leg.fromIndex,
        toIndex: leg.toIndex,
        distanceKm: leg.distanceKm,
        durationMinutes: leg.durationMinutes,
        mode: leg.mode,
      };
    });

    return {
      day: timelineDay.day,
      title: timelineDay.title,
      overnightLocation: timelineDay.overnightLocation,
      startTime: timelineDay.startTime,
      nodes,
      legs,
    };
  });

  return {
    days,
    warnings: timelineDays.flatMap((timelineDay) =>
      timelineDay.nodes.flatMap((node) => node.warnings),
    ),
    metadata: {
      routeOptimizationApplied: true,
      totalTravelMinutes,
      totalStops,
    },
  };
}

export function reconstructTimelineDays(
  session: Pick<PlanGenerationSession, 'draftPlan' | 'timelineState' | 'verifiedEntities'>,
): ReconstructedTimelineDay[] {
  const { draftPlan, timelineState, verifiedEntities } = session;
  if (!draftPlan || !timelineState) {
    throw new Error('Cannot reconstruct timeline: missing draftPlan or timelineState');
  }

  const stopMap = new Map<string, { stop: DraftStop; day: number }>();
  for (const day of draftPlan.days) {
    for (const stop of day.stops) {
      stopMap.set(stop.draftId, { stop, day: day.day });
    }
  }

  const verifiedMap = new Map(verifiedEntities.map((entity) => [entity.draftId, entity]));

  return timelineState.days.map((timelineDay) => ({
    day: timelineDay.day,
    title: timelineDay.title,
    overnightLocation: timelineDay.overnightLocation,
    startTime: timelineDay.startTime,
    legs: timelineDay.legs,
    nodes: timelineDay.nodes.map((node) => {
      const entry = stopMap.get(node.draftId);
      if (!entry) {
        throw new Error(`Missing DraftStop for timeline node ${node.draftId}`);
      }

      const verified = verifiedMap.get(node.draftId);
      return {
        day: entry.day,
        draftId: node.draftId,
        arrivalTime: node.arrivalTime,
        departureTime: node.departureTime,
        stayMinutes: node.stayMinutes,
        warnings: node.warnings,
        draftStop: entry.stop,
        verified,
        placeDetails: verified?.details?.placeId
          ? {
              placeId: verified.details.placeId,
              name: entry.stop.name,
              formattedAddress: verified.details.formattedAddress,
              latitude: verified.details.latitude,
              longitude: verified.details.longitude,
              rating: verified.details.rating,
              businessStatus: verified.details.businessStatus as PlaceDetails['businessStatus'] | undefined,
            }
          : {
              placeId: node.placeId,
              latitude: node.latitude,
              longitude: node.longitude,
            },
      };
    }),
  }));
}
