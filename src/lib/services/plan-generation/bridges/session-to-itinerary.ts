/**
 * Final Adapter: Session → Itinerary
 *
 * PlanGenerationSession の蓄積データから標準 Itinerary 型を生成する。
 * v3 の composedToItinerary() を再利用。
 */

import type { Itinerary, ModelInfo } from '@/types/itinerary';
import type {
  ComposedItinerary,
  ComposePipelineMetadata,
  NarrativeDay,
  NarrativeActivity,
  RouteLeg,
} from '@/types/itinerary-pipeline';
import type { PlanGenerationSession, DayNarrative } from '@/types/plan-generation';
import { composedToItinerary, type AdapterContext } from '@/lib/services/itinerary/adapter';
import { reconstructTimelineDays } from './draft-to-v3';

/**
 * セッションデータから Itinerary を生成
 */
export function sessionToItinerary(session: PlanGenerationSession): Itinerary {
  const { draftPlan, narrativeState, normalizedInput, timelineState, generationProfile } = session;

  if (!draftPlan || !narrativeState || !normalizedInput || !timelineState) {
    throw new Error(
      'Cannot build Itinerary: missing ' +
      [
        !draftPlan && 'draftPlan',
        !narrativeState && 'narrativeState',
        !normalizedInput && 'normalizedInput',
        !timelineState && 'timelineState',
      ].filter(Boolean).join(', '),
    );
  }

  // v3 TimelineDay[] を復元
  const timelineDays = reconstructTimelineDays(session);

  // NarrativeState + TimelineDay[] → NarrativeDay[] (v3 format)
  const narrativeMap = new Map(
    narrativeState.dayNarratives.map(dn => [dn.day, dn]),
  );

  const narrativeDays: NarrativeDay[] = timelineDays.map(td => {
    const dayNarrative = narrativeMap.get(td.day);

    const activities: NarrativeActivity[] = td.nodes.map(node => {
      const draftId = node.semanticId ?? node.stop.semanticId ?? '';
      const actNarrative = dayNarrative?.activities.find(
        a => a.draftId === draftId,
      );

      return {
        node,
        description: actNarrative?.description ?? '',
        activityName: actNarrative?.activityName ?? node.stop.candidate.name,
      };
    });

    return {
      day: td.day,
      title: dayNarrative?.title ?? td.title,
      activities,
      legs: td.legs,
      overnightLocation: td.overnightLocation,
    };
  });

  // ComposedItinerary を構築
  const totalStops = draftPlan.days.reduce((sum, d) => sum + d.stops.length, 0);
  const verifiedCount = session.verifiedEntities.filter(v => v.status === 'confirmed').length;

  const metadata: ComposePipelineMetadata = {
    pipelineVersion: 'v4',
    candidateCount: totalStops,
    resolvedCount: verifiedCount,
    filteredCount: 0,
    placeResolveEnabled: session.verifiedEntities.length > 0,
    stepTimings: {},
    modelName: generationProfile?.modelName ?? 'unknown',
    modelTier: generationProfile?.modelTier ?? 'flash',
  };

  const composed: ComposedItinerary = {
    destination: draftPlan.destination,
    description: narrativeState.description || draftPlan.description,
    days: narrativeDays,
    warnings: session.warnings,
    metadata,
  };

  // モデル情報
  const modelInfo: ModelInfo | undefined = generationProfile
    ? {
        modelName: generationProfile.modelName,
        tier: generationProfile.modelTier,
      }
    : undefined;

  // AdapterContext
  const overnightLocations = draftPlan.days.map(d => d.overnightLocation);
  const context: AdapterContext = {
    destination: draftPlan.destination,
    durationDays: draftPlan.days.length,
    startDate: normalizedInput.startDate,
    overnightLocations,
    fixedSchedule: normalizedInput.fixedSchedule ?? [],
  };

  return composedToItinerary(composed, modelInfo, context);
}
