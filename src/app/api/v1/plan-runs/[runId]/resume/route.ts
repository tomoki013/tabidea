import { NextResponse } from 'next/server';
import { executePipeline } from '@/lib/services/plan-run/pipeline-executor';
import {
  claimPlanRunExecution,
  commitPlanRunSlice,
  loadPlanRun,
  transitionPlanRun,
} from '@/lib/services/plan-run/run-store';
import { NETLIFY_FREE_LIMIT_MS, STREAM_CLOSE_RESERVE_MS, STREAM_FINALIZE_RESERVE_MS } from '@/lib/services/plan-run/constants';
import { canExecute, determineNextPass } from '@/lib/services/plan-run/state-machine';
import { getUser } from '@/lib/supabase/server';
import { createPerformanceTimer } from '@/lib/utils/performance-timer';
import { PlanRunStoreOperationError } from '@/lib/services/plan-run/errors';
import type { PlanRun } from '@/types/plan-run';

export const maxDuration = 30;
export const runtime = 'nodejs';

const PROCESS_BUDGET_MS = NETLIFY_FREE_LIMIT_MS - STREAM_FINALIZE_RESERVE_MS - STREAM_CLOSE_RESERVE_MS;

interface Params {
  params: Promise<{ runId: string }>;
}

interface ResumeFailurePayload {
  error: 'plan_run_resume_internal_error';
  message: string;
  stage: 'load_run' | 'auth' | 'claim_execution' | 'execute_slice' | 'commit_slice' | 'unknown';
  retryable: false;
  failure?: {
    errorCode: 'plan_run_resume_internal_error';
    message: string;
    retryable: false;
    rootCause?: string;
  };
  recoveredState?: 'paused';
}

function buildStatusResponse(
  run: Awaited<ReturnType<typeof loadPlanRun>>,
  executionStatus: 'advanced' | 'already_running' | 'terminal',
) {
  return {
    runId: run.id,
    state: run.state,
    stateVersion: run.stateVersion,
    executionStatus,
    currentPassId: run.currentPassId ?? null,
    pauseContext: run.pauseContext ?? null,
    failure: run.failureContext ?? null,
    completedTripId: run.completedTripId ?? null,
    completedTripVersion: run.completedTripVersion ?? null,
    resumeHint: run.resumeHint,
    execution: run.execution,
  };
}

export async function POST(request: Request, { params }: Params) {
  const timer = createPerformanceTimer('plan-run-resume');
  const { runId } = await params;
  let stage: ResumeFailurePayload['stage'] = 'load_run';
  let currentRun: PlanRun | null = null;
  let nextPassId: ReturnType<typeof determineNextPass> = null;

  try {
    timer.start('load_run');
    const run = await loadPlanRun(runId);
    currentRun = run;
    timer.end('load_run');

    stage = 'auth';
    timer.start('auth');
    const user = await getUser().catch(() => null);
    const accessToken = new URL(request.url).searchParams.get('access_token');
    timer.end('auth');

    if (!run.userId) {
      if (!accessToken || accessToken !== run.accessToken) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else if (run.userId !== user?.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (run.state === 'completed' || run.state === 'failed') {
      return NextResponse.json(buildStatusResponse(run, 'terminal'));
    }

    nextPassId = determineNextPass(run);
    if (!nextPassId || !canExecute(run.state)) {
      return NextResponse.json(buildStatusResponse(run, 'already_running'));
    }

    stage = 'claim_execution';
    timer.start('claim_execution');
    const lease = await claimPlanRunExecution(runId, nextPassId, run.stateVersion, PROCESS_BUDGET_MS + 2_000);
    timer.end('claim_execution');

    if (!lease.acquired) {
      return NextResponse.json(buildStatusResponse(lease.run, lease.run.state === 'completed' || lease.run.state === 'failed' ? 'terminal' : 'already_running'));
    }

    stage = 'execute_slice';
    timer.start('execute_slice');
    const startedAt = Date.now();
    const deadlineAt = startedAt + PROCESS_BUDGET_MS;
    const budget = {
      maxExecutionMs: PROCESS_BUDGET_MS,
      deadlineAt,
      remainingMs: () => Math.max(0, deadlineAt - Date.now()),
    };
    const result = await executePipeline(lease.run, budget);
    timer.end('execute_slice');

    stage = 'commit_slice';
    timer.start('commit_slice');
    const committedRun = await commitPlanRunSlice(runId, {
      stateVersion: lease.run.stateVersion,
      leaseToken: lease.leaseToken,
      stopReason: result.stopReason,
      currentPassId: result.currentPassId,
      lastCompletedPassId: result.lastCompletedPassId,
      pauseContext: result.pauseContext,
      failureContext: result.failureContext,
      warnings: result.warnings,
      patch: result.patch,
      budgetMs: PROCESS_BUDGET_MS,
      metadata: result.metadata,
    });
    timer.end('commit_slice');

    timer.log();
    return NextResponse.json(buildStatusResponse(
      committedRun,
      committedRun.state === 'completed' || committedRun.state === 'failed' ? 'terminal' : 'advanced',
    ));
  } catch (error) {
    timer.log();
    const message = error instanceof Error ? error.message : 'Internal error';
    const effectiveStage = error instanceof PlanRunStoreOperationError ? error.stage : stage;
    const rootCause = error instanceof PlanRunStoreOperationError
      ? JSON.stringify(error.details ?? {})
      : error instanceof Error
        ? error.name
        : 'unknown';

    console.error('[plan-run-resume]', {
      runId,
      stage: effectiveStage,
      state: currentRun?.state ?? null,
      stateVersion: currentRun?.stateVersion ?? null,
      currentPassId: currentRun?.currentPassId ?? null,
      nextPassId,
      message,
      rootCause,
      stack: error instanceof Error ? error.stack : undefined,
    });

    let recoveredState: ResumeFailurePayload['recoveredState'];
    if (currentRun && (effectiveStage === 'claim_execution' || effectiveStage === 'unknown') && canExecute(currentRun.state) && nextPassId) {
      try {
        await transitionPlanRun(currentRun.id, currentRun.state, 'paused', {
          currentPassId: nextPassId,
          pauseContext: {
            pauseReason: 'infrastructure_interrupted',
            resumePassId: nextPassId,
            pausedAt: new Date().toISOString(),
          },
          resumeHint: {
            mode: 'manual',
            reason: 'infrastructure_interrupted',
          },
          warnings: [...(currentRun.warnings ?? []), message],
        });
        recoveredState = 'paused';
      } catch (recoveryError) {
        console.error('[plan-run-resume:recovery-failed]', {
          runId,
          stage: effectiveStage,
          recoveryMessage: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        });
      }
    }

    const payload: ResumeFailurePayload = {
      error: 'plan_run_resume_internal_error',
      message,
      stage: effectiveStage,
      retryable: false,
      failure: {
        errorCode: 'plan_run_resume_internal_error',
        message,
        retryable: false,
        rootCause,
      },
      ...(recoveredState ? { recoveredState } : {}),
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
