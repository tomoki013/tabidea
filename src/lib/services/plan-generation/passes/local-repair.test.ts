import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  PlanGenerationSession,
  PassContext,
  PassBudget,
  DraftPlan,
  EvaluationReport,
  RepairRecord,
} from '@/types/plan-generation';

// Mock AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

// Mock prompt builder
vi.mock('@/lib/services/ai/prompt-builder', () => ({
  buildContextSandwich: vi.fn().mockReturnValue({
    systemInstruction: 'test system',
    userPrompt: 'test user',
  }),
}));

// Mock Google AI provider
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn().mockReturnValue(
    vi.fn().mockReturnValue('mock-model'),
  ),
}));

import { localRepairPass } from './local-repair';

function createMockBudget(): PassBudget {
  const deadline = Date.now() + 20_000;
  return {
    maxExecutionMs: 20_000,
    deadlineAt: deadline,
    remainingMs: () => deadline - Date.now(),
  };
}

function createMockDraftPlan(): DraftPlan {
  return {
    destination: '京都',
    description: '京都の旅',
    tripIntentSummary: '寺社巡り',
    themes: ['寺社'],
    orderingPreferences: [],
    days: [
      {
        day: 1,
        title: '金閣寺',
        mainArea: '北山',
        overnightLocation: '京都駅',
        summary: '北山散策',
        stops: [
          {
            draftId: 'stop-001',
            name: '金閣寺',
            searchQuery: '金閣寺',
            role: 'must_visit',
            timeSlotHint: 'morning',
            stayDurationMinutes: 60,
            areaHint: '北山',
            rationale: '代表的観光地',
            aiConfidence: 'high',
          },
        ],
      },
      {
        day: 2,
        title: '嵐山',
        mainArea: '嵐山',
        overnightLocation: '京都駅',
        summary: '嵐山散策',
        stops: [
          {
            draftId: 'stop-002',
            name: '嵐山竹林',
            searchQuery: '嵐山竹林',
            role: 'recommended',
            timeSlotHint: 'morning',
            stayDurationMinutes: 45,
            areaHint: '嵐山',
            rationale: '自然散策',
            aiConfidence: 'medium',
          },
        ],
      },
    ],
  };
}

function createMockReport(): EvaluationReport {
  return {
    overallScore: 45,
    categoryScores: [],
    violations: [
      {
        severity: 'error',
        category: 'constraint_fit',
        scope: { type: 'day', day: 2 },
        message: 'Too few stops on day 2',
        suggestedFix: 'Add more stops',
      },
    ],
    passGrade: 'fail',
    repairTargets: [
      {
        scope: { type: 'day', day: 2 },
        violations: [
          {
            severity: 'error',
            category: 'constraint_fit',
            scope: { type: 'day', day: 2 },
            message: 'Too few stops on day 2',
          },
        ],
        priority: 1,
      },
    ],
  };
}

function createMockCtx(overrides: Partial<PlanGenerationSession> = {}): PassContext {
  return {
    session: {
      id: 'test-session',
      state: 'draft_scored',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      draftPlan: createMockDraftPlan(),
      evaluationReport: createMockReport(),
      ...overrides,
    },
    budget: createMockBudget(),
    retryPolicy: { maxRetries: 1, backoffMs: 500, retryableErrors: ['AbortError'] },
    qualityPolicy: {
      minOverallScore: 55,
      minCategoryScores: {},
      maxRepairIterations: 3,
      verificationLevel: 'L1_entity_found',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('localRepairPass', () => {
  it('fails terminal when draftPlan is missing', async () => {
    const ctx = createMockCtx({ draftPlan: undefined });
    const result = await localRepairPass(ctx);
    expect(result.outcome).toBe('failed_terminal');
    expect(result.warnings[0]).toContain('Missing draftPlan');
  });

  it('fails terminal when evaluationReport is missing', async () => {
    const ctx = createMockCtx({ evaluationReport: undefined });
    const result = await localRepairPass(ctx);
    expect(result.outcome).toBe('failed_terminal');
  });

  it('repairs the targeted day and preserves other days', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    const repairedDay = {
      day: 2,
      title: '嵐山＋東山',
      mainArea: '嵐山〜東山',
      overnightLocation: '京都駅',
      summary: '改善版',
      stops: [
        {
          name: '嵐山竹林',
          searchQuery: '嵐山竹林',
          role: 'recommended' as const,
          timeSlotHint: 'morning' as const,
          stayDurationMinutes: 45,
          areaHint: '嵐山',
          rationale: '自然散策',
          aiConfidence: 'high' as const,
        },
        {
          name: '天龍寺',
          searchQuery: '天龍寺 嵐山',
          role: 'recommended' as const,
          timeSlotHint: 'midday' as const,
          stayDurationMinutes: 60,
          areaHint: '嵐山',
          rationale: '世界遺産',
          aiConfidence: 'high' as const,
        },
      ],
    };

    mockGenerateObject.mockResolvedValue({
      object: {
        destination: '京都',
        description: '京都の旅',
        tripIntentSummary: '寺社巡り',
        days: [
          { day: 1, title: '金閣寺', mainArea: '北山', overnightLocation: '京都駅', summary: '', stops: [] },
          repairedDay,
        ],
      },
    } as never);

    const ctx = createMockCtx();
    const result = await localRepairPass(ctx);

    expect(result.outcome).toBe('completed');
    expect(result.data).toBeDefined();
    const plan = result.data as DraftPlan;

    // Day 1 should be unchanged (original draftId preserved)
    expect(plan.days[0].stops[0].draftId).toBe('stop-001');
    expect(plan.days[0].title).toBe('金閣寺');

    // Day 2 should be replaced with new stops + new draftIds
    expect(plan.days[1].title).toBe('嵐山＋東山');
    expect(plan.days[1].stops).toHaveLength(2);
    expect(plan.days[1].stops[0].draftId).not.toBe('');
    expect(plan.days[1].stops[1].name).toBe('天龍寺');

    // RepairRecord in metadata
    expect(result.metadata?.repairRecord).toBeDefined();
    const record = result.metadata!.repairRecord as RepairRecord;
    expect(record.iteration).toBe(1);
    expect(record.unit.type).toBe('day');
    if (record.unit.type !== 'day') {
      throw new Error('expected day repair unit');
    }
    expect(record.unit.day).toBe(2);
  });

  it('returns needs_retry on timeout', async () => {
    const { generateObject } = await import('ai');
    vi.mocked(generateObject).mockRejectedValue(new Error('Request timed out'));

    const ctx = createMockCtx();
    const result = await localRepairPass(ctx);
    expect(result.outcome).toBe('needs_retry');
    expect(result.warnings[0]).toContain('timed out');
  });
});
