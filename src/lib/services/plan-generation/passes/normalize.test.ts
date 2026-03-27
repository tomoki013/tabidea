import { describe, it, expect, vi } from 'vitest';
import type { PassContext, PassBudget, PlanGenerationSession } from '@/types/plan-generation';

// Mock the normalize-request function
vi.mock('@/lib/services/itinerary/steps/normalize-request', () => ({
  normalizeRequest: vi.fn((input: { destination?: string }) => ({
    destinations: [input.destination ?? 'Tokyo'],
    durationDays: 3,
    themes: [],
  })),
}));

import { normalizePass } from './normalize';

function createMockCtx(sessionOverrides: Partial<PlanGenerationSession> = {}): PassContext {
  const deadline = Date.now() + 20_000;
  const budget: PassBudget = {
    maxExecutionMs: 20_000,
    deadlineAt: deadline,
    remainingMs: () => deadline - Date.now(),
  };
  return {
    session: {
      id: 'test-session',
      state: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      ...sessionOverrides,
    } as PlanGenerationSession,
    budget,
    retryPolicy: { maxRetries: 0, backoffMs: 0, retryableErrors: [] },
    qualityPolicy: { minOverallScore: 55, minCategoryScores: {}, maxRepairIterations: 3, verificationLevel: 'L1_entity_found' },
  };
}

describe('normalizePass', () => {
  it('returns completed with NormalizedRequest when inputSnapshot is present', async () => {
    const ctx = createMockCtx({
      inputSnapshot: { destination: 'Kyoto' } as PlanGenerationSession['inputSnapshot'],
    });

    const result = await normalizePass(ctx);

    expect(result.outcome).toBe('completed');
    expect(result.data).toBeDefined();
    expect(result.data?.destinations).toContain('Kyoto');
    expect(result.warnings).toHaveLength(0);
  });

  it('returns failed_terminal when inputSnapshot is missing', async () => {
    const ctx = createMockCtx(); // no inputSnapshot

    const result = await normalizePass(ctx);

    expect(result.outcome).toBe('failed_terminal');
    expect(result.warnings[0]).toContain('inputSnapshot');
  });

  it('includes durationMs in result', async () => {
    const ctx = createMockCtx({
      inputSnapshot: { destination: 'Tokyo' } as PlanGenerationSession['inputSnapshot'],
    });

    const result = await normalizePass(ctx);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
