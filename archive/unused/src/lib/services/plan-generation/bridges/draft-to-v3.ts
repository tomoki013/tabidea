/**
 * Bridge: DraftStop ↔ v3 Pipeline Types
 *
 * Phase 2 のパスが v3 ステップ関数 (resolvePlaces, optimizeRoutes, buildTimeline)
 * を直接呼び出すための型変換アダプター。コード複製ゼロ。
 */

import type {
  SemanticCandidate,
  SelectedStop,
  DayStructure,
  TimelineDay,
  TimelineNode,
  RouteLeg,
  TransportMode,
  OptimizedDay,
} from '@/types/itinerary-pipeline';
import type { TransitType } from '@/types/itinerary';
import type { PlaceDetails } from '@/types/places';
import type {
  DraftStop,
  DraftPlan,
  DraftDay,
  VerifiedEntity,
  PlanGenerationSession,
  TimelineState,
  TimelineDayCompact,
  TimelineNodeCompact,
  TimelineLegCompact,
} from '@/types/plan-generation';

// ============================================
// DraftStop → SemanticCandidate
// ============================================

const CONFIDENCE_TO_PRIORITY: Record<DraftStop['aiConfidence'], number> = {
  high: 8,
  medium: 5,
  low: 3,
};

/**
 * DraftStop を SemanticCandidate に変換 (resolvePlaces への入力)
 */
export function draftStopToCandidate(
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

// ============================================
// DraftStop → SelectedStop
// ============================================

/**
 * DraftStop + 検証済みエンティティ → SelectedStop (optimizeRoutes / buildTimeline への入力)
 */
export function draftStopToSelectedStop(
  stop: DraftStop,
  dayNum: number,
  verified?: VerifiedEntity,
): SelectedStop {
  const candidate = draftStopToCandidate(stop, dayNum);

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

  const feasibilityScore = CONFIDENCE_TO_PRIORITY[stop.aiConfidence] * 10;

  return {
    candidate,
    placeDetails,
    feasibilityScore,
    warnings: [],
    semanticId: stop.draftId,
  };
}

// ============================================
// DraftPlan → DayStructure[]
// ============================================

/**
 * DraftPlan の日構造を v3 DayStructure[] に変換 (optimizeRoutes への入力)
 */
export function draftPlanToDayStructures(plan: DraftPlan): DayStructure[] {
  return plan.days.map((day: DraftDay) => ({
    day: day.day,
    title: day.title,
    mainArea: day.mainArea,
    overnightLocation: day.overnightLocation,
    summary: day.summary,
  }));
}

// ============================================
// v3 TimelineDay[] → TimelineState
// ============================================

/**
 * v3 TimelineDay[] をセッション保存用の TimelineState に変換
 */
export function timelineDaysToState(
  timelineDays: TimelineDay[],
  verifiedEntities: VerifiedEntity[],
): TimelineState {
  const verifiedMap = new Map(verifiedEntities.map(v => [v.draftId, v]));
  let totalTravelMinutes = 0;
  let totalStops = 0;

  const days: TimelineDayCompact[] = timelineDays.map(td => {
    const nodes: TimelineNodeCompact[] = td.nodes.map((node: TimelineNode) => {
      totalStops++;
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

    const legs: TimelineLegCompact[] = td.legs.map((leg: RouteLeg) => {
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
      day: td.day,
      title: td.title,
      overnightLocation: td.overnightLocation,
      startTime: td.startTime,
      nodes,
      legs,
    };
  });

  return {
    days,
    warnings: timelineDays.flatMap(td =>
      td.nodes.flatMap((n: TimelineNode) => n.warnings),
    ),
    metadata: {
      routeOptimizationApplied: true,
      totalTravelMinutes,
      totalStops,
    },
  };
}

// ============================================
// Session → v3 TimelineDay[] (復元)
// ============================================

/**
 * セッションデータから v3 TimelineDay[] を復元 (narrative renderer への入力)
 */
export function reconstructTimelineDays(
  session: PlanGenerationSession,
): TimelineDay[] {
  const { draftPlan, timelineState, verifiedEntities } = session;
  if (!draftPlan || !timelineState) {
    throw new Error('Cannot reconstruct timeline: missing draftPlan or timelineState');
  }

  // draftId → DraftStop のルックアップ
  const stopMap = new Map<string, { stop: DraftStop; day: number }>();
  for (const day of draftPlan.days) {
    for (const stop of day.stops) {
      stopMap.set(stop.draftId, { stop, day: day.day });
    }
  }

  const verifiedMap = new Map(verifiedEntities.map(v => [v.draftId, v]));

  return timelineState.days.map((compactDay: TimelineDayCompact) => {
    const nodes: TimelineNode[] = compactDay.nodes.map(
      (compactNode: TimelineNodeCompact) => {
        const entry = stopMap.get(compactNode.draftId);
        const verified = verifiedMap.get(compactNode.draftId);
        const dayNum = entry?.day ?? compactDay.day;

        const selectedStop = entry
          ? draftStopToSelectedStop(entry.stop, dayNum, verified)
          : createFallbackSelectedStop(compactNode.draftId, dayNum);

        return {
          stop: selectedStop,
          arrivalTime: compactNode.arrivalTime,
          departureTime: compactNode.departureTime,
          stayMinutes: compactNode.stayMinutes,
          warnings: compactNode.warnings,
          semanticId: compactNode.draftId,
        };
      },
    );

    const legs: RouteLeg[] = compactDay.legs.map(
      (compactLeg: TimelineLegCompact) => ({
        fromIndex: compactLeg.fromIndex,
        toIndex: compactLeg.toIndex,
        distanceKm: compactLeg.distanceKm,
        durationMinutes: compactLeg.durationMinutes,
        mode: compactLeg.mode,
        transitType: transportModeToTransitType(compactLeg.mode),
      }),
    );

    return {
      day: compactDay.day,
      title: compactDay.title,
      nodes,
      legs,
      overnightLocation: compactDay.overnightLocation,
      startTime: compactDay.startTime,
    };
  });
}

// ============================================
// Helpers
// ============================================

/**
 * 全 DraftStop を一括で SemanticCandidate[] に変換
 */
export function flattenDraftStopsAsCandidates(plan: DraftPlan): SemanticCandidate[] {
  return plan.days.flatMap((day: DraftDay) =>
    day.stops.map((stop: DraftStop) => draftStopToCandidate(stop, day.day)),
  );
}

/**
 * 全 DraftStop を一括で SelectedStop[] に変換
 */
export function flattenDraftStopsAsSelected(
  plan: DraftPlan,
  verifiedEntities: VerifiedEntity[],
): SelectedStop[] {
  const verifiedMap = new Map(verifiedEntities.map(v => [v.draftId, v]));
  return plan.days.flatMap((day: DraftDay) =>
    day.stops.map((stop: DraftStop) =>
      draftStopToSelectedStop(stop, day.day, verifiedMap.get(stop.draftId)),
    ),
  );
}

/** v3 OptimizedDay[] → day ごとのノード順を DraftPlan の stops 順序に反映 */
export function extractOptimizedOrder(
  optimizedDays: OptimizedDay[],
): Map<number, string[]> {
  const orderByDay = new Map<number, string[]>();
  for (const od of optimizedDays) {
    const ids = od.nodes.map(n => n.stop.semanticId ?? '').filter(Boolean);
    orderByDay.set(od.day, ids);
  }
  return orderByDay;
}

function transportModeToTransitType(mode: TransportMode): TransitType {
  switch (mode) {
    case 'walking': return 'walking';
    case 'public_transit': return 'train';
    case 'car': return 'car';
    case 'bicycle': return 'other';
    default: return 'other';
  }
}

function createFallbackSelectedStop(
  draftId: string,
  dayNum: number,
): SelectedStop {
  return {
    candidate: {
      name: `[unknown:${draftId.slice(0, 8)}]`,
      role: 'filler',
      priority: 1,
      dayHint: dayNum,
      timeSlotHint: 'flexible',
      stayDurationMinutes: 30,
      searchQuery: '',
      semanticId: draftId,
    },
    feasibilityScore: 0,
    warnings: ['Could not resolve original DraftStop'],
    semanticId: draftId,
  };
}
