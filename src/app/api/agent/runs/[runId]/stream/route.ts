import type {
  PassBudget,
  PassContext,
  VerifiedEntity,
} from '@/types/plan-generation';
import {
  REQUEST_DEADLINE_MS,
  PLATFORM_HEADROOM_MS,
  DEFAULT_RETRY_POLICIES,
  DEFAULT_QUALITY_POLICY,
  NETLIFY_FREE_RUNTIME_PROFILE,
  STREAM_EXECUTION_BUDGET_MS,
  STREAM_CLOSE_RESERVE_MS,
  STREAM_FINALIZE_RESERVE_MS,
} from '@/lib/services/plan-generation/constants';
import { loadRun, persistRunSession } from '@/lib/services/plan-generation/run-store';
import { executeNextPass } from '@/lib/services/plan-generation/executor';
import { narrativePolishPassStreaming } from '@/lib/services/plan-generation/passes/narrative-polish';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';
import { getNextPassForState } from '@/lib/services/plan-generation/state-machine';
import { finalizeSessionToTrip } from '@/lib/services/plan-generation/finalize-session';
import { evalService } from '@/lib/evals/service';
import {
  createStoredRunEvent,
  formatRunEventSse,
  runEventService,
  type AgentRunEventName,
} from '@/lib/agent/run-events';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { recordToolAuditLog } from '@/lib/agent/tool-audit';
import { withPromiseTimeout } from '@/lib/utils/promise-timeout';

const RUN_EVENT_PERSIST_TIMEOUT_MS = 400;
const RUN_EVENT_PERSIST_SLOW_LOG_MS = 100;

export const maxDuration = 25;
export const runtime = 'nodejs';

function resolveStreamBudgetMs(runtimeProfile?: string): number {
  return runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? STREAM_EXECUTION_BUDGET_MS[NETLIFY_FREE_RUNTIME_PROFILE]
    : STREAM_EXECUTION_BUDGET_MS.default;
}

function buildBudget(startedAt: number, runtimeProfile?: string): PassBudget {
  const maxExecutionMs = Math.min(
    resolveStreamBudgetMs(runtimeProfile),
    REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS,
  );
  const deadlineAt = startedAt + maxExecutionMs;

  return {
    maxExecutionMs,
    deadlineAt,
    remainingMs: () => deadlineAt - Date.now(),
  };
}

function buildBudgetPayload(budget: PassBudget, toolCallsUsed = 0) {
  return {
    maxExecutionMs: budget.maxExecutionMs,
    remainingMs: Math.max(0, budget.remainingMs()),
    toolCallsUsed,
    toolCallsLimit: 12,
  };
}

async function listReplayEvents(runId: string, afterSeq?: number) {
  return withPromiseTimeout(
    () => runEventService.listEvents(runId, afterSeq),
    RUN_EVENT_PERSIST_TIMEOUT_MS,
    'run event replay',
  );
}

function emitVerificationEvents(
  entities: VerifiedEntity[],
  emitEvent: (eventName: AgentRunEventName, payload?: Record<string, unknown>) => void,
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

function resolvePausePayload(session: Awaited<ReturnType<typeof loadRun>>) {
  return {
    nextPassId:
      session.pipelineContext?.resumePassId
      ?? getNextPassForState(session.state, session)
      ?? null,
    nextSubstage: session.pipelineContext?.resumeSubstage ?? null,
    pauseReason: session.pipelineContext?.pauseReason ?? 'runtime_budget_exhausted',
    nextDayIndex: session.pipelineContext?.nextDayIndex ?? null,
    seedAttempt: session.pipelineContext?.seedAttempt ?? null,
    dayAttempt: session.pipelineContext?.dayAttempt ?? null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const requestStartedAt = Date.now();
  const encoder = new TextEncoder();
  const afterSeqHeader = request.headers.get('last-event-id');
  const afterSeq = afterSeqHeader ? Number.parseInt(afterSeqHeader, 10) : undefined;
  let nextSeq = Number.isFinite(afterSeq) ? (afterSeq as number) : 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      try {
        let workingSession = await loadRun(runId);
        const accessError = await assertSessionAccess(workingSession);
        if (accessError) {
          logRunCheckpoint({
            checkpoint: 'run_failed',
            runId,
            state: workingSession.state,
            pipelineContext: workingSession.pipelineContext,
            failureStage: workingSession.state,
            errorCode: accessError,
            retryable: false,
          });
          controller.enqueue(encoder.encode(formatRunEventSse(createStoredRunEvent(
            runId,
            1,
            'run.failed',
            { error: accessError },
          ))));
          close();
          return;
        }

        let replayedCount = 0;

        try {
          const replayedEvents = await listReplayEvents(
            runId,
            Number.isFinite(afterSeq) ? afterSeq : undefined,
          );
          for (const event of replayedEvents) {
            controller.enqueue(encoder.encode(formatRunEventSse(event)));
            nextSeq = Math.max(nextSeq, event.seq);
          }
          replayedCount = replayedEvents.length;
        } catch (error) {
          logRunCheckpoint({
            checkpoint: 'run_event_persist_degraded',
            runId,
            state: workingSession.state,
            pipelineContext: workingSession.pipelineContext,
            eventName: 'replay',
            errorCode: error instanceof Error ? error.message : 'run_event_replay_failed',
          });
        }

        if ((workingSession.state === 'completed' || workingSession.state === 'failed') && replayedCount > 0) {
          close();
          return;
        }

        const runtimeProfile = workingSession.pipelineContext?.runtimeProfile;
        const budget = buildBudget(requestStartedAt, runtimeProfile);
        let currentState = workingSession.state;

        const emitEvent = (
          eventName: AgentRunEventName,
          payload: Record<string, unknown> = {},
        ) => {
          const seq = nextSeq + 1;
          nextSeq = seq;
          const event = createStoredRunEvent(runId, seq, eventName, payload);
          controller.enqueue(encoder.encode(formatRunEventSse(event)));

          const persistStartedAt = Date.now();
          void withPromiseTimeout(
            () => runEventService.appendEventWithSeq(runId, seq, eventName, payload),
            RUN_EVENT_PERSIST_TIMEOUT_MS,
            `${eventName} persistence`,
          )
            .then(() => {
              const durationMs = Date.now() - persistStartedAt;
              if (durationMs >= RUN_EVENT_PERSIST_SLOW_LOG_MS) {
                logRunCheckpoint({
                  checkpoint: 'run_event_persist_completed',
                  runId,
                  state: currentState,
                  pipelineContext: workingSession.pipelineContext,
                  eventName,
                  seq,
                  durationMs,
                });
              }
            })
            .catch((error) => {
              logRunCheckpoint({
                checkpoint: 'run_event_persist_degraded',
                runId,
                state: currentState,
                pipelineContext: workingSession.pipelineContext,
                eventName,
                seq,
                errorCode: error instanceof Error ? error.message : 'run_event_persist_failed',
              });
            });
        };

        logRunCheckpoint({
          checkpoint: 'stream_started',
          runId,
          state: currentState,
          pipelineContext: workingSession.pipelineContext,
          afterSeq: Number.isFinite(afterSeq) ? afterSeq : null,
          replayedEventCount: replayedCount,
          maxExecutionMs: budget.maxExecutionMs,
          remainingMs: Math.max(0, budget.remainingMs()),
        });

        if (replayedCount === 0 && !Number.isFinite(afterSeq)) {
          emitEvent('run.started', {
            tripId: workingSession.pipelineContext?.tripId ?? null,
            threadId: workingSession.pipelineContext?.threadId ?? null,
            mode: workingSession.pipelineContext?.mode ?? 'create',
            executionMode: workingSession.pipelineContext?.executionMode ?? 'draft_with_selective_verify',
          });
        }

        emitEvent('run.progress', {
          phase: 'session_resolved',
          state: currentState,
          runtimeProfile: runtimeProfile ?? 'default',
          budget: buildBudgetPayload(budget),
        });

        while (
          currentState !== 'timeline_ready'
          && currentState !== 'completed'
          && currentState !== 'failed'
        ) {
          const stateBeforePass = workingSession.state;
          const nextPass = getNextPassForState(workingSession.state, workingSession);

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

          if (currentState === 'failed' || result.outcome === 'failed_terminal') {
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

            logRunCheckpoint({
              checkpoint: 'run_failed',
              runId,
              state: currentState,
              pipelineContext: result.session.pipelineContext,
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
              retryable: errorCode !== 'runtime_budget_exhausted',
              remainingMs: Math.max(0, budget.remainingMs()),
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
              retryable: errorCode !== 'runtime_budget_exhausted',
            });
            close();
            return;
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
              seedAttempt: pausePayload.seedAttempt,
              dayAttempt: pausePayload.dayAttempt,
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
            close();
            return;
          }

          if (
            budget.remainingMs() < (STREAM_FINALIZE_RESERVE_MS + STREAM_CLOSE_RESERVE_MS)
            && currentState !== 'timeline_ready'
            && currentState !== 'completed'
          ) {
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
              seedAttempt: pausePayload.seedAttempt,
              dayAttempt: pausePayload.dayAttempt,
              budget: buildBudgetPayload(budget),
            });
            close();
            return;
          }
        }

        if (
          currentState === 'timeline_ready'
          && budget.remainingMs() < (STREAM_FINALIZE_RESERVE_MS + STREAM_CLOSE_RESERVE_MS)
        ) {
          const resumedSession = await persistRunSession(runId, currentState, currentState, {
            pipelineContext: {
              ...(workingSession.pipelineContext ?? {}),
              resumePassId: 'narrative_polish',
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
              seedAttempt: pausePayload.seedAttempt,
              dayAttempt: pausePayload.dayAttempt,
              budget: buildBudgetPayload(budget),
            });
          close();
          return;
        }

        if (currentState === 'timeline_ready') {
          const ctx: PassContext = {
            session: workingSession,
            budget,
            retryPolicy: DEFAULT_RETRY_POLICIES.narrative_polish,
            qualityPolicy: DEFAULT_QUALITY_POLICY,
          };

          logRunCheckpoint({
            checkpoint: 'narrative_stream_started',
            runId,
            state: currentState,
            pipelineContext: workingSession.pipelineContext,
            remainingMs: Math.max(0, budget.remainingMs()),
          });

          emitEvent('run.progress', {
            phase: 'narrative_streaming',
            state: currentState,
            budget: buildBudgetPayload(budget),
          });

          const { dayStream, finalResult } = await narrativePolishPassStreaming(ctx);
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch {
              // already closed
            }
          }, 4000);

          try {
            for await (const event of dayStream) {
              emitEvent('assistant.delta', {
                day: event.day,
                dayData: event.dayData,
                isComplete: event.isComplete,
              });
            }

            const narrativeResult = await finalResult;
            if (narrativeResult.outcome !== 'completed' || !narrativeResult.data) {
              const errorCode =
                typeof narrativeResult.metadata?.errorCode === 'string'
                  ? narrativeResult.metadata.errorCode
                  : narrativeResult.warnings[0] ?? 'narrative_generation_failed';

              logRunCheckpoint({
                checkpoint: 'run_failed',
                runId,
                state: currentState,
                pipelineContext: workingSession.pipelineContext,
                passId: 'narrative_polish',
                failureStage: currentState,
                errorCode,
                rootCause:
                  typeof narrativeResult.metadata?.rootCause === 'string'
                    ? narrativeResult.metadata.rootCause
                    : undefined,
                invalidFieldPath:
                  typeof narrativeResult.metadata?.invalidFieldPath === 'string'
                    ? narrativeResult.metadata.invalidFieldPath
                    : undefined,
                retryable: errorCode !== 'runtime_budget_exhausted',
                remainingMs: Math.max(0, budget.remainingMs()),
                warningCodes: narrativeResult.warnings,
              });

              emitEvent('run.failed', {
                error: errorCode,
                errorCode,
                passId: 'narrative_polish',
                failureStage: currentState,
                warnings: narrativeResult.warnings,
                rootCause:
                  typeof narrativeResult.metadata?.rootCause === 'string'
                    ? narrativeResult.metadata.rootCause
                    : undefined,
                invalidFieldPath:
                  typeof narrativeResult.metadata?.invalidFieldPath === 'string'
                    ? narrativeResult.metadata.invalidFieldPath
                    : undefined,
                retryable: errorCode !== 'runtime_budget_exhausted',
              });
              close();
              return;
            }

            workingSession = await persistRunSession(runId, 'timeline_ready', 'completed', {
              narrativeState: narrativeResult.data,
              warnings: [...workingSession.warnings, ...narrativeResult.warnings],
            });
            currentState = 'completed';

            emitEvent('run.progress', {
              phase: 'narrative_completed',
              state: currentState,
              budget: buildBudgetPayload(budget),
            });
          } finally {
            clearInterval(heartbeat);
          }
        }

        const completedSession = workingSession;
        if (completedSession.state !== 'completed') {
          logRunCheckpoint({
            checkpoint: 'run_failed',
            runId,
            state: completedSession.state,
            pipelineContext: completedSession.pipelineContext,
            failureStage: completedSession.state,
            errorCode: 'run_not_completed',
            retryable: false,
            remainingMs: Math.max(0, budget.remainingMs()),
          });
          emitEvent('run.failed', {
            error: `Session not completed (state: ${completedSession.state})`,
            errorCode: 'run_not_completed',
          });
          close();
          return;
        }

        const persistedTrip = await finalizeSessionToTrip(completedSession);
        const metrics = await evalService.evaluateAndSaveItinerary(persistedTrip.itinerary, {
          runId,
          tripId: persistedTrip.tripId,
          tripVersion: persistedTrip.version,
          context: {
            mutationType: 'generation',
          },
        });

        logRunCheckpoint({
          checkpoint: 'eval_completed',
          runId,
          tripId: persistedTrip.tripId,
          state: completedSession.state,
          pipelineContext: completedSession.pipelineContext,
          tripVersion: persistedTrip.version,
          metricCount: metrics.length,
          failedMetricCount: metrics.filter((metric) => metric.metricValue < 1).length,
        });

        emitEvent('itinerary.updated', {
          tripId: persistedTrip.tripId,
          tripVersion: persistedTrip.version,
          completionLevel: persistedTrip.itinerary.completionLevel,
          updatedDayIndexes: persistedTrip.itinerary.days.map((_, index) => index),
        });

        logRunCheckpoint({
          checkpoint: 'run_finished',
          runId,
          tripId: persistedTrip.tripId,
          state: completedSession.state,
          pipelineContext: completedSession.pipelineContext,
          tripVersion: persistedTrip.version,
          completionLevel: persistedTrip.itinerary.completionLevel,
          totalDurationMs: persistedTrip.totalDurationMs,
        });

        emitEvent('run.finished', {
          tripId: persistedTrip.tripId,
          tripVersion: persistedTrip.version,
          status: 'completed',
        });
      } catch (error) {
        const message =
          error instanceof SessionNotFoundError
            ? 'Session not found'
            : error instanceof Error
              ? error.message
              : 'Internal error';

        try {
          logRunCheckpoint({
            checkpoint: 'run_failed',
            runId,
            errorCode: message,
            retryable: false,
          });
          controller.enqueue(encoder.encode(formatRunEventSse(createStoredRunEvent(
            runId,
            nextSeq + 1,
            'run.failed',
            { error: message, errorCode: message },
          ))));
        } catch {
          controller.enqueue(encoder.encode(`event: run.failed\ndata: ${JSON.stringify({
            event: 'run.failed',
            runId,
            error: message,
            errorCode: message,
          })}\n\n`));
        }
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
