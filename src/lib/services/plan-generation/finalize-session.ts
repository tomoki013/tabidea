import type { PlanGenerationSession } from '@/types/plan-generation';
import { tripService, type PersistTripVersionResult } from '@/lib/trips/service';
import { sessionToItinerary } from './transform/timeline-to-itinerary';
import { createPerformanceTimer } from '@/lib/utils/performance-timer';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';

export interface FinalizeSessionResult extends PersistTripVersionResult {
  totalDurationMs: number;
}

interface FinalizeSessionOptions {
  includeHeroImage?: boolean;
}

export async function finalizeSessionToTrip(
  session: PlanGenerationSession,
  options: FinalizeSessionOptions = {},
): Promise<FinalizeSessionResult> {
  const timer = createPerformanceTimer('v4:finalize');
  const totalDurationMs = Date.now() - new Date(session.createdAt).getTime();
  const expectedDayCount = session.normalizedInput?.durationDays;

  const itinerary = await timer.measure('session_to_itinerary', () =>
    Promise.resolve(sessionToItinerary(session)),
  );

  if (!expectedDayCount) {
    throw new Error('finalize_incomplete_session_contract');
  }

  if (itinerary.days.length === 0) {
    throw new Error('finalize_empty_itinerary');
  }

  if (itinerary.days.length !== expectedDayCount) {
    throw new Error('finalize_incomplete_itinerary_days');
  }

  const destination = session.draftPlan?.destination ?? '';
  if (destination && options.includeHeroImage !== false) {
    try {
      const heroImage = await timer.measure('hero_image', async () => {
        const { getUnsplashImage } = await import('@/lib/unsplash');
        return Promise.race([
          getUnsplashImage(destination),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000)),
        ]);
      });
      if (heroImage) {
        itinerary.heroImage = heroImage.url;
        itinerary.heroImagePhotographer = heroImage.photographer;
        itinerary.heroImagePhotographerUrl = heroImage.photographerUrl;
      }
    } catch {
      // Decorative only
    }
  }

  logRunCheckpoint({
    checkpoint: 'trip_persist_started',
    runId: session.id,
    state: session.state,
    pipelineContext: session.pipelineContext,
    dayCount: itinerary.days.length,
    completionLevel: itinerary.completionLevel,
    totalDurationMs,
  });

  const persistedTrip = await timer.measure('persist_trip_version', () =>
    tripService.persistTripVersion({
      itinerary,
      userId: session.userId,
      createdBy: 'agent',
      createdFromRunId: session.id,
      changeType: 'create',
      generatedConstraints: {
        runtimeLimitMs: 30000,
        toolBudgetMode: itinerary.generatedConstraints?.toolBudgetMode ?? 'safe',
      },
    }),
  );

  timer.log();

  logRunCheckpoint({
    checkpoint: 'trip_persist_completed',
    runId: session.id,
    tripId: persistedTrip.tripId,
    state: session.state,
    pipelineContext: session.pipelineContext,
    tripVersion: persistedTrip.version,
    completionLevel: persistedTrip.itinerary.completionLevel,
    totalDurationMs,
  });

  return {
    ...persistedTrip,
    totalDurationMs,
  };
}
