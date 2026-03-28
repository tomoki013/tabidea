import { GeminiReplanProvider } from '@/lib/services/replan/gemini-replan-provider';
import { ReplanEngine } from '@/lib/services/replan/replan-engine';
import type {
  PlanMutationResult,
  PlanReplanPayload,
  ReplanTrigger,
  TravelerState,
  TripContext,
  TripPlan,
} from '@/types';
import { mutationFailure, mutationSuccess } from './result';

export interface ReplanPlanParams {
  trigger: ReplanTrigger;
  travelerState: TravelerState;
  tripContext: TripContext;
  tripPlan: TripPlan;
}

export async function replanPlan(
  params: ReplanPlanParams,
): Promise<PlanMutationResult<PlanReplanPayload>> {
  const { trigger, travelerState, tripContext, tripPlan } = params;

  try {
    const hasAIKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const aiProvider = hasAIKey ? new GeminiReplanProvider() : undefined;
    const engine = new ReplanEngine(aiProvider);
    const result = await engine.replan(trigger, tripPlan, travelerState, tripContext);

    return mutationSuccess('replan', result, {
      durationMs: result.processingTimeMs,
      fallbackUsed: !hasAIKey,
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    return mutationFailure(
      'replan',
      isTimeout ? 'replan_timeout' : 'replan_failed',
      {
        durationMs: 0,
      },
    );
  }
}
