import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  PlanGenerationSession,
  PassBudget,
  PassResult,
} from '@/types/plan-generation';

// Mock run-store
vi.mock('./run-store', () => ({
  loadRun: vi.fn(),
  persistRunSession: vi.fn(),
  countRunPasses: vi.fn().mockResolvedValue(0),
}));

// Mock passes registry
vi.mock('./passes', () => ({
  getPass: vi.fn(),
}));

// Mock logger
vi.mock('./logger', () => {
  const MockLogger = vi.fn();
  MockLogger.prototype.logPassRun = vi.fn();
  return { PlanGenerationLogger: MockLogger };
});

// Mock performance-timer
vi.mock('@/lib/utils/performance-timer', () => ({
  createV4PipelineTimer: vi.fn(() => ({
    measure: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    log: vi.fn(),
    getReport: vi.fn(() => ({ operation: 'test', totalDuration: 0, steps: [], targets: [], timestamp: '' })),
  })),
}));

import { executeNextPass } from './executor';
import { loadRun, persistRunSession, countRunPasses } from './run-store';
import { getPass } from './passes';

const mockLoadRun = vi.mocked(loadRun);
const mockPersistRunSession = vi.mocked(persistRunSession);
const mockCountRunPasses = vi.mocked(countRunPasses);
const mockGetPass = vi.mocked(getPass);
const mockLogRunCheckpoint = vi.fn();

vi.mock('@/lib/agent/run-checkpoint-log', () => ({
  logRunCheckpoint: (...args: unknown[]) => mockLogRunCheckpoint(...args),
}));

function createMockSession(overrides: Partial<PlanGenerationSession> = {}): PlanGenerationSession {
  return {
    id: 'test-session-id',
    state: 'created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    repairHistory: [],
    verifiedEntities: [],
    passRuns: [],
    warnings: [],
    ...overrides,
  };
}

function createMockBudget(): PassBudget {
  const deadline = Date.now() + 20_000;
  return {
    maxExecutionMs: 20_000,
    deadlineAt: deadline,
    remainingMs: () => deadline - Date.now(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCountRunPasses.mockResolvedValue(0);
});

describe('executeNextPass', () => {
  it('executes normalize pass and transitions to normalized', async () => {
    const session = createMockSession({ state: 'created' });
    const updatedSession = createMockSession({ state: 'normalized' });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(updatedSession);

    const mockNormalizeResult: PassResult = {
      outcome: 'completed',
      data: { destinations: ['Tokyo'], durationDays: 3 },
      warnings: [],
      durationMs: 10,
    };

    mockGetPass.mockReturnValue(async () => mockNormalizeResult);

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.passId).toBe('normalize');
    expect(result.outcome).toBe('completed');
    expect(result.newState).toBe('normalized');
    expect(mockPersistRunSession).toHaveBeenCalledWith(
      'test-session-id',
      'created',
      'normalized',
      expect.objectContaining({
        normalizedInput: { destinations: ['Tokyo'], durationDays: 3 },
      }),
    );
    expect(mockLogRunCheckpoint).toHaveBeenNthCalledWith(1, expect.objectContaining({
      checkpoint: 'pass_started',
      runId: 'test-session-id',
      passId: 'normalize',
      attempt: 1,
    }));
    expect(mockLogRunCheckpoint).toHaveBeenNthCalledWith(2, expect.objectContaining({
      checkpoint: 'pass_completed',
      runId: 'test-session-id',
      passId: 'normalize',
      outcome: 'completed',
    }));
  });

  it('transitions to failed on failed_terminal outcome', async () => {
    const session = createMockSession({ state: 'normalized' });
    const failedSession = createMockSession({ state: 'failed_terminal' });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(failedSession);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'failed_terminal' as const,
      warnings: ['AI generation failed'],
      durationMs: 5000,
    }));

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('failed_terminal');
    expect(result.newState).toBe('failed_terminal');
    expect(mockPersistRunSession).toHaveBeenCalledWith(
      'test-session-id',
      'normalized',
      'failed_terminal',
      expect.objectContaining({
        warnings: ['AI generation failed'],
      }),
    );
    expect(mockLogRunCheckpoint).toHaveBeenLastCalledWith(expect.objectContaining({
      checkpoint: 'pass_failed',
      runId: 'test-session-id',
      passId: 'draft_generate',
      outcome: 'failed_terminal',
    }));
  });

  it('does not transition state on partial outcome', async () => {
    const session = createMockSession({ state: 'normalized' });
    const updatedSession = createMockSession({ state: 'normalized', checkpointCursor: 'day-2' });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(updatedSession);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'partial' as const,
      checkpointCursor: 'day-2',
      warnings: [],
      durationMs: 15000,
    }));

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('partial');
    expect(result.newState).toBe('normalized'); // unchanged
    expect(mockPersistRunSession).toHaveBeenCalledWith('test-session-id', 'normalized', 'normalized', {
      checkpointCursor: 'day-2',
    });
  });

  it('merges pipelineContextPatch on partial outcome so resumable runs can continue later', async () => {
    const session = createMockSession({
      state: 'normalized',
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
      },
    });
    const updatedSession = createMockSession({
      state: 'normalized',
      checkpointCursor: 'draft_generate:day_request:2',
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        pauseReason: 'runtime_budget_exhausted',
        nextDayIndex: 2,
        dayAttempt: 1,
      },
    });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(updatedSession);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'partial' as const,
      checkpointCursor: 'draft_generate:day_request:2',
      warnings: [],
      durationMs: 1200,
      metadata: {
        pipelineContextPatch: {
          resumePassId: 'draft_generate',
          resumeSubstage: 'day_request',
          pauseReason: 'runtime_budget_exhausted',
          nextDayIndex: 2,
          dayAttempt: 1,
        },
      },
    }));

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('partial');
    expect(mockPersistRunSession).toHaveBeenCalledWith('test-session-id', 'normalized', 'normalized', {
      checkpointCursor: 'draft_generate:day_request:2',
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        pauseReason: 'runtime_budget_exhausted',
        nextDayIndex: 2,
        dayAttempt: 1,
      },
    });
    expect(mockLogRunCheckpoint).toHaveBeenLastCalledWith(expect.objectContaining({
      checkpoint: 'pass_completed',
      runId: 'test-session-id',
      passId: 'draft_generate',
      outcome: 'partial',
    }));
  });

  it('catches thrown errors and returns failed_terminal', async () => {
    const session = createMockSession({ state: 'created' });
    const failedSession = createMockSession({ state: 'failed_terminal' });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(failedSession);

    mockGetPass.mockReturnValue(async () => {
      throw new Error('Unexpected crash');
    });

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('failed_terminal');
    expect(result.newState).toBe('failed_terminal');
    expect(result.warnings[0]).toContain('Unexpected crash');
  });

  it('accumulates warnings to session', async () => {
    const session = createMockSession({ state: 'created', warnings: ['existing warning'] });
    const updatedSession = createMockSession({ state: 'normalized' });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(updatedSession);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'completed' as const,
      data: {},
      warnings: ['new warning 1', 'new warning 2'],
      durationMs: 10,
    }));

    await executeNextPass('test-session-id', createMockBudget());

    expect(mockPersistRunSession).toHaveBeenCalledWith(
      'test-session-id',
      'created',
      'normalized',
      expect.objectContaining({
        warnings: ['existing warning', 'new warning 1', 'new warning 2'],
      }),
    );
  });

  it('fails closed when draft_generate completes with fewer days than requested', async () => {
    const session = createMockSession({
      state: 'normalized',
      normalizedInput: { durationDays: 2 } as never,
    });
    const failedSession = createMockSession({
      state: 'failed_terminal',
      normalizedInput: { durationDays: 2 } as never,
      plannerDraft: {
        days: [
          {
            day: 1,
            stops: [{ name: 'Only day' }],
          },
        ],
      } as never,
    });

    mockLoadRun.mockResolvedValueOnce(session);
    mockPersistRunSession.mockResolvedValueOnce(failedSession);
    mockGetPass.mockReturnValue(async () => ({
      outcome: 'completed' as const,
      data: {
        days: [
          {
            day: 1,
            stops: [{ name: 'Only day' }],
          },
        ],
      },
      warnings: [],
      durationMs: 1200,
    }));

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('failed_terminal');
    expect(result.newState).toBe('failed_terminal');
    expect(mockPersistRunSession).toHaveBeenCalledWith(
      'test-session-id',
      'normalized',
      'failed_terminal',
      expect.objectContaining({
        plannerDraft: expect.any(Object),
      }),
    );
    expect(mockLogRunCheckpoint).toHaveBeenLastCalledWith(expect.objectContaining({
      checkpoint: 'pass_failed',
      passId: 'draft_generate',
      errorCode: 'draft_generate_incomplete_day_set',
    }));
  });

  it('throws if no next pass available for terminal state', async () => {
    const session = createMockSession({ state: 'completed' });
    mockLoadRun.mockResolvedValueOnce(session);

    await expect(
      executeNextPass('test-session-id', createMockBudget()),
    ).rejects.toThrow('No next pass');
  });

  it('throws if pass is not registered', async () => {
    const session = createMockSession({ state: 'created' });
    mockLoadRun.mockResolvedValueOnce(session);
    mockGetPass.mockReturnValue(null);

    await expect(
      executeNextPass('test-session-id', createMockBudget()),
    ).rejects.toThrow('not registered');
  });

  it('throws PassBudgetExceededError when budget is exhausted', async () => {
    const session = createMockSession({ state: 'created' });
    mockLoadRun.mockResolvedValueOnce(session);
    mockGetPass.mockReturnValue(async () => ({ outcome: 'completed' as const, data: {}, warnings: [], durationMs: 0 }));

    // Budget already expired
    const expiredBudget: PassBudget = {
      maxExecutionMs: 20_000,
      deadlineAt: Date.now() - 1_000,
      remainingMs: () => -1_000,
    };

    await expect(
      executeNextPass('test-session-id', expiredBudget),
    ).rejects.toThrow('exceeded budget');
  });
});
