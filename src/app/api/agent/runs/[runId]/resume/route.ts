import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { loadRun, updateRun } from '@/lib/services/plan-generation/run-store';
import { determineResumeState } from '@/lib/services/plan-generation/state-machine';

export const runtime = 'nodejs';
export const maxDuration = 10;

function getClient() {
  return createServiceRoleClient();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const run = await loadRun(runId);

    const accessError = await assertSessionAccess(run);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const resumeState = determineResumeState(run);
    if (run.state !== 'failed_retryable' && run.state !== 'created' && run.state !== 'normalized') {
      return NextResponse.json({ error: 'run_not_resumable' }, { status: 409 });
    }
    if (resumeState === 'created') {
      return NextResponse.json({ error: 'run_not_resumable' }, { status: 409 });
    }

    await updateRun(run.id, {
      pipelineContext: {
        ...(run.pipelineContext ?? {}),
        resumedFromRunId: run.id,
        resumeStrategy: 'same_run_resume',
      },
    });

    const { error } = await getClient()
      .from('runs')
      .update({
        state: resumeState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    if (error) {
      throw new Error(`Failed to resume existing run ${run.id}: ${error.message}`);
    }

    logRunCheckpoint({
      checkpoint: 'run_resumed',
      runId: run.id,
      tripId: run.pipelineContext?.tripId ?? null,
      state: resumeState,
      executionMode: run.pipelineContext?.executionMode,
      runtimeProfile: run.pipelineContext?.runtimeProfile,
      mode: run.pipelineContext?.mode,
      threadId: run.pipelineContext?.threadId ?? null,
      resumeSourceRunId: run.id,
      resumeStrategy: 'same_run_resume',
    });

    return NextResponse.json({
      runId: run.id,
      threadId: run.pipelineContext?.threadId ?? null,
      tripId: run.pipelineContext?.tripId ?? null,
      status: 'queued',
      streamUrl: `/api/agent/runs/${run.id}/stream`,
      processUrl: `/api/agent/runs/${run.id}/process`,
    });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'run_not_found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 },
    );
  }
}
