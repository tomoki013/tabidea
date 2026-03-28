import { GeminiService } from '@/lib/services/ai/gemini';
import { getUnsplashImage } from '@/lib/unsplash';
import { createPerformanceTimer } from '@/lib/utils/performance-timer';
import type {
  Itinerary,
  PlanMutationResult,
  PlanRegenerationPayload,
} from '@/types';
import { mutationFailure, mutationSuccess } from './result';
import { getUserConstraintPrompt } from './user-constraints';

export interface RegenerateItineraryParams {
  currentPlan: Itinerary;
  chatHistory: { role: string; text: string }[];
}

const REGENERATE_RETRY_INSTRUCTION =
  'The previous output was identical to the original plan. Reflect at least one agreed change from this chat and return the full updated itinerary JSON.';

function getComparablePlanPayload(plan: Itinerary) {
  return {
    destination: plan.destination,
    description: plan.description,
    days: plan.days,
  };
}

function isPlanEffectivelyUnchanged(
  basePlan: Itinerary,
  candidatePlan: Itinerary,
): boolean {
  return JSON.stringify(getComparablePlanPayload(basePlan)) === JSON.stringify(getComparablePlanPayload(candidatePlan));
}

async function applyRegeneratedHeroImage(
  currentPlan: Itinerary,
  regeneratedPlan: Itinerary,
): Promise<Itinerary> {
  const updatedPlan = { ...regeneratedPlan };

  if (updatedPlan.destination !== currentPlan.destination) {
    const heroImageData = await getUnsplashImage(updatedPlan.destination);
    if (heroImageData) {
      updatedPlan.heroImage = heroImageData.url;
      updatedPlan.heroImagePhotographer = heroImageData.photographer;
      updatedPlan.heroImagePhotographerUrl = heroImageData.photographerUrl;
    }
  } else {
    updatedPlan.heroImage = currentPlan.heroImage;
    updatedPlan.heroImagePhotographer = currentPlan.heroImagePhotographer;
    updatedPlan.heroImagePhotographerUrl = currentPlan.heroImagePhotographerUrl;
  }

  return updatedPlan;
}

function buildEffectiveHistory(
  chatHistory: { role: string; text: string }[],
  userConstraintPrompt: string,
) {
  if (!userConstraintPrompt) {
    return chatHistory;
  }

  return [
    { role: 'user', text: `[SYSTEM NOTE: ${userConstraintPrompt}]` },
    ...chatHistory,
  ];
}

export async function regenerateItinerary(
  params: RegenerateItineraryParams,
): Promise<PlanMutationResult<PlanRegenerationPayload>> {
  const timer = createPerformanceTimer('planMutation:regenerate', {
    constraint_prompt: 500,
    ai_generation: 25_000,
    hero_image: 3_000,
    total: 30_000,
  });

  const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!hasAIKey) {
    return mutationFailure('regeneration', 'api_key_missing', {
      durationMs: timer.getTotalDuration(),
    });
  }

  const { currentPlan, chatHistory } = params;

  try {
    const ai = new GeminiService();
    const userConstraintPrompt = await timer.measure(
      'constraint_prompt',
      () => getUserConstraintPrompt(),
    );
    const effectiveHistory = buildEffectiveHistory(chatHistory, userConstraintPrompt);

    let retryUsed = false;
    let nextPlan = await timer.measure(
      'ai_generation',
      () => ai.modifyItinerary(currentPlan, effectiveHistory),
    );

    nextPlan = await timer.measure(
      'hero_image',
      () => applyRegeneratedHeroImage(currentPlan, nextPlan),
    );

    if (isPlanEffectivelyUnchanged(currentPlan, nextPlan)) {
      retryUsed = true;
      const retryHistory = [
        ...effectiveHistory,
        { role: 'user', text: REGENERATE_RETRY_INSTRUCTION },
      ];
      let retriedPlan = await timer.measure(
        'ai_generation_retry',
        () => ai.modifyItinerary(currentPlan, retryHistory),
      );
      retriedPlan = await timer.measure(
        'hero_image_retry',
        () => applyRegeneratedHeroImage(currentPlan, retriedPlan),
      );

      if (isPlanEffectivelyUnchanged(currentPlan, retriedPlan)) {
        timer.log();
        return mutationFailure('regeneration', 'regenerate_no_effect', {
          durationMs: timer.getTotalDuration(),
          retryCount: 1,
        });
      }

      nextPlan = retriedPlan;
    }

    timer.log();

    return mutationSuccess('regeneration', {
      itinerary: nextPlan,
      changedDestination: nextPlan.destination !== currentPlan.destination,
      retryUsed,
    }, {
      durationMs: timer.getTotalDuration(),
      retryCount: retryUsed ? 1 : 0,
    });
  } catch (error) {
    timer.log();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = /timeout|timed out|aborted|タイムアウト/i.test(errorMessage);
    console.error('[plan-mutation] regenerate failed:', {
      error: errorMessage,
      isTimeout,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return mutationFailure(
      'regeneration',
      isTimeout ? 'regenerate_timeout' : 'regenerate_failed',
      {
        durationMs: timer.getTotalDuration(),
      },
    );
  }
}
