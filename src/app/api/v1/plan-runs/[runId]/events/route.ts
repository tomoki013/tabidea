/**
 * GET /api/v1/plan-runs/[runId]/events
 * Replay/debug 用の簡易 SSE
 * 実行は POST /resume が担い、この route は副作用を持たない
 */

import { getUser } from '@/lib/supabase/server';
import { loadPlanRun, loadPlanRunSlices } from '@/lib/services/plan-run/run-store';
import type { PlanRun, PlanRunFailedEvent } from '@/types/plan-run';

export const maxDuration = 30;
export const runtime = 'nodejs';

interface Params {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { runId } = await params;

  try {
    const [run, slices] = await Promise.all([
      loadPlanRun(runId),
      loadPlanRunSlices(runId, 5),
    ]);

    // 認可チェック (設計書 §8.4)
    const user = await getUser().catch(() => null);
    const accessToken = new URL(request.url).searchParams.get('access_token');

    if (!run.userId) {
      if (!accessToken || accessToken !== run.accessToken) {
        return new Response('Forbidden', { status: 403 });
      }
    } else if (run.userId !== user?.id) {
      return new Response('Forbidden', { status: 403 });
    }

    return new Response(buildSimpleSSE(run, slices), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response('Internal Error', { status: 500 });
  }
}

function buildSimpleSSE(run: PlanRun, slices: Awaited<ReturnType<typeof loadPlanRunSlices>>): string {
  const latestSlice = slices[0];
  if (run.state === 'completed') {
    return `data: ${JSON.stringify({ type: 'run.completed', tripId: run.completedTripId, tripVersion: run.completedTripVersion })}\n\n` +
           `data: ${JSON.stringify({ type: 'stream.end' })}\n\n`;
  }

  if (run.state === 'failed') {
    const failedEvent: PlanRunFailedEvent = {
      type: 'run.failed',
      passId: run.failureContext?.passId,
      errorCode: run.failureContext?.errorCode ?? 'pipeline_failed',
      message: run.failureContext?.message ?? run.warnings.join('; '),
      rootCause: run.failureContext?.rootCause,
      invalidFieldPath: run.failureContext?.invalidFieldPath,
      retryable: run.failureContext?.retryable ?? false,
    };
    return `data: ${JSON.stringify(failedEvent)}\n\n` +
           `data: ${JSON.stringify({ type: 'stream.end' })}\n\n`;
  }

  if (run.pauseContext) {
    return `data: ${JSON.stringify({
      type: 'run.paused',
      resumePassId: run.pauseContext.resumePassId,
      pauseReason: run.pauseContext.pauseReason,
      currentPassId: run.currentPassId ?? latestSlice?.currentPassId ?? null,
    })}\n\n` +
    `data: ${JSON.stringify({ type: 'stream.end' })}\n\n`;
  }

  return `data: ${JSON.stringify({
    type: 'run.progress',
    passId: run.currentPassId ?? latestSlice?.currentPassId ?? 'normalize_request',
    state: run.state,
    message: run.currentPassId ? `pass: ${run.currentPassId}` : `state: ${run.state}`,
  })}\n\n` +
  `data: ${JSON.stringify({ type: 'stream.end' })}\n\n`;
}
