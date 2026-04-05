/**
 * Pass 8: persist_completed_trip
 * 正本保存 — completed 時のみ実行
 * 設計書 §4.2 pass 8
 *
 * DraftTrip + Timeline → Itinerary 変換 → tripService で保存
 */

import type {
  PlanRunPassContext,
  PlanRunPassResult,
  TimelineDay,
} from '@/types/plan-run';
import type { Itinerary, DayPlan, Activity, TransitInfo } from '@/types/itinerary';
import { tripService } from '@/lib/trips/service';
import { randomUUID } from 'crypto';

// ============================================
// Domain → Itinerary 変換
// ============================================

function timelineToItinerary(
  run: import('@/types/plan-run').PlanRun,
): Itinerary {
  const draft = run.draftTrip!;
  const timeline = run.timeline!;
  const req = run.normalizedInput!;
  const frame = run.planFrame!;

  const days: DayPlan[] = timeline.map((td: TimelineDay) => {
    const draftDay = draft.cities
      .flatMap((c) => c.days)
      .find((d) => d.dayNumber === td.dayNumber);

    const activities: Activity[] = td.blocks
      .filter((b) => b.blockType !== 'stay_area_placeholder')
      .map((b) => ({
        time: b.startTime,
        activity: b.placeName,
        description: '',
        activityType:
          b.blockType === 'meal' ? 'meal'
          : b.blockType === 'intercity_move_placeholder' ? 'transit'
          : 'spot',
        searchQuery: draftDay?.blocks.find((db) => db.draftId === b.draftId)?.searchQuery,
      }));

    const transitBlocks = td.blocks.filter((b) => b.blockType === 'intercity_move_placeholder');
    const transit: TransitInfo | undefined = transitBlocks.length > 0
      ? {
          type: 'other',
          departure: { place: transitBlocks[0].placeName.split('→')[0]?.trim() ?? '' },
          arrival: { place: transitBlocks[0].placeName.split('→')[1]?.trim() ?? '' },
        }
      : undefined;

    return {
      day: td.dayNumber,
      title: td.title,
      transit,
      activities,
    };
  });

  return {
    id: randomUUID(),
    tripId: undefined,
    destination: frame.primaryDestination,
    description: '',
    days,
    generationStatus: 'completed',
    completionLevel: 'core_validated',
    destinationSummary: {
      primaryDestination: frame.primaryDestination,
      destinations: frame.destinations,
      durationDays: req.durationDays,
    },
  };
}

// ============================================
// Pass Implementation
// ============================================

export async function persistCompletedTripPass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<{ tripId: string; tripVersion: number }>> {
  const start = Date.now();
  const { run } = ctx;

  if (!run.draftTrip || !run.timeline || !run.planFrame || !run.normalizedInput) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['必要なデータが存在しません (draftTrip / timeline / planFrame / normalizedInput)'],
      durationMs: Date.now() - start,
    };
  }

  // hero image 取得 (best-effort)
  const destination = run.planFrame.primaryDestination;
  let heroImage: string | undefined;
  let heroImagePhotographer: string | undefined;
  let heroImagePhotographerUrl: string | undefined;

  if (destination && ctx.budget.remainingMs() >= 4_000) {
    try {
      const unsplashResult = await Promise.race([
        import('@/lib/unsplash').then(({ getUnsplashImage }) => getUnsplashImage(destination)),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3_000)),
      ]);
      if (unsplashResult) {
        heroImage = unsplashResult.url;
        heroImagePhotographer = unsplashResult.photographer;
        heroImagePhotographerUrl = unsplashResult.photographerUrl;
      }
    } catch {
      // best-effort only
    }
  }

  let itinerary = timelineToItinerary(run);
  if (heroImage) {
    itinerary = { ...itinerary, heroImage, heroImagePhotographer, heroImagePhotographerUrl };
  }

  try {
    const result = await tripService.persistTripVersion({
      itinerary,
      userId: run.userId ?? null,
      createdBy: 'agent',
      createdFromRunId: run.id,
      changeType: 'create',
    });

    return {
      outcome: 'completed',
      data: { tripId: result.tripId, tripVersion: result.version },
      newState: 'completed',
      warnings: [],
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[persist_completed_trip] trip 保存失敗:', message);
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: [`trip の保存に失敗しました: ${message}`],
      durationMs: Date.now() - start,
    };
  }
}
