import { NextResponse } from 'next/server';
import type { PassBudget } from '@/types/plan-generation';
import {
  REQUEST_DEADLINE_MS,
  PLATFORM_HEADROOM_MS,
  NETLIFY_FREE_RUNTIME_PROFILE,
  STREAM_EXECUTION_BUDGET_MS,
} from '@/lib/services/plan-generation/constants';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';
import { getAgentRunPhase, getAgentRunStatus } from '@/lib/services/plan-generation/lifecycle';
import { processRunUntilYield, type RunProcessorEvent } from '@/lib/services/plan-generation/run-processor';
import { loadRun } from '@/lib/services/plan-generation/run-store';
import { runEventService } from '@/lib/agent/run-events';

export const maxDuration = 25;
export const runtime = 'nodejs';

function hasFinalizedTrip(
  session: Awaited<ReturnType<typeof loadRun>>,
): session is Awaited<ReturnType<typeof loadRun>> & {
  pipelineContext: NonNullable<Awaited<ReturnType<typeof loadRun>>['pipelineContext']> & {
    finalizedTripId: string;
    finalizedTripVersion: number;
  };
} {
  return Boolean(
    session.pipelineContext?.finalizedTripId
      && typeof session.pipelineContext?.finalizedTripVersion === 'number',
  );
}

function resolveExecutionBudgetMs(runtimeProfile?: string): number {
  return runtimeProfile === NETLIFY_FREE_RUNTIME_PROFILE
    ? STREAM_EXECUTION_BUDGET_MS[NETLIFY_FREE_RUNTIME_PROFILE]
    : STREAM_EXECUTION_BUDGET_MS.default;
}

function buildBudget(startedAt: number, runtimeProfile?: string): PassBudget {
  const maxExecutionMs = Math.min(
    resolveExecutionBudgetMs(runtimeProfile),
    REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS,
  );
  const deadlineAt = startedAt + maxExecutionMs;

  return {
    maxExecutionMs,
    deadlineAt,
    remainingMs: () => deadlineAt - Date.now(),
  };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const startedAt = Date.now();
  const session = await loadRun(runId);
  const accessError = await assertSessionAccess(session);
  if (accessError) {
    return NextResponse.json({ error: accessError }, { status: 403 });
  }

  const events: RunProcessorEvent[] = [];
  const existingEvents = await runEventService.listEvents(runId);
  let nextSeq = existingEvents.at(-1)?.seq ?? 0;
  if ((session.state === 'core_ready' || session.state === 'completed') && hasFinalizedTrip(session)) {
    return NextResponse.json({
      runId,
      state: session.state,
      status: getAgentRunStatus(session.state),
      phase: getAgentRunPhase(session.state),
      stopReason: 'core_ready',
      eventCount: 0,
      events: [],
      budget: {
        maxExecutionMs: 0,
        remainingMs: 0,
      },
    });
  }
  const budget = buildBudget(startedAt, session.pipelineContext?.runtimeProfile);
  if (nextSeq === 0) {
    events.push({
      event: 'run.started',
      payload: {
        tripId: session.pipelineContext?.tripId ?? null,
        threadId: session.pipelineContext?.threadId ?? null,
        mode: session.pipelineContext?.mode ?? 'create',
        executionMode: session.pipelineContext?.executionMode ?? 'draft_with_selective_verify',
      },
    });
  }
  const result = await processRunUntilYield({
    runId,
    budget,
    initialSession: session,
    emitEvent: (event, payload) => {
      events.push({ event, payload });
    },
  });

  for (const queuedEvent of events) {
    nextSeq += 1;
    await runEventService.appendEventWithSeq(
      runId,
      nextSeq,
      queuedEvent.event,
      queuedEvent.payload ?? {},
    );
  }

  return NextResponse.json({
    runId,
    state: result.currentState,
    status: getAgentRunStatus(result.currentState),
    phase: getAgentRunPhase(result.currentState),
    stopReason: result.stopReason,
    eventCount: events.length,
    events,
    budget: {
      maxExecutionMs: budget.maxExecutionMs,
      remainingMs: Math.max(0, budget.remainingMs()),
    },
  });
}
