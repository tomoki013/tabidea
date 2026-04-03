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

const PRODUCTION_ALLOWED_RUN_CHECKPOINTS = new Set<RunCheckpointName>([
  'run_created',
  'run_paused',
  'pass_failed',
  'run_failed',
  'trip_persist_completed',
  'run_finished',
]);

const PRODUCTION_ALLOWED_PREFLIGHT_CHECKPOINTS = new Set<PreflightCheckpointName>([
  'preflight_completed',
  'preflight_degraded',
]);

const PRODUCTION_ALLOWED_FIELDS = [
  'passId',
  'failureStage',
  'errorCode',
  'rootCause',
  'durationMs',
  'totalDurationMs',
  'completedDayCount',
  'completedStopCount',
  'duplicateStopCount',
  'underfilledDayCount',
  'repairIterations',
  'unverifiedRatio',
  'completionLevel',
  'tripVersion',
  'retryable',
  'resumeStrategy',
  'resumeSourceRunId',
] as const;

function isProductionLogging(): boolean {
  return process.env.NODE_ENV === 'production';
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function pickProductionFields(input: Record<string, unknown>): Record<string, unknown> {
  return compactRecord(
    Object.fromEntries(
      PRODUCTION_ALLOWED_FIELDS.map((field) => [field, input[field]]),
    ),
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

  if (isProductionLogging() && !PRODUCTION_ALLOWED_RUN_CHECKPOINTS.has(checkpoint)) {
    return;
  }

  const productionSafeRest = isProductionLogging()
    ? pickProductionFields(rest)
    : rest;

  const payload = compactRecord({
    kind: 'run_checkpoint',
    checkpoint,
    timestamp: new Date().toISOString(),
    runId: context.runId,
    tripId: context.tripId,
    state: context.state,
    executionMode: context.executionMode,
    runtimeProfile: context.runtimeProfile,
    ...productionSafeRest,
  });

  console.log(JSON.stringify(payload));
}

export function logPreflightCheckpoint(input: PreflightCheckpointLogInput): void {
  const { checkpoint, ...rest } = input;

  if (isProductionLogging() && !PRODUCTION_ALLOWED_PREFLIGHT_CHECKPOINTS.has(checkpoint)) {
    return;
  }

  const productionSafeRest = isProductionLogging()
    ? compactRecord({
      degraded: rest.degraded,
      errorCode: rest.errorCode,
    })
    : rest;

  const payload = compactRecord({
    kind: 'preflight_checkpoint',
    checkpoint,
    timestamp: new Date().toISOString(),
    ...productionSafeRest,
  });

  console.log(JSON.stringify(payload));
}
