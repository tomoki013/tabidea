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
});
