/**
 * Pass F: Timeline Construct
 * DraftPlan + VerifiedEntities → タイムスロット付きタイムライン
 *
 * v3 の optimizeRoutes() + buildTimeline() を直接呼び出す。
 * 純粋な計算 — AI 呼び出しなし、決定論的、高速 (2s budget)。
 */

import type {
  PassContext,
  PassResult,
  TimelineState,
  VerifiedEntity,
} from '@/types/plan-generation';
import { optimizeRoutes } from '@/lib/services/itinerary/steps/route-optimizer';
import { buildTimeline } from '@/lib/services/itinerary/steps/timeline-builder';
import {
  draftStopToSelectedStop,
  draftPlanToDayStructures,
  timelineDaysToState,
} from '../bridges/draft-to-v3';
import type { SelectedStop } from '@/types/itinerary-pipeline';

// ============================================
// Pass Implementation
// ============================================

export async function timelineConstructPass(
  ctx: PassContext,
): Promise<PassResult<TimelineState>> {
  const start = Date.now();

  const { draftPlan, normalizedInput, verifiedEntities } = ctx.session;
  if (!draftPlan || !normalizedInput) {
    return {
      outcome: 'failed_terminal',
      warnings: ['Missing draftPlan or normalizedInput for timeline construction'],
      durationMs: Date.now() - start,
    };
  }

  // verifiedEntities → draftId lookup
  const verifiedMap = new Map<string, VerifiedEntity>(
    verifiedEntities.map(v => [v.draftId, v]),
  );

  // DraftStop[] → SelectedStop[]
  const selectedStops: SelectedStop[] = draftPlan.days.flatMap(day =>
    day.stops.map(stop =>
      draftStopToSelectedStop(stop, day.day, verifiedMap.get(stop.draftId)),
    ),
  );

  // DayStructure[]
  const dayStructures = draftPlanToDayStructures(draftPlan);

  // Route optimization (insertion heuristic + 2-opt)
  const optimizedDays = optimizeRoutes(selectedStops, dayStructures, normalizedInput);

  // Timeline building (time-slot allocation + meal window snapping)
  const timelineDays = buildTimeline(optimizedDays, normalizedInput);

  // Compact timeline for session storage
  const timelineState = timelineDaysToState(timelineDays, verifiedEntities);

  return {
    outcome: 'completed',
    data: timelineState,
    warnings: timelineState.warnings,
    durationMs: Date.now() - start,
    metadata: {
      totalStops: timelineState.metadata.totalStops,
      totalTravelMinutes: timelineState.metadata.totalTravelMinutes,
      daysCount: timelineDays.length,
    },
  };
}
