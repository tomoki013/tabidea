import type { ComposeStep } from '@/lib/plan-generation/client-contract';
import type { PipelineStepId } from '@/types/itinerary-pipeline';

export const V4_STEP_IDS: PipelineStepId[] = [
  'usage_check',
  'normalize',
  'semantic_plan',
  'feasibility_score',
  'route_optimize',
  'place_resolve',
  'timeline_build',
  'narrative_render',
];

export function buildInitialComposeSteps(
  getMessage: (stepId: PipelineStepId) => string,
): ComposeStep[] {
  return V4_STEP_IDS.map((id) => ({
    id,
    message: getMessage(id),
    status: 'pending',
  }));
}

export function advanceComposeSteps(
  steps: ComposeStep[],
  stepId: PipelineStepId,
  message?: string,
): ComposeStep[] {
  const currentIdx = V4_STEP_IDS.indexOf(stepId);

  return steps.map((step) => {
    const stepIdx = V4_STEP_IDS.indexOf(step.id);

    if (step.id === stepId) {
      return {
        ...step,
        status: 'active',
        message: message ?? step.message,
      };
    }

    if (stepIdx >= 0 && stepIdx < currentIdx) {
      return {
        ...step,
        status: 'completed',
      };
    }

    return step.status === 'completed'
      ? step
      : {
        ...step,
        status: 'pending',
      };
  });
}

export function completeComposeSteps(
  steps: ComposeStep[],
): ComposeStep[] {
  return steps.map((step) => ({
    ...step,
    status: 'completed',
  }));
}
