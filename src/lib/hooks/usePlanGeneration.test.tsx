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
        status: 'created',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
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
    const secondStreamHeaders = fetchCalls[3]?.[1]?.headers;
    expect(secondStreamHeaders).toBeInstanceOf(Headers);
    expect((secondStreamHeaders as Headers).get('last-event-id')).toBe('2');
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
        status: 'created',
      }), { status: 200 }))
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

    expect(result.current.errorMessage).toBe('errors.generationCodes.draft_generation_invalid_output');
    expect(overlayMock.hideOverlay).toHaveBeenCalled();
  });
});
