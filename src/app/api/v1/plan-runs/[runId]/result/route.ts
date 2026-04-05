/**
 * GET /api/v1/plan-runs/[runId]/result
 * completed 後の結果取得
 */

import { NextResponse } from 'next/server';
import { loadPlanRun } from '@/lib/services/plan-run/run-store';
import { getUser } from '@/lib/supabase/server';
import { tripService } from '@/lib/trips/service';

interface Params {
  params: Promise<{ runId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { runId } = await params;
    const run = await loadPlanRun(runId);

    // 認可チェック (設計書 §8.4)
    const user = await getUser().catch(() => null);
    const accessToken = new URL(request.url).searchParams.get('access_token');

    if (!run.userId) {
      if (!accessToken || accessToken !== run.accessToken) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } else if (run.userId !== user?.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (run.state === 'failed') {
      return NextResponse.json({
        state: 'failed',
        warnings: run.warnings,
        failure: run.failureContext ?? null,
      }, { status: 422 });
    }

    if (run.state !== 'completed') {
      return NextResponse.json({
        state: run.state,
        currentPassId: run.currentPassId ?? null,
        pauseContext: run.pauseContext ?? null,
        resumeHint: run.resumeHint,
        execution: run.execution,
        message: 'プランをまだ生成中です',
      }, { status: 409 });
    }

    if (!run.completedTripId) {
      return NextResponse.json({ error: 'trip_not_found' }, { status: 500 });
    }

    const { itinerary } = await tripService.fetchTrip(run.completedTripId);

    return NextResponse.json({
      state: 'completed',
      tripId: run.completedTripId,
      tripVersion: run.completedTripVersion,
      itinerary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
