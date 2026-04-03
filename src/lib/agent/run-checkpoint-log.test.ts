import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCheckpointContext, logPreflightCheckpoint, logRunCheckpoint } from './run-checkpoint-log';

describe('run-checkpoint-log', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  it('builds shared context from pipelineContext defaults', () => {
    const context = buildCheckpointContext({
      runId: 'run_1',
      pipelineContext: {
        tripId: 'trip_1',
        executionMode: 'draft_with_selective_verify',
        runtimeProfile: 'netlify_free_30s',
      },
      state: 'normalized',
    });

    expect(context).toEqual({
      runId: 'run_1',
      tripId: 'trip_1',
      state: 'normalized',
      executionMode: 'draft_with_selective_verify',
      runtimeProfile: 'netlify_free_30s',
    });
  });

  it('emits compact JSONL without undefined fields', () => {
    logRunCheckpoint({
      checkpoint: 'pass_completed',
      runId: 'run_1',
      tripId: 'trip_1',
      state: 'draft_generated',
      executionMode: 'draft_with_selective_verify',
      runtimeProfile: 'netlify_free_30s',
      passId: 'draft_generate',
      attempt: 1,
      outcome: 'completed',
      durationMs: 9123,
      remainingMs: 7000,
      warningCodes: [],
      errorCode: undefined,
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;

    expect(payload).toMatchObject({
      kind: 'run_checkpoint',
      checkpoint: 'pass_completed',
      runId: 'run_1',
      tripId: 'trip_1',
      state: 'draft_generated',
      executionMode: 'draft_with_selective_verify',
      runtimeProfile: 'netlify_free_30s',
      passId: 'draft_generate',
      attempt: 1,
      outcome: 'completed',
      durationMs: 9123,
      remainingMs: 7000,
      warningCodes: [],
    });
    expect(payload).not.toHaveProperty('errorCode');
    expect(typeof payload.timestamp).toBe('string');
  });

  it('emits compact preflight JSONL checkpoints', () => {
    logPreflightCheckpoint({
      checkpoint: 'preflight_degraded',
      degraded: true,
      errorCode: 'plan preflight usage check timed out after 1500ms',
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;

    expect(payload).toMatchObject({
      kind: 'preflight_checkpoint',
      checkpoint: 'preflight_degraded',
      degraded: true,
      errorCode: 'plan preflight usage check timed out after 1500ms',
    });
  });

  it('suppresses verbose run checkpoints in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logRunCheckpoint({
      checkpoint: 'pass_completed',
      runId: 'run_prod_1',
      state: 'draft_generated',
      passId: 'draft_generate',
      durationMs: 1234,
      freeText: '京都で静かに過ごしたい',
    });

    expect(consoleLogSpy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('allows only summary fields in production-safe checkpoints', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logRunCheckpoint({
      checkpoint: 'run_finished',
      runId: 'run_prod_2',
      tripId: 'trip_2',
      state: 'completed',
      executionMode: 'draft_with_selective_verify',
      runtimeProfile: 'netlify_free_30s',
      totalDurationMs: 9999,
      completionLevel: 'partial_verified',
      completedDayCount: 3,
      completedStopCount: 14,
      freeText: '紅葉を見たい',
      destinations: ['京都'],
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLogSpy.mock.calls[0]?.[0] as string) as Record<string, unknown>;
    expect(payload).toMatchObject({
      kind: 'run_checkpoint',
      checkpoint: 'run_finished',
      runId: 'run_prod_2',
      tripId: 'trip_2',
      state: 'completed',
      executionMode: 'draft_with_selective_verify',
      runtimeProfile: 'netlify_free_30s',
      totalDurationMs: 9999,
      completionLevel: 'partial_verified',
      completedDayCount: 3,
      completedStopCount: 14,
    });
    expect(payload).not.toHaveProperty('freeText');
    expect(payload).not.toHaveProperty('destinations');
    vi.unstubAllEnvs();
  });
});
