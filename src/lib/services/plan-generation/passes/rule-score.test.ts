import { describe, it, expect, vi } from 'vitest';
import type { PassContext, PassBudget, PlanGenerationSession, EvaluationReport, DraftPlan } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

// Mock the rubric-registry
const mockEvaluateDraft = vi.fn();
vi.mock('../scoring/rubric-registry', () => ({
  evaluateDraft: (...args: unknown[]) => mockEvaluateDraft(...args),
}));

import { ruleScorePass } from './rule-score';

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
      state: 'draft_generated',
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

const mockDraft = { destination: 'Tokyo', days: [{ dayNumber: 1, stops: [] }] } as unknown as DraftPlan;
const mockNormalized = { destinations: ['Tokyo'], durationDays: 3 } as unknown as NormalizedRequest;

describe('ruleScorePass', () => {
  it('returns failed_terminal when draftPlan is missing', async () => {
    const ctx = createMockCtx({ normalizedInput: mockNormalized });

    const result = await ruleScorePass(ctx);

    expect(result.outcome).toBe('failed_terminal');
    expect(result.warnings[0]).toContain('draftPlan');
  });

  it('returns failed_terminal when normalizedInput is missing', async () => {
    const ctx = createMockCtx({ draftPlan: mockDraft });

    const result = await ruleScorePass(ctx);

    expect(result.outcome).toBe('failed_terminal');
  });

  it('returns completed with EvaluationReport on success', async () => {
    const report: EvaluationReport = {
      overallScore: 75,
      passGrade: 'pass',
      categoryScores: {} as EvaluationReport['categoryScores'],
      violations: [],
      repairTargets: [],
    };
    mockEvaluateDraft.mockReturnValue(report);

    const ctx = createMockCtx({
      draftPlan: mockDraft,
      normalizedInput: mockNormalized,
    });

    const result = await ruleScorePass(ctx);

    expect(result.outcome).toBe('completed');
    expect(result.data?.overallScore).toBe(75);
    expect(result.data?.passGrade).toBe('pass');
    expect(result.metadata?.qualityThresholdBreached).toBeUndefined();
    expect(result.warnings).toHaveLength(0);
  });

  it('sets qualityThresholdBreached when error violations + low score', async () => {
    const report: EvaluationReport = {
      overallScore: 30,
      passGrade: 'fail',
      categoryScores: {} as EvaluationReport['categoryScores'],
      violations: [
        { category: 'constraint_fit', severity: 'error', message: 'Duration mismatch' },
        { category: 'variety', severity: 'warning', message: 'Low variety' },
      ],
      repairTargets: ['constraint_fit'],
    };
    mockEvaluateDraft.mockReturnValue(report);

    const ctx = createMockCtx({
      draftPlan: mockDraft,
      normalizedInput: mockNormalized,
    });

    const result = await ruleScorePass(ctx);

    expect(result.outcome).toBe('completed');
    expect(result.metadata?.qualityThresholdBreached).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('constraint_fit');
  });

  it('does not set qualityThresholdBreached when score is above threshold', async () => {
    const report: EvaluationReport = {
      overallScore: 60,
      passGrade: 'marginal',
      categoryScores: {} as EvaluationReport['categoryScores'],
      violations: [
        { category: 'constraint_fit', severity: 'error', message: 'Minor issue' },
      ],
      repairTargets: ['constraint_fit'],
    };
    mockEvaluateDraft.mockReturnValue(report);

    const ctx = createMockCtx({
      draftPlan: mockDraft,
      normalizedInput: mockNormalized,
    });

    const result = await ruleScorePass(ctx);

    expect(result.outcome).toBe('completed');
    expect(result.metadata?.qualityThresholdBreached).toBeUndefined();
    expect(result.warnings).toHaveLength(0);
  });
});
