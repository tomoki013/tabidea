import type { PipelineContext, SessionState } from '@/types/plan-generation';

export type RunCheckpointName =
  | 'run_created'
  | 'stream_started'
  | 'pass_started'
  | 'pass_completed'
  | 'pass_failed'
  | 'run_paused'
  | 'run_event_persist_completed'
  | 'run_event_persist_degraded'
  | 'narrative_stream_started'
  | 'trip_persist_started'
  | 'trip_persist_completed'
  | 'eval_completed'
  | 'run_finished'
  | 'run_failed';

export type PreflightCheckpointName =
  | 'preflight_started'
  | 'preflight_completed'
  | 'preflight_degraded';

interface CheckpointContextInput {
  runId: string;
  tripId?: string | null;
  state?: SessionState | string;
  executionMode?: string;
  runtimeProfile?: string;
  pipelineContext?: PipelineContext | null;
}

export interface RunCheckpointLogInput extends CheckpointContextInput {
  checkpoint: RunCheckpointName;
  [key: string]: unknown;
}

export interface PreflightCheckpointLogInput {
  checkpoint: PreflightCheckpointName;
  [key: string]: unknown;
}

export interface RunCheckpointContext {
  runId: string;
  tripId: string | null;
  state?: SessionState | string;
  executionMode?: string;
  runtimeProfile?: string;
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

export function buildCheckpointContext(input: CheckpointContextInput): RunCheckpointContext {
  const pipelineContext = input.pipelineContext ?? undefined;

  return {
    runId: input.runId,
    tripId: input.tripId ?? pipelineContext?.tripId ?? null,
    state: input.state,
    executionMode: input.executionMode ?? pipelineContext?.executionMode,
    runtimeProfile: input.runtimeProfile ?? pipelineContext?.runtimeProfile,
  };
}

export function logRunCheckpoint(input: RunCheckpointLogInput): void {
  const {
    checkpoint,
    runId,
    tripId,
    state,
    executionMode,
    runtimeProfile,
    pipelineContext,
    ...rest
  } = input;

  const context = buildCheckpointContext({
    runId,
    tripId,
    state,
    executionMode,
    runtimeProfile,
    pipelineContext,
  });

  const payload = compactRecord({
    kind: 'run_checkpoint',
    checkpoint,
    timestamp: new Date().toISOString(),
    runId: context.runId,
    tripId: context.tripId,
    state: context.state,
    executionMode: context.executionMode,
    runtimeProfile: context.runtimeProfile,
    ...rest,
  });

  console.log(JSON.stringify(payload));
}

export function logPreflightCheckpoint(input: PreflightCheckpointLogInput): void {
  const { checkpoint, ...rest } = input;

  const payload = compactRecord({
    kind: 'preflight_checkpoint',
    checkpoint,
    timestamp: new Date().toISOString(),
    ...rest,
  });

  console.log(JSON.stringify(payload));
}
