import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  PlanGenerationSession,
  PassBudget,
  PassResult,
  PassContext,
} from '@/types/plan-generation';

// Mock session-store
vi.mock('./session-store', () => ({
  loadSession: vi.fn(),
  updateSession: vi.fn().mockResolvedValue(undefined),
  transitionState: vi.fn().mockResolvedValue(undefined),
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
import { loadSession, updateSession, transitionState } from './session-store';
import { getPass } from './passes';

const mockLoadSession = vi.mocked(loadSession);
const mockUpdateSession = vi.mocked(updateSession);
const mockTransitionState = vi.mocked(transitionState);
const mockGetPass = vi.mocked(getPass);

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
});

describe('executeNextPass', () => {
  it('executes normalize pass and transitions to normalized', async () => {
    const session = createMockSession({ state: 'created' });
    const updatedSession = createMockSession({ state: 'normalized' });

    mockLoadSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(updatedSession);

    const mockNormalizeResult: PassResult = {
      outcome: 'completed',
      data: { destinations: ['Tokyo'], durationDays: 3 },
      warnings: [],
      durationMs: 10,
    };

    mockGetPass.mockReturnValue(async (_ctx: PassContext) => mockNormalizeResult);

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.passId).toBe('normalize');
    expect(result.outcome).toBe('completed');
    expect(result.newState).toBe('normalized');
    expect(mockTransitionState).toHaveBeenCalledWith('test-session-id', 'created', 'normalized');
    expect(mockUpdateSession).toHaveBeenCalled();
  });

  it('transitions to failed on failed_terminal outcome', async () => {
    const session = createMockSession({ state: 'normalized' });
    const failedSession = createMockSession({ state: 'failed' });

    mockLoadSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(failedSession);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'failed_terminal' as const,
      warnings: ['AI generation failed'],
      durationMs: 5000,
    }));

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('failed_terminal');
    expect(result.newState).toBe('failed');
    expect(mockTransitionState).toHaveBeenCalledWith('test-session-id', 'normalized', 'failed');
  });

  it('does not transition state on partial outcome', async () => {
    const session = createMockSession({ state: 'normalized' });

    mockLoadSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(session);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'partial' as const,
      checkpointCursor: 'day-2',
      warnings: [],
      durationMs: 15000,
    }));

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('partial');
    expect(result.newState).toBe('normalized'); // unchanged
    expect(mockTransitionState).not.toHaveBeenCalled();
    expect(mockUpdateSession).toHaveBeenCalledWith('test-session-id', {
      checkpointCursor: 'day-2',
    });
  });

  it('catches thrown errors and returns failed_terminal', async () => {
    const session = createMockSession({ state: 'created' });
    const failedSession = createMockSession({ state: 'failed' });

    mockLoadSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(failedSession);

    mockGetPass.mockReturnValue(async () => {
      throw new Error('Unexpected crash');
    });

    const result = await executeNextPass('test-session-id', createMockBudget());

    expect(result.outcome).toBe('failed_terminal');
    expect(result.newState).toBe('failed');
    expect(result.warnings[0]).toContain('Unexpected crash');
  });

  it('accumulates warnings to session', async () => {
    const session = createMockSession({ state: 'created', warnings: ['existing warning'] });
    const updatedSession = createMockSession({ state: 'normalized' });

    mockLoadSession
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(updatedSession);

    mockGetPass.mockReturnValue(async () => ({
      outcome: 'completed' as const,
      data: {},
      warnings: ['new warning 1', 'new warning 2'],
      durationMs: 10,
    }));

    await executeNextPass('test-session-id', createMockBudget());

    expect(mockUpdateSession).toHaveBeenCalledWith('test-session-id', {
      warnings: ['existing warning', 'new warning 1', 'new warning 2'],
    });
  });

  it('throws if no next pass available for terminal state', async () => {
    const session = createMockSession({ state: 'completed' });
    mockLoadSession.mockResolvedValueOnce(session);

    await expect(
      executeNextPass('test-session-id', createMockBudget()),
    ).rejects.toThrow('No next pass');
  });

  it('throws if pass is not registered', async () => {
    const session = createMockSession({ state: 'created' });
    mockLoadSession.mockResolvedValueOnce(session);
    mockGetPass.mockReturnValue(null);

    await expect(
      executeNextPass('test-session-id', createMockBudget()),
    ).rejects.toThrow('not registered');
  });
});
