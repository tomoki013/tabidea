import { evalService } from '@/lib/evals/service';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { recordToolAuditLog } from '@/lib/agent/tool-audit';
import type { AgentRunEventName } from '@/lib/agent/run-events';
import {
  STREAM_CLOSE_RESERVE_MS,
  STREAM_FINALIZE_RESERVE_MS,
} from '@/lib/services/plan-generation/constants';
import { executeNextPass } from '@/lib/services/plan-generation/executor';
import { finalizeSessionToTrip } from '@/lib/services/plan-generation/finalize-session';
import { canExecuteCorePasses } from '@/lib/services/plan-generation/lifecycle';
import { persistRunSession } from '@/lib/services/plan-generation/run-store';
import { getNextPassForState } from '@/lib/services/plan-generation/state-machine';
import type {
  PassBudget,
  PlannerDraft,
  PlanGenerationSession,
  VerifiedEntity,
} from '@/types/plan-generation';

export interface RunProcessorEvent {
  event: AgentRunEventName;
  payload?: Record<string, unknown>;
}

export interface RunProcessorResult {
  session: PlanGenerationSession;
  currentState: PlanGenerationSession['state'];
  stopReason: 'paused' | 'failed' | 'core_ready';
}

interface ProcessRunUntilYieldOptions {
  runId: string;
  budget: PassBudget;
  initialSession: PlanGenerationSession;
  emitEvent: (event: AgentRunEventName, payload?: Record<string, unknown>) => void;
}

interface FinalizedTripSummary {
  tripId: string;
  tripVersion: number;
  completionLevel: string | null;
}

const UNEXPECTED_RUN_ERROR_CODE = 'run_processor_unexpected_error';

function buildBudgetPayload(budget: PassBudget, toolCallsUsed = 0) {
  return {
    maxExecutionMs: budget.maxExecutionMs,
    remainingMs: Math.max(0, budget.remainingMs()),
    toolCallsUsed,
    toolCallsLimit: 12,
  };
}

function emitVerificationEvents(
  entities: VerifiedEntity[],
  emitEvent: (event: AgentRunEventName, payload?: Record<string, unknown>) => void,
) {
  for (const entity of entities) {
    const eventName: AgentRunEventName =
      entity.status === 'confirmed'
        ? 'plan.block.verified'
        : 'plan.block.flagged';
    emitEvent(eventName, {
      blockId: entity.draftId,
      day: entity.day,
      stopName: entity.stopName,
      verificationStatus: entity.status,
      level: entity.level,
      details: entity.details ?? null,
    });
  }
}

function resolvePausePayload(session: PlanGenerationSession) {
  const currentDayExecution = session.pipelineContext?.currentDayExecution;
  return {
    nextPassId:
      session.pipelineContext?.resumePassId
      ?? getNextPassForState(session.state, session)
      ?? null,
    nextSubstage: currentDayExecution?.substage ?? session.pipelineContext?.resumeSubstage ?? null,
    pauseReason: session.pipelineContext?.pauseReason ?? 'runtime_budget_exhausted',
    nextDayIndex: currentDayExecution?.dayIndex ?? session.pipelineContext?.nextDayIndex ?? null,
    seedAttempt: currentDayExecution?.seedAttempt ?? session.pipelineContext?.seedAttempt ?? null,
    dayAttempt: currentDayExecution?.dayAttempt ?? session.pipelineContext?.dayAttempt ?? null,
    dayChunkIndex: currentDayExecution?.dayChunkIndex ?? session.pipelineContext?.dayChunkIndex ?? null,
    currentStrategy: currentDayExecution?.strategy ?? session.pipelineContext?.draftGenerateCurrentStrategy ?? null,
    sameErrorRecurrenceCount: currentDayExecution?.sameErrorRecurrenceCount
      ?? session.pipelineContext?.draftGenerateSameErrorRecurrenceCount
      ?? null,
  };
}

function getFinalizedTripSummary(session: PlanGenerationSession): FinalizedTripSummary | null {
  const tripId = session.pipelineContext?.finalizedTripId ?? null;
  const tripVersion = session.pipelineContext?.finalizedTripVersion ?? null;
  if (!tripId || typeof tripVersion !== 'number') {
    return null;
  }

  return {
    tripId,
    tripVersion,
    completionLevel: session.pipelineContext?.finalizedCompletionLevel ?? null,
  };
}

function emitFinalizedEvents(
  emitEvent: (event: AgentRunEventName, payload?: Record<string, unknown>) => void,
  finalizedTripSummary: FinalizedTripSummary,
) {
  emitEvent('run.core_ready', {
    tripId: finalizedTripSummary.tripId,
    tripVersion: finalizedTripSummary.tripVersion,
    completionLevel: finalizedTripSummary.completionLevel,
    status: 'core_ready',
  });

  emitEvent('itinerary.updated', {
    tripId: finalizedTripSummary.tripId,
    tripVersion: finalizedTripSummary.tripVersion,
    completionLevel: finalizedTripSummary.completionLevel,
  });

  emitEvent('run.finished', {
    tripId: finalizedTripSummary.tripId,
    tripVersion: finalizedTripSummary.tripVersion,
    status: 'completed',
  });
}

function countCompletedDays(plannerDraft: PlannerDraft | undefined): number {
  return plannerDraft?.days.length ?? 0;
}

function emitDayLifecycleEvents(
  beforeSession: PlanGenerationSession,
  afterSession: PlanGenerationSession,
  emitEvent: (event: AgentRunEventName, payload?: Record<string, unknown>) => void,
) {
  const beforeCompletedDayCount = countCompletedDays(beforeSession.plannerDraft);
  const afterCompletedDayCount = countCompletedDays(afterSession.plannerDraft);
  const beforeDayIndex = beforeSession.pipelineContext?.currentDayExecution?.dayIndex ?? null;
  const afterDayIndex = afterSession.pipelineContext?.currentDayExecution?.dayIndex ?? null;

  if (afterCompletedDayCount > beforeCompletedDayCount) {
    for (let day = beforeCompletedDayCount + 1; day <= afterCompletedDayCount; day += 1) {
      emitEvent('run.day.completed', {
        dayIndex: day,
        completedDayCount: afterCompletedDayCount,
      });
    }
  }

  if (
    typeof afterDayIndex === 'number'
    && afterDayIndex > afterCompletedDayCount
    && afterDayIndex !== beforeDayIndex
  ) {
    emitEvent('run.day.started', {
      dayIndex: afterDayIndex,
      strategy: afterSession.pipelineContext?.currentDayExecution?.strategy ?? null,
      substage: afterSession.pipelineContext?.currentDayExecution?.substage ?? null,
      attempt: afterSession.pipelineContext?.currentDayExecution?.attempt ?? null,
    });
  }
}

function classifyUnhandledRunError(error: unknown): { message: string; errorCode: string } {
  const message = error instanceof Error ? error.message : 'Internal error';

  if (message === 'Cannot build itinerary from incomplete run state') {
    return {
      message,
      errorCode: 'finalize_incomplete_session_contract',
    };
  }

  return {
    message,
    errorCode: UNEXPECTED_RUN_ERROR_CODE,
  };
}

export async function processRunUntilYield({
  runId,
  budget,
  initialSession,
  emitEvent,
}: ProcessRunUntilYieldOptions): Promise<RunProcessorResult> {
  let workingSession = initialSession;
  let currentState = workingSession.state;

  emitEvent('run.progress', {
    phase: 'session_resolved',
    state: currentState,
    runtimeProfile: workingSession.pipelineContext?.runtimeProfile ?? 'default',
    budget: buildBudgetPayload(budget),
  });

  try {
    const finalizedTripSummary = getFinalizedTripSummary(workingSession);
    if (finalizedTripSummary && (currentState === 'core_ready' || currentState === 'completed')) {
      emitFinalizedEvents(emitEvent, finalizedTripSummary);
      return { session: workingSession, currentState: 'core_ready', stopReason: 'core_ready' };
    }

    while (canExecuteCorePasses(currentState)) {
      const stateBeforePass = workingSession.state;
      const nextPass = getNextPassForState(workingSession.state, workingSession);
      const sessionBeforePass = workingSession;

      emitEvent('run.progress', {
        phase: 'pass_started',
        passId: nextPass,
        state: stateBeforePass,
        budget: buildBudgetPayload(budget),
      });

      if (nextPass === 'selective_verify') {
        emitEvent('tool.call.started', {
          toolName: 'search_places',
          passId: nextPass,
        });
      }

      const result = await executeNextPass(runId, budget, workingSession);
      workingSession = result.session;
      currentState = result.newState;

      if (result.passId === 'draft_generate') {
        emitDayLifecycleEvents(sessionBeforePass, result.session, emitEvent);
      }

      emitEvent('run.progress', {
        phase: 'pass_completed',
        passId: result.passId,
        outcome: result.outcome,
        state: currentState,
        warnings: result.warnings,
        budget: buildBudgetPayload(budget),
      });

      if (result.passId === 'draft_format' && result.outcome === 'completed' && result.session.draftPlan) {
        emitEvent('plan.draft.created', {
          destination: result.session.draftPlan.destination,
          totalDays: result.session.draftPlan.days.length,
          description: result.session.draftPlan.description,
        });
      }

      if (result.passId === 'selective_verify' && result.session.verifiedEntities.length > 0) {
        emitEvent('tool.call.finished', {
          toolName: 'search_places',
          passId: result.passId,
          outcome: result.outcome,
        });
        await recordToolAuditLog({
          runId,
          toolName: 'search_places',
          status: 'completed',
          response: {
            verifiedEntities: result.session.verifiedEntities.length,
          },
          provider: 'google_places',
        }).catch(() => {});
        emitVerificationEvents(result.session.verifiedEntities, emitEvent);
      }

      if (currentState === 'failed_terminal' || result.outcome === 'failed_terminal') {
        if (result.passId === 'selective_verify') {
          emitEvent('tool.call.failed', {
            toolName: 'search_places',
            passId: result.passId,
            warnings: result.warnings,
          });
          await recordToolAuditLog({
            runId,
            toolName: 'search_places',
            status: 'failed',
            response: {
              warnings: result.warnings,
            },
            provider: 'google_places',
            errorCode: 'selective_verify_failed',
          }).catch(() => {});
        }

        const errorCode =
          typeof result.metadata?.errorCode === 'string'
            ? result.metadata.errorCode
            : result.warnings[0] ?? 'run_failed';

        const terminalSession = currentState === 'failed_terminal'
          ? result.session
          : await persistRunSession(runId, currentState, 'failed_terminal', {});
        workingSession = terminalSession;
        currentState = 'failed_terminal';
        logRunCheckpoint({
          checkpoint: 'run_failed',
          runId,
          state: currentState,
          pipelineContext: terminalSession.pipelineContext,
          passId: result.passId,
          failureStage: stateBeforePass,
          errorCode,
          rootCause:
            typeof result.metadata?.rootCause === 'string'
              ? result.metadata.rootCause
              : undefined,
          invalidFieldPath:
            typeof result.metadata?.invalidFieldPath === 'string'
              ? result.metadata.invalidFieldPath
              : undefined,
          retryable: false,
          remainingMs: Math.max(0, budget.remainingMs()),
          currentStrategy: terminalSession.pipelineContext?.finalDraftStrategySummary?.lastStrategy
            ?? terminalSession.pipelineContext?.draftGenerateCurrentStrategy,
          strategyEscalationCount: terminalSession.pipelineContext?.finalDraftStrategySummary?.escalationCount
            ?? terminalSession.pipelineContext?.draftGenerateStrategyEscalationCount,
          recoveryCount: terminalSession.pipelineContext?.finalDraftStrategySummary?.recoveryCount
            ?? terminalSession.pipelineContext?.draftGenerateRecoveryCount,
          draftGeneratePauseCount: terminalSession.pipelineContext?.finalDraftStrategySummary?.pauseCount
            ?? terminalSession.pipelineContext?.draftGeneratePauseCount,
          sameErrorRecurrenceCount: terminalSession.pipelineContext?.draftGenerateSameErrorRecurrenceCount,
          fallbackHeavy: terminalSession.pipelineContext?.finalDraftStrategySummary?.fallbackHeavy,
          warningCodes: result.warnings,
        });

        emitEvent('run.failed', {
          error: errorCode,
          errorCode,
          passId: result.passId,
          failureStage: stateBeforePass,
          warnings: result.warnings,
          rootCause:
            typeof result.metadata?.rootCause === 'string'
              ? result.metadata.rootCause
              : undefined,
          invalidFieldPath:
            typeof result.metadata?.invalidFieldPath === 'string'
              ? result.metadata.invalidFieldPath
              : undefined,
          retryable: false,
        });
        return { session: terminalSession, currentState, stopReason: 'failed' };
      }

      if (result.outcome === 'partial') {
        const pausePayload = resolvePausePayload(result.session);

        logRunCheckpoint({
          checkpoint: 'run_paused',
          runId,
          state: currentState,
          pipelineContext: result.session.pipelineContext,
          passId: result.passId,
          nextPassId: pausePayload.nextPassId,
          nextSubstage: pausePayload.nextSubstage,
          pauseReason: pausePayload.pauseReason,
          nextDayIndex: pausePayload.nextDayIndex,
          dayChunkIndex: pausePayload.dayChunkIndex,
          seedAttempt: pausePayload.seedAttempt,
          dayAttempt: pausePayload.dayAttempt,
          currentStrategy: pausePayload.currentStrategy,
          sameErrorRecurrenceCount: pausePayload.sameErrorRecurrenceCount,
          remainingMs: Math.max(0, budget.remainingMs()),
          warningCodes: result.warnings,
        });

        emitEvent('run.paused', {
          passId: result.passId,
          state: currentState,
          nextPassId: pausePayload.nextPassId,
          nextSubstage: pausePayload.nextSubstage,
          pauseReason: pausePayload.pauseReason,
          nextDayIndex: pausePayload.nextDayIndex,
          seedAttempt: pausePayload.seedAttempt,
          dayAttempt: pausePayload.dayAttempt,
          warnings: result.warnings,
          budget: buildBudgetPayload(budget),
        });
        return { session: result.session, currentState, stopReason: 'paused' };
      }

      if (budget.remainingMs() < (STREAM_FINALIZE_RESERVE_MS + STREAM_CLOSE_RESERVE_MS)) {
        const resumedSession = await persistRunSession(runId, currentState, currentState, {
          pipelineContext: {
            ...(workingSession.pipelineContext ?? {}),
            resumePassId:
              workingSession.pipelineContext?.resumePassId
              ?? getNextPassForState(currentState, workingSession),
            pauseReason: 'runtime_budget_exhausted',
          },
        });
        workingSession = resumedSession;
        const pausePayload = resolvePausePayload(resumedSession);

        logRunCheckpoint({
          checkpoint: 'run_paused',
          runId,
          state: currentState,
          pipelineContext: resumedSession.pipelineContext,
          nextPassId: pausePayload.nextPassId,
          nextSubstage: pausePayload.nextSubstage,
          pauseReason: pausePayload.pauseReason,
          nextDayIndex: pausePayload.nextDayIndex,
          seedAttempt: pausePayload.seedAttempt,
          dayAttempt: pausePayload.dayAttempt,
          remainingMs: Math.max(0, budget.remainingMs()),
        });

        emitEvent('run.paused', {
          state: currentState,
          nextPassId: pausePayload.nextPassId,
          nextSubstage: pausePayload.nextSubstage,
          pauseReason: pausePayload.pauseReason,
          nextDayIndex: pausePayload.nextDayIndex,
          dayChunkIndex: pausePayload.dayChunkIndex,
          seedAttempt: pausePayload.seedAttempt,
          dayAttempt: pausePayload.dayAttempt,
          currentStrategy: pausePayload.currentStrategy,
          sameErrorRecurrenceCount: pausePayload.sameErrorRecurrenceCount,
          budget: buildBudgetPayload(budget),
        });
        return { session: resumedSession, currentState, stopReason: 'paused' };
      }
    }

    if (currentState !== 'timeline_ready' && currentState !== 'core_ready' && currentState !== 'completed') {
      if (currentState !== 'failed_terminal' && currentState !== 'cancelled') {
        workingSession = await persistRunSession(runId, currentState, 'failed_terminal', {});
        currentState = 'failed_terminal';
      }
      logRunCheckpoint({
        checkpoint: 'run_failed',
        runId,
        state: workingSession.state,
        pipelineContext: workingSession.pipelineContext,
        failureStage: workingSession.state,
        errorCode: 'run_not_completed',
        retryable: false,
        remainingMs: Math.max(0, budget.remainingMs()),
        currentStrategy: workingSession.pipelineContext?.finalDraftStrategySummary?.lastStrategy
          ?? workingSession.pipelineContext?.draftGenerateCurrentStrategy,
        strategyEscalationCount: workingSession.pipelineContext?.finalDraftStrategySummary?.escalationCount
          ?? workingSession.pipelineContext?.draftGenerateStrategyEscalationCount,
        recoveryCount: workingSession.pipelineContext?.finalDraftStrategySummary?.recoveryCount
          ?? workingSession.pipelineContext?.draftGenerateRecoveryCount,
        draftGeneratePauseCount: workingSession.pipelineContext?.finalDraftStrategySummary?.pauseCount
          ?? workingSession.pipelineContext?.draftGeneratePauseCount,
        sameErrorRecurrenceCount: workingSession.pipelineContext?.draftGenerateSameErrorRecurrenceCount,
        fallbackHeavy: workingSession.pipelineContext?.finalDraftStrategySummary?.fallbackHeavy,
      });
      emitEvent('run.failed', {
        error: `Session not completed (state: ${workingSession.state})`,
        errorCode: 'run_not_completed',
      });
      return { session: workingSession, currentState, stopReason: 'failed' };
    }

    const finalizedSummaryBeforeFinalize = getFinalizedTripSummary(workingSession);
    if (finalizedSummaryBeforeFinalize && (currentState === 'core_ready' || currentState === 'completed')) {
      emitFinalizedEvents(emitEvent, finalizedSummaryBeforeFinalize);
      return { session: workingSession, currentState: 'core_ready', stopReason: 'core_ready' };
    }

    const sessionForFinalize = currentState === 'core_ready' || currentState === 'completed'
      ? workingSession
      : await persistRunSession(runId, 'timeline_ready', 'core_ready', {
        pipelineContext: {
          ...(workingSession.pipelineContext ?? {}),
          resumePassId: null,
          resumeSubstage: null,
          pauseReason: null,
        },
      });
    workingSession = sessionForFinalize;
    currentState = 'core_ready';

    const persistedTrip = await finalizeSessionToTrip(sessionForFinalize, {
      includeHeroImage: budget.remainingMs() >= 6_000,
    });

    const finalizedSession = await persistRunSession(runId, sessionForFinalize.state, sessionForFinalize.state, {
      pipelineContext: {
        ...(sessionForFinalize.pipelineContext ?? {}),
        finalizedTripId: persistedTrip.tripId,
        finalizedTripVersion: persistedTrip.version,
        finalizedCompletionLevel: persistedTrip.itinerary.completionLevel ?? null,
        finalizedAt: new Date().toISOString(),
        coreReadyAt: new Date().toISOString(),
      },
    });

    emitFinalizedEvents(emitEvent, {
      tripId: persistedTrip.tripId,
      tripVersion: persistedTrip.version,
      completionLevel: persistedTrip.itinerary.completionLevel ?? null,
    });

    if (budget.remainingMs() >= 2_000) {
      void evalService.evaluateAndSaveItinerary(persistedTrip.itinerary, {
        runId,
        tripId: persistedTrip.tripId,
        tripVersion: persistedTrip.version,
        context: {
          mutationType: 'generation',
        },
      }).then((metrics) => {
        logRunCheckpoint({
          checkpoint: 'eval_completed',
          runId,
          tripId: persistedTrip.tripId,
          state: sessionForFinalize.state,
          pipelineContext: sessionForFinalize.pipelineContext,
          tripVersion: persistedTrip.version,
          metricCount: metrics.length,
          failedMetricCount: metrics.filter((metric) => metric.metricValue < 1).length,
        });
      }).catch(() => {});
    }

    logRunCheckpoint({
      checkpoint: 'run_finished',
      runId,
      tripId: persistedTrip.tripId,
      state: finalizedSession.state,
      pipelineContext: finalizedSession.pipelineContext,
      tripVersion: persistedTrip.version,
      completionLevel: persistedTrip.itinerary.completionLevel,
      totalDurationMs: persistedTrip.totalDurationMs,
      currentStrategy: finalizedSession.pipelineContext?.finalDraftStrategySummary?.lastStrategy
        ?? finalizedSession.pipelineContext?.draftGenerateCurrentStrategy,
      strategyEscalationCount: finalizedSession.pipelineContext?.finalDraftStrategySummary?.escalationCount
        ?? finalizedSession.pipelineContext?.draftGenerateStrategyEscalationCount,
      recoveryCount: finalizedSession.pipelineContext?.finalDraftStrategySummary?.recoveryCount
        ?? finalizedSession.pipelineContext?.draftGenerateRecoveryCount,
      draftGeneratePauseCount: finalizedSession.pipelineContext?.finalDraftStrategySummary?.pauseCount
        ?? finalizedSession.pipelineContext?.draftGeneratePauseCount,
      sameErrorRecurrenceCount: finalizedSession.pipelineContext?.draftGenerateSameErrorRecurrenceCount,
      fallbackHeavy: finalizedSession.pipelineContext?.finalDraftStrategySummary?.fallbackHeavy,
    });

    return { session: finalizedSession, currentState, stopReason: 'core_ready' };
  } catch (error) {
    const { errorCode, message } = classifyUnhandledRunError(error);
    if (currentState !== 'failed_terminal' && currentState !== 'cancelled') {
      workingSession = await persistRunSession(runId, currentState, 'failed_terminal', {});
      currentState = 'failed_terminal';
    }

    logRunCheckpoint({
      checkpoint: 'run_failed',
      runId,
      errorCode,
      retryable: false,
      currentStrategy: workingSession.pipelineContext?.finalDraftStrategySummary?.lastStrategy
        ?? workingSession.pipelineContext?.draftGenerateCurrentStrategy,
      strategyEscalationCount: workingSession.pipelineContext?.finalDraftStrategySummary?.escalationCount
        ?? workingSession.pipelineContext?.draftGenerateStrategyEscalationCount,
      recoveryCount: workingSession.pipelineContext?.finalDraftStrategySummary?.recoveryCount
        ?? workingSession.pipelineContext?.draftGenerateRecoveryCount,
      draftGeneratePauseCount: workingSession.pipelineContext?.finalDraftStrategySummary?.pauseCount
        ?? workingSession.pipelineContext?.draftGeneratePauseCount,
      sameErrorRecurrenceCount: workingSession.pipelineContext?.draftGenerateSameErrorRecurrenceCount,
      fallbackHeavy: workingSession.pipelineContext?.finalDraftStrategySummary?.fallbackHeavy,
      rawErrorMessage: message,
    });

    emitEvent('run.failed', {
      error: errorCode,
      errorCode,
      retryable: false,
    });

    return { session: workingSession, currentState: 'failed_terminal', stopReason: 'failed' };
  }
}
