import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockLoadRun,
  mockAssertSessionAccess,
  mockRunEventListEvents,
  mockLogRunCheckpoint,
} = vi.hoisted(() => ({
  mockLoadRun: vi.fn(),
  mockAssertSessionAccess: vi.fn(),
  mockRunEventListEvents: vi.fn(),
  mockLogRunCheckpoint: vi.fn(),
}));

vi.mock('@/lib/services/plan-generation/run-store', () => ({
  loadRun: (...args: unknown[]) => mockLoadRun(...args),
}));

vi.mock('@/lib/services/plan-generation/auth', () => ({
  assertSessionAccess: (...args: unknown[]) => mockAssertSessionAccess(...args),
}));

vi.mock('@/lib/agent/run-events', () => ({
  createStoredRunEvent: vi.fn((runId: string, seq: number, event: string, payload: Record<string, unknown>) => ({
    runId,
    seq,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  })),
  formatRunEventSse: vi.fn((event: Record<string, unknown>) => {
    const eventName = (event.eventName ?? event.event) as string;
    const payload = event.eventName
      ? {
        event: event.eventName,
        runId: event.runId,
        seq: event.seq,
        timestamp: event.createdAt,
        ...((event.payload as Record<string, unknown> | undefined) ?? {}),
      }
      : event;
    return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  }),
  runEventService: {
    listEvents: (...args: unknown[]) => mockRunEventListEvents(...args),
  },
}));

vi.mock('@/lib/agent/run-checkpoint-log', () => ({
  logRunCheckpoint: (...args: unknown[]) => mockLogRunCheckpoint(...args),
}));

vi.mock('@/lib/utils/promise-timeout', () => ({
  withPromiseTimeout: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { GET } from './route';

describe('GET /api/agent/runs/[runId]/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertSessionAccess.mockResolvedValue(null);
    mockRunEventListEvents.mockResolvedValue([]);
  });

  it('replays finalized run completion without reprocessing the same run again', async () => {
    mockLoadRun.mockResolvedValue({
      id: 'run_1',
      state: 'core_ready',
      createdAt: new Date(Date.now() - 5000).toISOString(),
      updatedAt: new Date().toISOString(),
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      pipelineContext: {
        finalizedTripId: 'trip_1',
        finalizedTripVersion: 2,
        finalizedCompletionLevel: 'draft_only',
      },
    });

    const response = await GET(
      new Request('http://localhost/api/agent/runs/run_1/stream'),
      { params: Promise.resolve({ runId: 'run_1' }) },
    );

    const payload = await response.text();

    expect(payload).toContain('event: run.core_ready');
    expect(payload).toContain('event: itinerary.updated');
    expect(payload).toContain('event: run.finished');
    expect(payload).toContain('"tripId":"trip_1"');
    expect(payload).toContain('"tripVersion":2');
    expect(mockRunEventListEvents).toHaveBeenCalled();
  });

  it('replays persisted retryable pause events without executing the processor', async () => {
    mockLoadRun.mockResolvedValue({
      id: 'run_retryable',
      state: 'normalized',
      createdAt: new Date(Date.now() - 5000).toISOString(),
      updatedAt: new Date().toISOString(),
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      pipelineContext: {},
      normalizedInput: {
        durationDays: 3,
      },
    });

    mockRunEventListEvents.mockResolvedValue([
      {
        eventId: 1,
        runId: 'run_retryable',
        seq: 1,
        eventName: 'run.progress',
        payload: {
          phase: 'session_resolved',
        },
        createdAt: new Date().toISOString(),
      },
      {
        eventId: 2,
        runId: 'run_retryable',
        seq: 2,
        eventName: 'run.retryable_failed',
        payload: {
          passId: 'draft_generate',
          state: 'failed_retryable',
          error: 'draft_generation_missing_meal',
          errorCode: 'draft_generation_missing_meal',
          retryable: true,
          nextSubstage: 'day_request',
          nextDayIndex: 2,
        },
        createdAt: new Date().toISOString(),
      },
      {
        eventId: 3,
        runId: 'run_retryable',
        seq: 3,
        eventName: 'run.paused',
        payload: {
          passId: 'draft_generate',
          state: 'failed_terminal',
          nextSubstage: 'day_request',
          nextDayIndex: 2,
          retryable: true,
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/agent/runs/run_retryable/stream'),
      { params: Promise.resolve({ runId: 'run_retryable' }) },
    );

    const payload = await response.text();

    expect(payload).toContain('event: run.retryable_failed');
    expect(payload).toContain('event: run.paused');
    expect(payload).toContain('"retryable":true');
    expect(payload).toContain('"nextSubstage":"day_request"');
    expect(payload).toContain('"nextDayIndex":2');
  });

  it('replays persisted run.started when the process route already wrote it', async () => {
    mockLoadRun.mockResolvedValue({
      id: 'run_started',
      state: 'normalized',
      warnings: [],
      repairHistory: [],
      verifiedEntities: [],
      passRuns: [],
      pipelineContext: {},
    });

    mockRunEventListEvents.mockResolvedValue([
      {
        eventId: 1,
        runId: 'run_started',
        seq: 1,
        eventName: 'run.started',
        payload: {
          mode: 'create',
        },
        createdAt: new Date().toISOString(),
      },
      {
        eventId: 2,
        runId: 'run_started',
        seq: 2,
        eventName: 'run.progress',
        payload: {
          phase: 'session_resolved',
        },
        createdAt: new Date().toISOString(),
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/agent/runs/run_started/stream'),
      { params: Promise.resolve({ runId: 'run_started' }) },
    );

    const payload = await response.text();

    expect(payload).toContain('event: run.started');
    expect(payload).toContain('event: run.progress');
  });
});
