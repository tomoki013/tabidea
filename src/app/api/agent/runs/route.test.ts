import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRunsLimit = vi.fn();
const mockRunsMaybeSingle = vi.fn();
const mockRunsUpdateEq = vi.fn();
const mockRunsFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockRunsFrom,
  })),
}));

vi.mock('@/lib/services/plan-generation/run-store', () => ({
  createRun: vi.fn(),
  updateRun: vi.fn(),
  loadRun: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/app/actions/user-settings', () => ({
  getUserSettings: vi.fn(),
}));

vi.mock('@/lib/memory/service', () => ({
  memoryService: {
    getMemoryProfile: vi.fn(),
  },
}));

vi.mock('@/lib/agent/run-checkpoint-log', () => ({
  logRunCheckpoint: vi.fn(),
}));

vi.mock('@/lib/limits/check', () => ({
  checkAndRecordUsage: vi.fn(),
}));

import { POST } from './route';
import { createRun, loadRun, updateRun } from '@/lib/services/plan-generation/run-store';
import { getUser } from '@/lib/supabase/server';
import { getUserSettings } from '@/app/actions/user-settings';
import { memoryService } from '@/lib/memory/service';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { checkAndRecordUsage } from '@/lib/limits/check';

const mockCreateRun = vi.mocked(createRun);
const mockUpdateRun = vi.mocked(updateRun);
const mockLoadRun = vi.mocked(loadRun);
const mockGetUser = vi.mocked(getUser);
const mockGetUserSettings = vi.mocked(getUserSettings);
const mockGetMemoryProfile = vi.mocked(memoryService.getMemoryProfile);
const mockLogRunCheckpoint = vi.mocked(logRunCheckpoint);
const mockCheckAndRecordUsage = vi.mocked(checkAndRecordUsage);

function createRequest() {
  return new Request('http://localhost/api/agent/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executionMode: 'draft_with_selective_verify',
      constraints: {
        runtimeProfile: 'netlify_free_30s',
      },
      input: {
        destination: '金沢',
      },
    }),
  });
}

describe('POST /api/agent/runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunsLimit.mockResolvedValue({ data: [], error: null });
    mockRunsMaybeSingle.mockResolvedValue(null);
    mockRunsUpdateEq.mockResolvedValue({ error: null });
    mockRunsFrom.mockImplementation(() => {
      const query = {
        eq: vi.fn(() => query),
        contains: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => mockRunsLimit()),
        maybeSingle: vi.fn(() => mockRunsMaybeSingle()),
      };

      return {
        select: vi.fn(() => query),
        update: vi.fn(() => ({
          eq: mockRunsUpdateEq,
        })),
      };
    });
    mockCreateRun.mockResolvedValue({
      id: 'run_01',
      state: 'created',
    } as Awaited<ReturnType<typeof createRun>>);
    mockUpdateRun.mockResolvedValue(undefined as never);
    mockLoadRun.mockResolvedValue({
      id: 'old_run',
      state: 'failed_retryable',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
    } as Awaited<ReturnType<typeof loadRun>>);
  });

  it('fails open and creates a run when usage checking degrades', async () => {
    mockGetUser.mockResolvedValue(null);
    mockCheckAndRecordUsage.mockRejectedValue(new Error('run usage check timed out after 1500ms'));

    const response = await POST(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      runId: 'run_01',
      status: 'queued',
      processUrl: '/api/agent/runs/run_01/process',
    });
    expect(mockGetUserSettings).not.toHaveBeenCalled();
    expect(mockGetMemoryProfile).not.toHaveBeenCalled();
    expect(mockCreateRun).toHaveBeenCalledOnce();
    expect(mockUpdateRun).toHaveBeenCalledWith('run_01', expect.objectContaining({
      pipelineContext: expect.objectContaining({
        usageStatus: 'degraded',
        usageSource: 'anonymous',
      }),
    }));
    expect(mockLogRunCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      checkpoint: 'run_created',
      usageStatus: 'degraded',
      usageSource: 'anonymous',
    }));
    expect(mockCheckAndRecordUsage).toHaveBeenCalledWith('plan_generation', undefined, {
      skipConsume: undefined,
      resolvedUser: null,
    });
  });

  it('returns 429 when usage checking explicitly denies the request', async () => {
    mockGetUser.mockResolvedValue(null);
    mockCheckAndRecordUsage.mockResolvedValue({
      allowed: false,
      source: 'anonymous',
      userType: 'anonymous',
      userId: null,
      currentCount: 3,
      limit: 3,
      remaining: 0,
      resetAt: null,
      error: 'limit_exceeded',
    });

    const response = await POST(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      error: 'limit_exceeded',
      limitExceeded: true,
    });
    expect(mockCreateRun).not.toHaveBeenCalled();
    expect(mockUpdateRun).not.toHaveBeenCalled();
  });

  it('pins the free-runtime planner model to gemini-3-flash-preview for stable microplanner behavior', async () => {
    mockGetUser.mockResolvedValue(null);
    mockCheckAndRecordUsage.mockResolvedValue({
      allowed: true,
      source: 'free',
      userType: 'free',
      userId: null,
      currentCount: 0,
      limit: 3,
      remaining: 3,
      resetAt: null,
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mockUpdateRun).toHaveBeenCalledWith('run_01', expect.objectContaining({
      generationProfile: expect.objectContaining({
        plannerProvider: 'gemini',
        plannerModelName: 'gemini-3-flash-preview',
      }),
      pipelineContext: expect.objectContaining({
        runtimeProfile: 'netlify_free_30s',
      }),
    }));
  });

  it('resumes the same failed run from normalized input when retry artifacts are incomplete', async () => {
    mockGetUser.mockResolvedValue({ id: 'user_01', email: 'test@example.com' } as never);
    mockCheckAndRecordUsage.mockResolvedValue({
      allowed: true,
      source: 'free',
      userType: 'free',
      userId: 'user_01',
      currentCount: 0,
      limit: 3,
      remaining: 3,
      resetAt: null,
    });
    mockRunsLimit.mockResolvedValue({
      data: [
        {
          id: 'old_run',
          state: 'failed_retryable',
          pipeline_context: {
            executionMode: 'draft_with_selective_verify',
            mode: 'create',
            resumePassId: 'draft_generate',
            resumeSubstage: 'day_request',
            nextDayIndex: 2,
            dayAttempt: 1,
          },
        },
      ],
      error: null,
    });
    mockLoadRun.mockResolvedValue({
      id: 'old_run',
      state: 'failed_retryable',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      normalizedInput: { durationDays: 2 } as never,
      plannerSeed: { days: [{ day: 1, mainArea: '広坂', overnightLocation: '金沢駅周辺' }] } as never,
      plannerDraft: {
        days: [
          {
            day: 1,
            mainArea: '広坂',
            overnightLocation: '金沢駅周辺',
            stops: [{ name: '金沢21世紀美術館', searchQuery: '金沢21世紀美術館', role: 'must_visit', timeSlotHint: 'morning', areaHint: '広坂' }],
          },
        ],
      } as never,
      pipelineContext: {
        resumePassId: 'draft_generate',
        resumeSubstage: 'day_request',
        nextDayIndex: 2,
        dayAttempt: 1,
      },
    } as Awaited<ReturnType<typeof loadRun>>);

    const response = await POST(new Request('http://localhost/api/agent/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionMode: 'draft_with_selective_verify',
        mode: 'create',
        constraints: {
          runtimeProfile: 'netlify_free_30s',
        },
        input: {
          destination: '金沢',
        },
        options: {
          isRetry: true,
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockCreateRun).not.toHaveBeenCalled();
    expect(mockUpdateRun).toHaveBeenCalledWith('old_run', expect.objectContaining({
      pipelineContext: expect.objectContaining({
        resumedFromRunId: 'old_run',
        resumeStrategy: 'same_run_resume',
        reusedArtifactKinds: null,
        artifactReuseRejectedKinds: null,
      }),
    }));
    expect(mockRunsUpdateEq).toHaveBeenCalled();
    expect(mockRunsUpdateEq.mock.calls[0]).toEqual(['id', 'old_run']);
    expect(mockRunsFrom).toHaveBeenCalled();
    expect(mockLogRunCheckpoint).toHaveBeenCalledWith(expect.objectContaining({
      checkpoint: 'run_created',
      resumeSourceRunId: 'old_run',
      resumeStrategy: 'same_run_resume',
    }));
    expect(await response.json()).toMatchObject({
      runId: 'old_run',
      status: 'queued',
      streamUrl: '/api/agent/runs/old_run/stream',
      processUrl: '/api/agent/runs/old_run/process',
    });
  });
});
