import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockLoadRun,
  mockUpdateRun,
  mockAssertSessionAccess,
  mockDetermineResumeState,
  mockRunsUpdateEq,
  mockLogRunCheckpoint,
} = vi.hoisted(() => ({
  mockLoadRun: vi.fn(),
  mockUpdateRun: vi.fn(),
  mockAssertSessionAccess: vi.fn(),
  mockDetermineResumeState: vi.fn(),
  mockRunsUpdateEq: vi.fn(),
  mockLogRunCheckpoint: vi.fn(),
}));

vi.mock('@/lib/services/plan-generation/run-store', () => ({
  loadRun: (...args: unknown[]) => mockLoadRun(...args),
  updateRun: (...args: unknown[]) => mockUpdateRun(...args),
}));

vi.mock('@/lib/services/plan-generation/auth', () => ({
  assertSessionAccess: (...args: unknown[]) => mockAssertSessionAccess(...args),
}));

vi.mock('@/lib/services/plan-generation/state-machine', () => ({
  determineResumeState: (...args: unknown[]) => mockDetermineResumeState(...args),
}));

vi.mock('@/lib/agent/run-checkpoint-log', () => ({
  logRunCheckpoint: (...args: unknown[]) => mockLogRunCheckpoint(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      update: () => ({
        eq: (...args: unknown[]) => mockRunsUpdateEq(...args),
      }),
    }),
  }),
}));

import { POST } from './route';

describe('POST /api/agent/runs/[runId]/resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSessionAccess.mockResolvedValue(null);
    mockDetermineResumeState.mockReturnValue('normalized');
    mockRunsUpdateEq.mockResolvedValue({ error: null });
  });

  it('resumes a failed run in place and returns the same run id', async () => {
    mockLoadRun.mockResolvedValue({
      id: 'run_1',
      state: 'failed_retryable',
      pipelineContext: {
        tripId: 'trip_1',
        threadId: 'thread_1',
        executionMode: 'draft_with_selective_verify',
        runtimeProfile: 'netlify_free_30s',
        mode: 'create',
      },
    });

    const response = await POST(
      new Request('http://localhost/api/agent/runs/run_1/resume', { method: 'POST' }),
      { params: Promise.resolve({ runId: 'run_1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockUpdateRun).toHaveBeenCalledWith('run_1', expect.objectContaining({
      pipelineContext: expect.objectContaining({
        resumedFromRunId: 'run_1',
        resumeStrategy: 'same_run_resume',
      }),
    }));
    expect(mockRunsUpdateEq).toHaveBeenCalledWith('id', 'run_1');
    expect(mockLogRunCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      checkpoint: 'run_resumed',
      runId: 'run_1',
      resumeStrategy: 'same_run_resume',
    }));
    expect(await response.json()).toMatchObject({
      runId: 'run_1',
      tripId: 'trip_1',
      threadId: 'thread_1',
      status: 'queued',
      streamUrl: '/api/agent/runs/run_1/stream',
      processUrl: '/api/agent/runs/run_1/process',
    });
  });

  it('returns 409 when the run is not resumable', async () => {
    mockLoadRun.mockResolvedValue({
      id: 'run_2',
      state: 'failed_retryable',
      pipelineContext: {},
    });
    mockDetermineResumeState.mockReturnValue('created');

    const response = await POST(
      new Request('http://localhost/api/agent/runs/run_2/resume', { method: 'POST' }),
      { params: Promise.resolve({ runId: 'run_2' }) },
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'run_not_resumable' });
  });
});
