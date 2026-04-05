/**
 * GET /api/v1/plan-runs/[runId]
 * run 状態取得
 */

import { NextResponse } from 'next/server';
import { loadPlanRun } from '@/lib/services/plan-run/run-store';
import { getUser } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const run = await loadPlanRun(runId);
    const user = await getUser().catch(() => null);
    const accessToken = new URL(request.url).searchParams.get('access_token');

    if (!run.userId) {
      if (!accessToken || accessToken !== run.accessToken) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else if (run.userId !== user?.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      runId: run.id,
      state: run.state,
      stateVersion: run.stateVersion,
      currentPassId: run.currentPassId ?? null,
      lastCompletedPassId: run.lastCompletedPassId ?? null,
      completedTripId: run.completedTripId ?? null,
      completedTripVersion: run.completedTripVersion ?? null,
      failure: run.failureContext ?? null,
      warnings: run.warnings,
      pauseContext: run.pauseContext ?? null,
      resumeHint: run.resumeHint,
      execution: run.execution,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
