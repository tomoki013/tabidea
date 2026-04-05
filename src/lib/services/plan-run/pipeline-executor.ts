/**
 * Plan Run Pipeline Executor
 * 1 slice 内で pass を進め、最後に単一 commit で永続化する
 */

import type {
  PlanRun,
  PlanRunEvent,
  PlanRunFailureContext,
  PlanRunPassBudget,
  PlanRunPassContext,
  PlanRunPassId,
  PlanRunPassResult,
  PlanRunPauseContext,
} from '@/types/plan-run';
import { normalizeRequestPass } from './passes/normalize-request';
import { planFrameBuildPass } from './passes/plan-frame-build';
import { draftGeneratePass } from './passes/draft-generate';
import { draftValidatePass } from './passes/draft-validate';
import { draftRepairLocalPass } from './passes/draft-repair-local';
import { timelineFinalizePass } from './passes/timeline-finalize';
import { completionGatePass } from './passes/completion-gate';
import { persistCompletedTripPass } from './passes/persist-completed-trip';
import { STREAM_CLOSE_RESERVE_MS, STREAM_FINALIZE_RESERVE_MS } from './constants';
import { determineNextPass } from './state-machine';

type PassFn = (ctx: PlanRunPassContext) => Promise<PlanRunPassResult<unknown>>;

const PASS_FUNCTIONS: Record<PlanRunPassId, PassFn> = {
  normalize_request: normalizeRequestPass,
  plan_frame_build: planFrameBuildPass,
  draft_generate: draftGeneratePass,
  draft_validate: draftValidatePass,
  draft_repair_local: draftRepairLocalPass,
  timeline_finalize: timelineFinalizePass,
  completion_gate: completionGatePass,
  persist_completed_trip: persistCompletedTripPass,
};

interface RunPatchAccumulator {
  normalizedInput?: PlanRun['normalizedInput'];
  planFrame?: PlanRun['planFrame'];
  draftTrip?: PlanRun['draftTrip'];
  validationResult?: PlanRun['validationResult'];
  repairHistory?: PlanRun['repairHistory'];
  timeline?: PlanRun['timeline'];
  gatePassedAt?: string;
  completedTripId?: string;
  completedTripVersion?: number;
}

export interface ExecutorResult {
  run: PlanRun;
  stopReason: 'completed' | 'failed' | 'paused';
  events: PlanRunEvent[];
  currentPassId?: PlanRunPassId;
  lastCompletedPassId?: PlanRunPassId;
  pauseContext?: PlanRunPauseContext;
  failureContext?: PlanRunFailureContext;
  warnings: string[];
  patch: RunPatchAccumulator;
  metadata?: Record<string, unknown>;
}

function buildFailureContext(passId: PlanRunPassId | undefined, result: PlanRunPassResult<unknown>): PlanRunFailureContext {
  return {
    passId,
    errorCode: typeof result.metadata?.errorCode === 'string'
      ? result.metadata.errorCode
      : result.warnings[0] ?? 'pipeline_failed',
    message: typeof result.metadata?.message === 'string'
      ? result.metadata.message
      : result.warnings.join('; '),
    rootCause: typeof result.metadata?.rootCause === 'string'
      ? result.metadata.rootCause
      : undefined,
    invalidFieldPath: typeof result.metadata?.invalidFieldPath === 'string'
      ? result.metadata.invalidFieldPath
      : undefined,
    retryable: typeof result.metadata?.retryable === 'boolean'
      ? result.metadata.retryable
      : false,
    occurredAt: new Date().toISOString(),
  };
}

function buildFailedEvent(failureContext: PlanRunFailureContext): PlanRunEvent {
  return {
    type: 'run.failed',
    passId: failureContext.passId,
    errorCode: failureContext.errorCode,
    message: failureContext.message,
    rootCause: failureContext.rootCause,
    invalidFieldPath: failureContext.invalidFieldPath,
    retryable: failureContext.retryable,
  };
}

function applyResultPatch(acc: RunPatchAccumulator, passId: PlanRunPassId, result: PlanRunPassResult<unknown>): void {
  switch (passId) {
    case 'normalize_request':
      if (result.data) acc.normalizedInput = result.data as PlanRun['normalizedInput'];
      break;
    case 'plan_frame_build':
      if (result.data) acc.planFrame = result.data as PlanRun['planFrame'];
      break;
    case 'draft_generate':
      if (result.data) acc.draftTrip = result.data as PlanRun['draftTrip'];
      break;
    case 'draft_validate':
      if (result.data) acc.validationResult = result.data as PlanRun['validationResult'];
      break;
    case 'draft_repair_local':
      if (result.data) acc.draftTrip = result.data as PlanRun['draftTrip'];
      if (Array.isArray(result.metadata?.repairRecords)) {
        acc.repairHistory = result.metadata.repairRecords as PlanRun['repairHistory'];
      }
      break;
    case 'timeline_finalize':
      if (result.data) acc.timeline = result.data as PlanRun['timeline'];
      break;
    case 'completion_gate':
      acc.gatePassedAt = new Date().toISOString();
      break;
    case 'persist_completed_trip': {
      const data = result.data as { tripId: string; tripVersion: number } | undefined;
      if (data) {
        acc.completedTripId = data.tripId;
        acc.completedTripVersion = data.tripVersion;
      }
      break;
    }
  }
}

function applyAccumulator(run: PlanRun, patch: RunPatchAccumulator): PlanRun {
  return {
    ...run,
    normalizedInput: patch.normalizedInput ?? run.normalizedInput,
    planFrame: patch.planFrame ?? run.planFrame,
    draftTrip: patch.draftTrip ?? run.draftTrip,
    validationResult: patch.validationResult ?? run.validationResult,
    repairHistory: patch.repairHistory ?? run.repairHistory,
    timeline: patch.timeline ?? run.timeline,
    gatePassedAt: patch.gatePassedAt ?? run.gatePassedAt,
    completedTripId: patch.completedTripId ?? run.completedTripId,
    completedTripVersion: patch.completedTripVersion ?? run.completedTripVersion,
  };
}

export async function executePipeline(initialRun: PlanRun, budget: PlanRunPassBudget): Promise<ExecutorResult> {
  let run = initialRun;
  const events: PlanRunEvent[] = [];
  const patch: RunPatchAccumulator = {};
  const warnings = [...(run.warnings ?? [])];

  const emit = (event: PlanRunEvent) => events.push(event);
  emit({ type: 'run.started' } as unknown as PlanRunEvent);

  try {
    while (true) {
      const passId = determineNextPass(run);
      if (!passId) {
        break;
      }

      if (budget.remainingMs() < STREAM_FINALIZE_RESERVE_MS + STREAM_CLOSE_RESERVE_MS) {
        const pauseContext: PlanRunPauseContext = {
          pauseReason: 'runtime_budget_exhausted',
          resumePassId: passId,
          pausedAt: new Date().toISOString(),
        };
        run = {
          ...applyAccumulator(run, patch),
          state: 'paused',
          pauseContext,
          currentPassId: passId,
        };
        emit({
          type: 'run.paused',
          resumePassId: passId,
          pauseReason: pauseContext.pauseReason,
        });
        return {
          run,
          stopReason: 'paused',
          events,
          currentPassId: passId,
          pauseContext,
          warnings,
          patch,
          metadata: { stopReason: 'budget_exhausted' },
        };
      }

      emit({
        type: 'run.progress',
        passId,
        state: 'running',
        message: `pass: ${passId}`,
      });

      const passFn = PASS_FUNCTIONS[passId];
      const result = await passFn({ run, budget });
      applyResultPatch(patch, passId, result);
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      run = {
        ...applyAccumulator(run, patch),
        currentPassId: passId,
        pauseContext: undefined,
      };

      if (result.outcome === 'failed_terminal') {
        const failureContext = buildFailureContext(passId, result);
        run = {
          ...run,
          state: 'failed',
          failureContext,
        };
        emit(buildFailedEvent(failureContext));
        return {
          run,
          stopReason: 'failed',
          events,
          currentPassId: passId,
          failureContext,
          warnings,
          patch,
          metadata: result.metadata,
        };
      }

      if (result.outcome === 'partial') {
        const pauseContext = result.pauseContext ?? {
          pauseReason: 'runtime_budget_exhausted',
          resumePassId: passId,
          pausedAt: new Date().toISOString(),
        };
        run = {
          ...run,
          state: 'paused',
          pauseContext,
          currentPassId: pauseContext.resumePassId,
        };
        emit({
          type: 'run.paused',
          resumePassId: pauseContext.resumePassId,
          pauseReason: pauseContext.pauseReason,
        });
        return {
          run,
          stopReason: 'paused',
          events,
          currentPassId: pauseContext.resumePassId,
          lastCompletedPassId: passId === pauseContext.resumePassId ? run.lastCompletedPassId : passId,
          pauseContext,
          warnings,
          patch,
          metadata: result.metadata,
        };
      }

      run = {
        ...run,
        lastCompletedPassId: passId,
      };

      if (passId === 'persist_completed_trip') {
        run = {
          ...run,
          state: 'completed',
        };
        emit({
          type: 'run.completed',
          tripId: run.completedTripId!,
          tripVersion: run.completedTripVersion!,
        });
        return {
          run,
          stopReason: 'completed',
          events,
          lastCompletedPassId: passId,
          warnings,
          patch,
          metadata: result.metadata,
        };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    const failureContext: PlanRunFailureContext = {
      passId: run.currentPassId,
      errorCode: 'run_processor_unexpected_error',
      message,
      retryable: false,
      occurredAt: new Date().toISOString(),
    };
    warnings.push(message);
    emit(buildFailedEvent(failureContext));
    return {
      run: {
        ...applyAccumulator(run, patch),
        state: 'failed',
        failureContext,
      },
      stopReason: 'failed',
      events,
      currentPassId: run.currentPassId,
      lastCompletedPassId: run.lastCompletedPassId,
      failureContext,
      warnings,
      patch,
      metadata: { rootCause: 'executor_exception' },
    };
  }

  const failureContext: PlanRunFailureContext = {
    passId: run.currentPassId,
    errorCode: 'run_processor_unexpected_error',
    message: 'No executable pass remained before completion',
    retryable: false,
    occurredAt: new Date().toISOString(),
  };
  emit(buildFailedEvent(failureContext));
  return {
    run: {
      ...applyAccumulator(run, patch),
      state: 'failed',
      failureContext,
    },
    stopReason: 'failed',
    events,
    currentPassId: run.currentPassId,
    lastCompletedPassId: run.lastCompletedPassId,
    failureContext,
    warnings,
    patch,
    metadata: { rootCause: 'executor_no_terminal_state' },
  };
}
