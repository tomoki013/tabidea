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
const readSSEStreamMock = vi.fn();

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

vi.mock('@/lib/utils/sse-reader', () => ({
  readSSEStream: (...args: unknown[]) => readSSEStreamMock(...args),
}));

import { usePlanGeneration } from './usePlanGeneration';

describe('usePlanGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    saveLocalPlanMock.mockResolvedValue({ id: 'local-plan-1' });
    fetchTripItineraryMock.mockResolvedValue({ id: 'trip-1' } as Itinerary);
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-1',
        streamUrl: '/api/agent/runs/run-1/stream',
        processUrl: '/api/agent/runs/run-1/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'run.progress',
          runId: 'run-1',
          seq: 1,
          timestamp: new Date().toISOString(),
          phase: 'pass_started',
          passId: 'normalize',
        });
        handler({
          event: 'run.paused',
          runId: 'run-1',
          seq: 2,
          timestamp: new Date().toISOString(),
          nextPassId: 'draft_generate',
          nextSubstage: 'day_request',
          pauseReason: 'runtime_budget_exhausted',
          nextDayIndex: 2,
          dayAttempt: 1,
        });
      })
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'run.progress',
          runId: 'run-1',
          seq: 3,
          timestamp: new Date().toISOString(),
          phase: 'pass_started',
          passId: 'draft_generate',
        });
        handler({
          event: 'itinerary.updated',
          runId: 'run-1',
          seq: 4,
          timestamp: new Date().toISOString(),
          tripId: 'trip-1',
          tripVersion: 2,
        });
        return handler({
          event: 'run.finished',
          runId: 'run-1',
          seq: 5,
          timestamp: new Date().toISOString(),
          tripId: 'trip-1',
          tripVersion: 2,
        });
      });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconnects to the run stream after run.paused and resumes from last-event-id', async () => {
    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(readSSEStreamMock).toHaveBeenCalledTimes(2);
    expect(fetchTripItineraryMock).toHaveBeenCalledWith('trip-1', 2);
    expect(saveLocalPlanMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/plan/local/local-plan-1');
    });

    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    const secondStreamHeaders = fetchCalls[5]?.[1]?.headers;
    expect(secondStreamHeaders).toBeInstanceOf(Headers);
    expect((secondStreamHeaders as Headers).get('last-event-id')).toBe('2');
    expect(overlayMock.syncProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        pauseStatusText: 'pause.runtime_budget_exhausted',
      }),
    );
  });

  it('auto-resumes retryable paused failures without surfacing a terminal error', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-auto',
        streamUrl: '/api/agent/runs/run-auto/stream',
        processUrl: '/api/agent/runs/run-auto/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-auto',
        streamUrl: '/api/agent/runs/run-auto/stream',
        processUrl: '/api/agent/runs/run-auto/process',
        status: 'queued',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        return handler({
          event: 'run.paused',
          runId: 'run-auto',
          seq: 1,
          timestamp: new Date().toISOString(),
          state: 'failed_retryable',
          pauseReason: 'recovery_required',
          passId: 'draft_generate',
          error: 'draft_generation_missing_meal',
          errorCode: 'draft_generation_missing_meal',
          retryable: true,
        });
      })
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'itinerary.updated',
          runId: 'run-auto',
          seq: 2,
          timestamp: new Date().toISOString(),
          tripId: 'trip-auto',
          tripVersion: 1,
        });
        return handler({
          event: 'run.finished',
          runId: 'run-auto',
          seq: 3,
          timestamp: new Date().toISOString(),
          tripId: 'trip-auto',
          tripVersion: 1,
        });
      });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(readSSEStreamMock).toHaveBeenCalledTimes(2);
    expect(result.current.errorMessage).toBe('');
    expect(result.current.failureUi).toBeNull();
    expect(fetchTripItineraryMock).toHaveBeenCalledWith('trip-auto', 1);

    const fetchCalls = vi.mocked(global.fetch).mock.calls;
    expect(fetchCalls[4]?.[0]).toBe('/api/agent/runs/run-auto/resume');
  });

  it('ignores run.retryable_failed as a terminal failure and still completes the same run', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-retryable-event',
        streamUrl: '/api/agent/runs/run-retryable-event/stream',
        processUrl: '/api/agent/runs/run-retryable-event/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-retryable-event',
        streamUrl: '/api/agent/runs/run-retryable-event/stream',
        processUrl: '/api/agent/runs/run-retryable-event/process',
        status: 'queued',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'run.retryable_failed',
          runId: 'run-retryable-event',
          seq: 1,
          timestamp: new Date().toISOString(),
          error: 'draft_generation_missing_meal',
          errorCode: 'draft_generation_missing_meal',
          retryable: true,
          nextDayIndex: 2,
          dayAttempt: 3,
        });
        return handler({
          event: 'run.paused',
          runId: 'run-retryable-event',
          seq: 2,
          timestamp: new Date().toISOString(),
          state: 'failed_retryable',
          pauseReason: 'recovery_required',
          retryable: true,
        });
      })
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'run.core_ready',
          runId: 'run-retryable-event',
          seq: 3,
          timestamp: new Date().toISOString(),
          tripId: 'trip-retryable-event',
          tripVersion: 4,
        });
        handler({
          event: 'itinerary.updated',
          runId: 'run-retryable-event',
          seq: 4,
          timestamp: new Date().toISOString(),
          tripId: 'trip-retryable-event',
          tripVersion: 4,
        });
        return handler({
          event: 'run.finished',
          runId: 'run-retryable-event',
          seq: 5,
          timestamp: new Date().toISOString(),
          tripId: 'trip-retryable-event',
          tripVersion: 4,
        });
      });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('');
    expect(result.current.failureUi).toBeNull();
    expect(fetchTripItineraryMock).toHaveBeenCalledWith('trip-retryable-event', 4);
  });

  it('maps planner invalid_output and provider_error codes to user-facing planner messages', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-2',
        streamUrl: '/api/agent/runs/run-2/stream',
        processUrl: '/api/agent/runs/run-2/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock.mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
      return handler({
        event: 'run.failed',
        runId: 'run-2',
        seq: 1,
        timestamp: new Date().toISOString(),
        passId: 'draft_generate',
        error: 'draft_generation_provider_error',
        errorCode: 'draft_generation_invalid_output',
        rootCause: 'invalid_structured_output',
        invalidFieldPath: 'days.0.mainArea',
      });
    });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('errors.generationCodes.draft_generate:draft_generation_invalid_output');
    expect(result.current.failureUi).toBe('banner');
    expect(result.current.canRetry).toBe(true);
    expect(overlayMock.hideOverlay).toHaveBeenCalled();
  });

  it('classifies strategy_exhausted failures as modal blocking failures', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-6',
        streamUrl: '/api/agent/runs/run-6/stream',
        processUrl: '/api/agent/runs/run-6/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock.mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
      return handler({
        event: 'run.failed',
        runId: 'run-6',
        seq: 1,
        timestamp: new Date().toISOString(),
        passId: 'draft_generate',
        error: 'draft_generation_strategy_exhausted',
        errorCode: 'draft_generation_strategy_exhausted',
        rootCause: 'strategy_loop_exhausted',
        retryable: false,
      });
    });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput, { originSurface: 'top_page' });
    });

    expect(result.current.errorMessage).toBe('errors.generationCodes.draft_generate:draft_generation_strategy_exhausted');
    expect(result.current.failureUi).toBe('modal');
    expect(result.current.canRetry).toBe(false);
    expect(result.current.originSurface).toBe('top_page');
  });

  it('classifies missing_meal terminal failures as modal blocking failures', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-7',
        streamUrl: '/api/agent/runs/run-7/stream',
        processUrl: '/api/agent/runs/run-7/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock.mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
      return handler({
        event: 'run.failed',
        runId: 'run-7',
        seq: 1,
        timestamp: new Date().toISOString(),
        passId: 'draft_generate',
        error: 'draft_generation_missing_meal',
        errorCode: 'draft_generation_missing_meal',
        retryable: false,
      });
    });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('errors.generationCodes.draft_generate:draft_generation_missing_meal');
    expect(result.current.failureUi).toBe('modal');
    expect(result.current.canRetry).toBe(false);
  });

  it('falls back to a step-level generic message for unknown backend error codes', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-8',
        streamUrl: '/api/agent/runs/run-8/stream',
        processUrl: '/api/agent/runs/run-8/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock.mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
      return handler({
        event: 'run.failed',
        runId: 'run-8',
        seq: 1,
        timestamp: new Date().toISOString(),
        passId: 'draft_generate',
        error: 'some_new_backend_error',
        errorCode: 'some_new_backend_error',
        retryable: false,
      });
    });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('errors.stepFailed.semantic_plan');
    expect(result.current.failureUi).toBe('modal');
    expect(result.current.canRetry).toBe(false);
  });

  it('maps pass-specific narrative timeout errors to detailed user-facing messages', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-3',
        streamUrl: '/api/agent/runs/run-3/stream',
        processUrl: '/api/agent/runs/run-3/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock.mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
      return handler({
        event: 'run.failed',
        runId: 'run-3',
        seq: 1,
        timestamp: new Date().toISOString(),
        passId: 'narrative_polish',
        error: 'narrative_generation_timeout',
        errorCode: 'narrative_generation_timeout',
        rootCause: 'insufficient_runtime_budget',
      });
    });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('errors.generationCodes.narrative_polish:narrative_generation_timeout');
  });

  it('maps high_unverified_ratio to a user-facing warning and deduplicates it', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-4',
        streamUrl: '/api/agent/runs/run-4/stream',
        processUrl: '/api/agent/runs/run-4/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'run.progress',
          runId: 'run-4',
          seq: 1,
          timestamp: new Date().toISOString(),
          phase: 'pass_completed',
          passId: 'selective_verify',
          warnings: ['high_unverified_ratio', 'high_unverified_ratio'],
        });
        return handler({
          event: 'run.paused',
          runId: 'run-4',
          seq: 2,
          timestamp: new Date().toISOString(),
          nextPassId: 'narrative_polish',
        });
      })
      .mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
        handler({
          event: 'itinerary.updated',
          runId: 'run-4',
          seq: 3,
          timestamp: new Date().toISOString(),
          tripId: 'trip-1',
          tripVersion: 2,
        });
        return handler({
          event: 'run.finished',
          runId: 'run-4',
          seq: 4,
          timestamp: new Date().toISOString(),
          tripId: 'trip-1',
          tripVersion: 2,
        });
      });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.warnings).toEqual(['errors.generationCodes.high_unverified_ratio']);
  });

  it('maps finalize_incomplete_session_contract to a user-facing finalize message', async () => {
    vi.mocked(global.fetch).mockReset();
    readSSEStreamMock.mockReset();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        allowed: true,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        runId: 'run-5',
        streamUrl: '/api/agent/runs/run-5/stream',
        processUrl: '/api/agent/runs/run-5/process',
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ eventCount: 1 }), { status: 200 }))
      .mockResolvedValue(new Response('', { status: 200 })) as typeof fetch;

    readSSEStreamMock.mockImplementationOnce(async (_response, handler: (event: Record<string, unknown>) => void | 'stop') => {
      return handler({
        event: 'run.failed',
        runId: 'run-5',
        seq: 1,
        timestamp: new Date().toISOString(),
        passId: 'finalize',
        error: 'finalize_incomplete_session_contract',
        errorCode: 'finalize_incomplete_session_contract',
      });
    });

    const { result } = renderHook(() => usePlanGeneration());

    await act(async () => {
      await result.current.generate({} as UserInput);
    });

    expect(result.current.errorMessage).toBe('errors.generationCodes.finalize_incomplete_session_contract');
  });
});
