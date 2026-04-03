import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockExecuteNextPass,
  mockFinalizeSessionToTrip,
  mockPersistRunSession,
  mockGetNextPassForState,
  mockEvaluateAndSaveItinerary,
} = vi.hoisted(() => ({
  mockExecuteNextPass: vi.fn(),
  mockFinalizeSessionToTrip: vi.fn(),
  mockPersistRunSession: vi.fn(),
  mockGetNextPassForState: vi.fn(),
  mockEvaluateAndSaveItinerary: vi.fn(),
}));

vi.mock('@/lib/services/plan-generation/executor', () => ({
  executeNextPass: (...args: unknown[]) => mockExecuteNextPass(...args),
}));

vi.mock('@/lib/services/plan-generation/finalize-session', () => ({
  finalizeSessionToTrip: (...args: unknown[]) => mockFinalizeSessionToTrip(...args),
}));

vi.mock('@/lib/services/plan-generation/run-store', () => ({
  persistRunSession: (...args: unknown[]) => mockPersistRunSession(...args),
}));

vi.mock('@/lib/services/plan-generation/state-machine', () => ({
  getNextPassForState: (...args: unknown[]) => mockGetNextPassForState(...args),
}));

vi.mock('@/lib/evals/service', () => ({
  evalService: {
    evaluateAndSaveItinerary: (...args: unknown[]) => mockEvaluateAndSaveItinerary(...args),
  },
}));

import { processRunUntilYield } from './run-processor';

describe('processRunUntilYield', () => {
  const createSession = (overrides: Record<string, unknown> = {}) => ({
    id: 'run_1',
    state: 'normalized',
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z',
    repairHistory: [],
    verifiedEntities: [],
    passRuns: [],
    warnings: [],
    pipelineContext: {},
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNextPassForState.mockReturnValue('draft_generate');
    mockPersistRunSession.mockImplementation(async (_runId, _from, _to, patch) => ({
      id: 'run_1',
      state: 'core_ready',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      warnings: [],
      pipelineContext: patch?.pipelineContext ?? {},
    }));
    mockEvaluateAndSaveItinerary.mockResolvedValue([]);
  });

  it('replays finalized core-ready runs without re-finalizing', async () => {
    const emitted: Array<{ event: string; payload?: Record<string, unknown> }> = [];

    const result = await processRunUntilYield({
      runId: 'run_1',
      budget: {
        maxExecutionMs: 10000,
        deadlineAt: Date.now() + 10000,
        remainingMs: () => 9000,
      },
      initialSession: {
        id: 'run_1',
        state: 'core_ready',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        repairHistory: [],
        verifiedEntities: [],
        passRuns: [],
        warnings: [],
        pipelineContext: {
          finalizedTripId: 'trip_1',
          finalizedTripVersion: 3,
          finalizedCompletionLevel: 'core_ready',
        },
      },
      emitEvent: (event, payload) => emitted.push({ event, payload }),
    });

    expect(result.stopReason).toBe('core_ready');
    expect(mockFinalizeSessionToTrip).not.toHaveBeenCalled();
    expect(emitted.map((entry) => entry.event)).toEqual([
      'run.progress',
      'run.core_ready',
      'itinerary.updated',
      'run.finished',
    ]);
  });

  it('emits day lifecycle events when draft generation advances to the next day', async () => {
    const emitted: Array<{ event: string; payload?: Record<string, unknown> }> = [];

    mockExecuteNextPass.mockResolvedValue({
      passId: 'draft_generate',
      outcome: 'partial',
      newState: 'normalized',
      warnings: ['runtime_budget_exhausted'],
      durationMs: 1200,
      metadata: {},
      session: {
        id: 'run_1',
        state: 'normalized',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        plannerDraft: {
          days: [
            {
              day: 1,
              mainArea: 'Asakusa',
              overnightLocation: 'Tokyo',
              stops: [
                {
                  name: 'Senso-ji',
                  searchQuery: 'Senso-ji Tokyo',
                  role: 'sightseeing',
                  timeSlotHint: 'morning',
                  areaHint: 'Asakusa',
                },
              ],
            },
          ],
        },
        repairHistory: [],
        verifiedEntities: [],
        passRuns: [],
        warnings: [],
        pipelineContext: {
          currentDayExecution: {
            dayIndex: 2,
            strategy: 'split_day_v5',
            substage: 'day_request',
            attempt: 1,
            dayAttempt: 1,
          },
          resumePassId: 'draft_generate',
          pauseReason: 'runtime_budget_exhausted',
        },
      },
    });

    const result = await processRunUntilYield({
      runId: 'run_1',
      budget: {
        maxExecutionMs: 10000,
        deadlineAt: Date.now() + 10000,
        remainingMs: () => 9000,
      },
      initialSession: {
        id: 'run_1',
        state: 'normalized',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        plannerDraft: {
          days: [],
        },
        repairHistory: [],
        verifiedEntities: [],
        passRuns: [],
        warnings: [],
        pipelineContext: {},
      },
      emitEvent: (event, payload) => emitted.push({ event, payload }),
    });

    expect(result.stopReason).toBe('paused');
    expect(emitted.map((entry) => entry.event)).toContain('run.day.completed');
    expect(emitted.map((entry) => entry.event)).toContain('run.day.started');
    expect(emitted.find((entry) => entry.event === 'run.day.completed')?.payload).toMatchObject({
      dayIndex: 1,
      completedDayCount: 1,
    });
    expect(emitted.find((entry) => entry.event === 'run.day.started')?.payload).toMatchObject({
      dayIndex: 2,
      strategy: 'split_day_v5',
    });
  });

  it('keeps failed_terminal pass outcomes terminal instead of reclassifying them as retryable', async () => {
    const emitted: Array<{ event: string; payload?: Record<string, unknown> }> = [];

    mockExecuteNextPass.mockResolvedValue({
      passId: 'draft_generate',
      outcome: 'failed_terminal',
      newState: 'failed_terminal',
      warnings: ['draft_generation_missing_meal'],
      durationMs: 6042,
      metadata: {
        errorCode: 'draft_generation_missing_meal',
        rootCause: 'invalid_structured_output',
      },
      session: createSession({
        state: 'failed_terminal',
        pipelineContext: {
          draftGenerateCurrentStrategy: 'constrained_completion',
          draftGenerateStrategyEscalationCount: 2,
          draftGenerateRecoveryCount: 5,
          draftGeneratePauseCount: 7,
          draftGenerateSameErrorRecurrenceCount: 1,
        },
      }),
    });

    const result = await processRunUntilYield({
      runId: 'run_1',
      budget: {
        maxExecutionMs: 10000,
        deadlineAt: Date.now() + 10000,
        remainingMs: () => 9000,
      },
      initialSession: createSession(),
      emitEvent: (event, payload) => emitted.push({ event, payload }),
    });

    expect(result.stopReason).toBe('failed');
    expect(result.currentState).toBe('failed_terminal');
    expect(mockPersistRunSession).not.toHaveBeenCalledWith('run_1', 'failed_terminal', 'failed_retryable', {});
    expect(emitted.find((entry) => entry.event === 'run.failed')?.payload).toMatchObject({
      errorCode: 'draft_generation_missing_meal',
      retryable: false,
    });
  });

  it('normalizes unexpected processor exceptions to a fixed public error code', async () => {
    const emitted: Array<{ event: string; payload?: Record<string, unknown> }> = [];

    mockPersistRunSession.mockImplementation(async (_runId, _from, to, patch) => ({
      ...createSession({
        state: to,
        pipelineContext: patch?.pipelineContext ?? {},
      }),
      state: to,
    }));
    mockExecuteNextPass.mockRejectedValue(new Error('Invalid state transition: failed_terminal → failed_retryable'));

    const result = await processRunUntilYield({
      runId: 'run_1',
      budget: {
        maxExecutionMs: 10000,
        deadlineAt: Date.now() + 10000,
        remainingMs: () => 9000,
      },
      initialSession: createSession(),
      emitEvent: (event, payload) => emitted.push({ event, payload }),
    });

    expect(result.stopReason).toBe('failed');
    expect(result.currentState).toBe('failed_terminal');
    expect(emitted.find((entry) => entry.event === 'run.failed')?.payload).toMatchObject({
      errorCode: 'run_processor_unexpected_error',
      retryable: false,
    });
  });
});
