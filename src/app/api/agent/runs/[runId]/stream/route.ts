import { loadRun } from '@/lib/services/plan-generation/run-store';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';
import {
  createStoredRunEvent,
  formatRunEventSse,
  runEventService,
} from '@/lib/agent/run-events';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { withPromiseTimeout } from '@/lib/utils/promise-timeout';

const RUN_EVENT_PERSIST_TIMEOUT_MS = 1_000;
export const maxDuration = 25;
export const runtime = 'nodejs';

async function listReplayEvents(runId: string, afterSeq?: number) {
  return withPromiseTimeout(
    () => runEventService.listEvents(runId, afterSeq),
    RUN_EVENT_PERSIST_TIMEOUT_MS,
    'run event replay',
  );
}

function getFinalizedTripSummary(session: Awaited<ReturnType<typeof loadRun>>) {
  const finalizedTripId = session.pipelineContext?.finalizedTripId ?? null;
  const finalizedTripVersion = session.pipelineContext?.finalizedTripVersion ?? null;
  if (!finalizedTripId || typeof finalizedTripVersion !== 'number') {
    return null;
  }

  return {
    tripId: finalizedTripId,
    tripVersion: finalizedTripVersion,
    completionLevel: session.pipelineContext?.finalizedCompletionLevel ?? null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
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
        const workingSession = await loadRun(runId);
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

        if ((workingSession.state === 'completed' || workingSession.state === 'core_ready' || workingSession.state === 'failed_retryable' || workingSession.state === 'failed_terminal') && replayedCount > 0) {
          close();
          return;
        }

        logRunCheckpoint({
          checkpoint: 'stream_started',
          runId,
          state: workingSession.state,
          pipelineContext: workingSession.pipelineContext,
          afterSeq: Number.isFinite(afterSeq) ? afterSeq : null,
          replayedEventCount: replayedCount,
        });

        const finalizedTripSummary = getFinalizedTripSummary(workingSession);
        if ((workingSession.state === 'completed' || workingSession.state === 'core_ready') && finalizedTripSummary) {
          if (replayedCount === 0) {
            const replayEvents = [
              createStoredRunEvent(runId, nextSeq + 1, 'run.core_ready', {
                tripId: finalizedTripSummary.tripId,
                tripVersion: finalizedTripSummary.tripVersion,
                completionLevel: finalizedTripSummary.completionLevel,
                status: 'core_ready',
              }),
              createStoredRunEvent(runId, nextSeq + 2, 'itinerary.updated', {
                tripId: finalizedTripSummary.tripId,
                tripVersion: finalizedTripSummary.tripVersion,
                completionLevel: finalizedTripSummary.completionLevel,
              }),
              createStoredRunEvent(runId, nextSeq + 3, 'run.finished', {
                tripId: finalizedTripSummary.tripId,
                tripVersion: finalizedTripSummary.tripVersion,
                status: 'completed',
              }),
            ];

            for (const event of replayEvents) {
              controller.enqueue(encoder.encode(formatRunEventSse(event)));
              nextSeq = event.seq;
            }
          }
          close();
          return;
        }
        close();
        return;
      } catch (error) {
        const errorCode = error instanceof SessionNotFoundError
          ? 'Session not found'
          : error instanceof Error
            ? error.message
            : 'Internal error';

        try {
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
          });
          controller.enqueue(encoder.encode(formatRunEventSse(createStoredRunEvent(
            runId,
            nextSeq + 1,
            'run.failed',
            { error: errorCode, errorCode },
          ))));
        } catch {
          controller.enqueue(encoder.encode(`event: run.failed\ndata: ${JSON.stringify({
            event: 'run.failed',
            runId,
            error: errorCode,
            errorCode,
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
