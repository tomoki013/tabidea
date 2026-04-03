import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockLoadRun,
  mockAssertSessionAccess,
  mockProcessRunUntilYield,
  mockRunEventListEvents,
  mockRunEventAppendEventWithSeq,
} = vi.hoisted(() => ({
  mockLoadRun: vi.fn(),
  mockAssertSessionAccess: vi.fn(),
  mockProcessRunUntilYield: vi.fn(),
  mockRunEventListEvents: vi.fn(),
  mockRunEventAppendEventWithSeq: vi.fn(),
}));

vi.mock('@/lib/services/plan-generation/run-store', () => ({
  loadRun: (...args: unknown[]) => mockLoadRun(...args),
}));

vi.mock('@/lib/services/plan-generation/auth', () => ({
  assertSessionAccess: (...args: unknown[]) => mockAssertSessionAccess(...args),
}));

vi.mock('@/lib/services/plan-generation/run-processor', () => ({
  processRunUntilYield: (...args: unknown[]) => mockProcessRunUntilYield(...args),
}));

vi.mock('@/lib/agent/run-events', () => ({
  runEventService: {
    listEvents: (...args: unknown[]) => mockRunEventListEvents(...args),
    appendEventWithSeq: (...args: unknown[]) => mockRunEventAppendEventWithSeq(...args),
  },
}));

import { POST } from './route';

describe('POST /api/agent/runs/[runId]/process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSessionAccess.mockResolvedValue(null);
    mockRunEventListEvents.mockResolvedValue([]);
    mockRunEventAppendEventWithSeq.mockResolvedValue(undefined);
    mockLoadRun.mockResolvedValue({
      id: 'run_1',
      state: 'normalized',
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
      },
    });
  });

  it('processes a run and returns a worker-friendly summary payload', async () => {
    mockProcessRunUntilYield.mockImplementation(async ({ emitEvent }) => {
      emitEvent('run.progress', { phase: 'session_resolved' });
      emitEvent('run.paused', { nextPassId: 'draft_generate' });
      return {
        session: {
          id: 'run_1',
          state: 'normalized',
          pipelineContext: {},
        },
        currentState: 'normalized',
        stopReason: 'paused',
      };
    });

    const response = await POST(
      new Request('http://localhost/api/agent/runs/run_1/process', { method: 'POST' }),
      { params: Promise.resolve({ runId: 'run_1' }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      runId: 'run_1',
      state: 'normalized',
      status: 'running',
      stopReason: 'paused',
      eventCount: 3,
    });
    expect(mockRunEventAppendEventWithSeq).toHaveBeenCalledTimes(3);
    expect(mockRunEventAppendEventWithSeq).toHaveBeenNthCalledWith(
      1,
      'run_1',
      1,
      'run.started',
      expect.objectContaining({ mode: 'create' }),
    );
  });

  it('does not re-process already finalized core-ready runs', async () => {
    mockLoadRun.mockResolvedValue({
      id: 'run_1',
      state: 'core_ready',
      pipelineContext: {
        runtimeProfile: 'netlify_free_30s',
        finalizedTripId: 'trip_1',
        finalizedTripVersion: 2,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/agent/runs/run_1/process', { method: 'POST' }),
      { params: Promise.resolve({ runId: 'run_1' }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      runId: 'run_1',
      state: 'core_ready',
      stopReason: 'core_ready',
      eventCount: 0,
    });
    expect(mockProcessRunUntilYield).not.toHaveBeenCalled();
    expect(mockRunEventAppendEventWithSeq).not.toHaveBeenCalled();
  });
});
