import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Itinerary, UserInput } from '@/types';

const pushMock = vi.fn();
const refreshPlansMock = vi.fn();
const overlayMock = {
  showGenerating: vi.fn(),
  syncProgress: vi.fn(),
  hideOverlay: vi.fn(),
  showSuccess: vi.fn(),
  showUpdating: vi.fn(),
};
const saveLocalPlanMock = vi.fn();
const notifyPlanChangeMock = vi.fn();
const fetchTripItineraryMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}));

vi.mock('@/context/PlanGenerationOverlayContext', () => ({
  usePlanGenerationOverlay: () => overlayMock,
}));

vi.mock('@/context/UserPlansContext', () => ({
  useUserPlans: () => ({
    refreshPlans: refreshPlansMock,
  }),
}));

vi.mock('@/lib/plans/save-plan-client', () => ({
  savePlanViaApi: vi.fn(),
}));

vi.mock('@/lib/local-storage/plans', () => ({
  saveLocalPlan: (...args: unknown[]) => saveLocalPlanMock(...args),
  notifyPlanChange: () => notifyPlanChangeMock(),
}));

vi.mock('@/lib/trips/client', () => ({
  fetchTripItinerary: (...args: unknown[]) => fetchTripItineraryMock(...args),
}));

import { usePlanGeneration } from './usePlanGeneration';

describe('usePlanGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveLocalPlanMock.mockResolvedValue({ id: 'local-plan-1' });
    fetchTripItineraryMock.mockResolvedValue({ id: 'trip-1' } as Itinerary);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-resumes runtime budget pauses and completes without failure UI', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-1',
        accessToken: 'token-1',
        statusUrl: '/api/v1/plan-runs/run-1',
        resumeUrl: '/api/v1/plan-runs/run-1/resume',
        resultUrl: '/api/v1/plan-runs/run-1/result',
        state: 'created',
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-1',
        state: 'paused',
        executionStatus: 'advanced',
        pauseContext: {
          pauseReason: 'runtime_budget_exhausted',
          resumePassId: 'draft_generate',
          nextDayNumber: 2,
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-1',
        state: 'completed',
        executionStatus: 'terminal',
        completedTripId: 'trip-1',
        completedTripVersion: 2,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'completed',
        tripId: 'trip-1',
        tripVersion: 2,
        itinerary: { id: 'trip-1' },
      }), { status: 200 })) as typeof fetch;

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('');
    expect(result.current.failureUi).toBeNull();
    expect(saveLocalPlanMock).toHaveBeenCalledTimes(1);
    expect(overlayMock.syncProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        pauseStatusText: 'pause.runtime_budget_exhausted',
      }),
    );
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/plan/local/local-plan-1');
    });
  });

  it('surfaces detailed terminal failures returned by resume', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-failed',
        statusUrl: '/api/v1/plan-runs/run-failed',
        resumeUrl: '/api/v1/plan-runs/run-failed/resume',
        resultUrl: '/api/v1/plan-runs/run-failed/result',
        state: 'created',
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-failed',
        state: 'failed',
        executionStatus: 'terminal',
        failure: {
          passId: 'draft_generate',
          errorCode: 'draft_generation_invalid_output',
          message: 'draft_generation_invalid_output',
          rootCause: 'invalid_structured_output',
          retryable: false,
        },
      }), { status: 200 })) as typeof fetch;

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('errors.generationCodes.draft_generate:draft_generation_invalid_output');
    expect(result.current.failureUi).toBe('modal');
    expect(result.current.canRetry).toBe(false);
  });

  it('shows a modal when resume returns a structured internal error payload', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-internal',
        statusUrl: '/api/v1/plan-runs/run-internal',
        resumeUrl: '/api/v1/plan-runs/run-internal/resume',
        resultUrl: '/api/v1/plan-runs/run-internal/result',
        state: 'created',
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: 'plan_run_resume_internal_error',
        message: 'Failed to claim plan run execution run-internal: function missing',
        stage: 'claim_execution',
        retryable: false,
        failure: {
          errorCode: 'plan_run_resume_internal_error',
          message: 'Failed to claim plan run execution run-internal: function missing',
          retryable: false,
          rootCause: 'claim_execution',
        },
      }), { status: 500 })) as typeof fetch;

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.failureUi).toBe('modal');
    expect(result.current.canRetry).toBe(false);
    expect(result.current.failureKind).toBe('plan_run_resume_internal_error');
  });

  it('falls back to a resumable banner after repeated paused slices', async () => {
    const pausedPayload = {
      runId: 'run-paused',
      state: 'paused',
      executionStatus: 'advanced',
      pauseContext: {
        pauseReason: 'runtime_budget_exhausted',
        resumePassId: 'draft_generate',
        nextDayNumber: 2,
      },
    };
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      if (String(url) === '/api/v1/plan-runs') {
        return Promise.resolve(new Response(JSON.stringify({
          runId: 'run-paused',
          statusUrl: '/api/v1/plan-runs/run-paused',
          resumeUrl: '/api/v1/plan-runs/run-paused/resume',
          resultUrl: '/api/v1/plan-runs/run-paused/result',
          state: 'created',
        }), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify(pausedPayload), { status: 200 }));
    }) as typeof fetch;

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('pause.runtime_budget_exhausted');
    expect(result.current.failureUi).toBe('banner');
    expect(result.current.canRetry).toBe(true);
    expect(result.current.resumeRunId).toBe('run-paused');
  });

  it('polls status while another resume slice is already running', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-running',
        statusUrl: '/api/v1/plan-runs/run-running',
        resumeUrl: '/api/v1/plan-runs/run-running/resume',
        resultUrl: '/api/v1/plan-runs/run-running/result',
        state: 'created',
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-running',
        state: 'running',
        executionStatus: 'already_running',
        currentPassId: 'draft_generate',
        execution: {
          status: 'running',
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-running',
        state: 'completed',
        execution: {
          status: 'idle',
        },
        completedTripId: 'trip-running',
        completedTripVersion: 1,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        state: 'completed',
        tripId: 'trip-running',
        tripVersion: 1,
        itinerary: { id: 'trip-running' },
      }), { status: 200 })) as typeof fetch;

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(calls).toContain('/api/v1/plan-runs/run-running');
    expect(result.current.errorMessage).toBe('');
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/plan/local/local-plan-1');
    });
  });

  it('resumes the same run when retrying a resumable paused state', async () => {
    let phase: 'first_run' | 'retry_run' = 'first_run';
    let firstRunResumeCalls = 0;
    global.fetch = vi.fn((url: RequestInfo | URL) => {
      const urlString = String(url);
      if (urlString === '/api/v1/plan-runs') {
        return Promise.resolve(new Response(JSON.stringify({
          runId: 'run-retry',
          statusUrl: '/api/v1/plan-runs/run-retry',
          resumeUrl: '/api/v1/plan-runs/run-retry/resume',
          resultUrl: '/api/v1/plan-runs/run-retry/result',
          state: 'created',
        }), { status: 201 }));
      }
      if (urlString === '/api/v1/plan-runs/run-retry/resume') {
        if (phase === 'first_run') {
          firstRunResumeCalls += 1;
          if (firstRunResumeCalls <= 7) {
            return Promise.resolve(new Response(JSON.stringify({
              runId: 'run-retry',
              state: 'paused',
              executionStatus: 'advanced',
              pauseContext: {
                pauseReason: 'runtime_budget_exhausted',
                resumePassId: 'draft_generate',
                nextDayNumber: 3,
              },
            }), { status: 200 }));
          }
        }
        return Promise.resolve(new Response(JSON.stringify({
          runId: 'run-retry',
          state: 'completed',
          executionStatus: 'terminal',
          completedTripId: 'trip-retry',
          completedTripVersion: 1,
        }), { status: 200 }));
      }
      if (urlString === '/api/v1/plan-runs/run-retry/result') {
        return Promise.resolve(new Response(JSON.stringify({
          state: 'completed',
          tripId: 'trip-retry',
          tripVersion: 1,
          itinerary: { id: 'trip-retry' },
        }), { status: 200 }));
      }
      throw new Error(`Unexpected fetch URL: ${urlString}`);
    }) as typeof fetch;

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.resumeRunId).toBe('run-retry');

    phase = 'retry_run';
    await act(async () => {
      await result.current.generate({} as UserInput, { isRetry: true });
    });

    const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url));
    expect(calls.filter((url) => url === '/api/v1/plan-runs')).toHaveLength(1);
    expect(calls).toContain('/api/v1/plan-runs/run-retry/resume');
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/plan/local/local-plan-1');
    });
  }, 15000);
});
