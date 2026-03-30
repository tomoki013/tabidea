import { describe, expect, it } from 'vitest';
import {
  advanceComposeSteps,
  buildInitialComposeSteps,
  completeComposeSteps,
} from './progress';

describe('plan-generation progress helpers', () => {
  it('builds the initial pending step list in v4 order', () => {
    const steps = buildInitialComposeSteps((id) => `step:${id}`);

    expect(steps.map((step) => step.id)).toEqual([
      'usage_check',
      'normalize',
      'semantic_plan',
      'feasibility_score',
      'route_optimize',
      'place_resolve',
      'timeline_build',
      'narrative_render',
    ]);
    expect(steps.every((step) => step.status === 'pending')).toBe(true);
  });

  it('advances steps synchronously without relying on React state timing', () => {
    const initial = buildInitialComposeSteps((id) => `step:${id}`);

    const usageCheck = advanceComposeSteps(initial, 'usage_check');
    expect(usageCheck.find((step) => step.id === 'usage_check')?.status).toBe('active');

    const normalize = advanceComposeSteps(usageCheck, 'normalize');
    expect(normalize.find((step) => step.id === 'usage_check')?.status).toBe('completed');
    expect(normalize.find((step) => step.id === 'normalize')?.status).toBe('active');

    const semanticPlan = advanceComposeSteps(normalize, 'semantic_plan');
    expect(semanticPlan.find((step) => step.id === 'normalize')?.status).toBe('completed');
    expect(semanticPlan.find((step) => step.id === 'semantic_plan')?.status).toBe('active');
  });

  it('marks all steps completed for the success state', () => {
    const initial = buildInitialComposeSteps((id) => `step:${id}`);
    const completed = completeComposeSteps(initial);

    expect(completed.every((step) => step.status === 'completed')).toBe(true);
  });
});
