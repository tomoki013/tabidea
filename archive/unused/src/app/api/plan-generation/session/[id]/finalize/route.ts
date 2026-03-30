/**
 * POST /api/plan-generation/session/:id/finalize
 * 完了したセッションから Itinerary を生成して返却する
 * EventLogger で generation_logs に記録 (v3 パリティ)
 */

import { NextResponse } from 'next/server';
import { loadSession } from '@/lib/services/plan-generation/session-store';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { PlanGenerationLogger } from '@/lib/services/plan-generation/logger';
import { finalizeSessionToTrip } from '@/lib/services/plan-generation/finalize-session';
import { runEventService } from '@/lib/agent/run-events';
import { evalService } from '@/lib/evals/service';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';

export const maxDuration = 10;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await loadSession(id);

    // 所有権チェック
    const accessError = await assertSessionAccess(session);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    if (session.state !== 'completed') {
      return NextResponse.json(
        { error: `Session is not completed (state: ${session.state})` },
        { status: 400 },
      );
    }

    const persistedTrip = await finalizeSessionToTrip(session);
    await evalService.evaluateAndSaveItinerary(persistedTrip.itinerary, {
      runId: session.id,
      tripId: persistedTrip.tripId,
      tripVersion: persistedTrip.version,
      context: {
        mutationType: 'generation',
      },
    });
    await runEventService.appendEvent(id, 'itinerary.updated', {
      tripId: persistedTrip.tripId,
      tripVersion: persistedTrip.version,
      completionLevel: persistedTrip.itinerary.completionLevel,
      updatedDayIndexes: persistedTrip.itinerary.days.map((_, index) => index),
    });
    await runEventService.appendEvent(id, 'run.finished', {
      tripId: persistedTrip.tripId,
      tripVersion: persistedTrip.version,
      status: 'completed',
    });

    // EventLogger: generation_logs に記録 (fire-and-forget)
    const logger = new PlanGenerationLogger(id);
    logger.logCompletedSession(session, persistedTrip.totalDurationMs);

    return NextResponse.json({
      itinerary: persistedTrip.itinerary,
      trip: {
        tripId: persistedTrip.tripId,
        version: persistedTrip.version,
      },
    });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('[plan-generation] finalize failed:', err);
    const { id } = await params;
    await runEventService.appendEvent(id, 'run.failed', {
      error: err instanceof Error ? err.message : 'Internal error',
    }).catch(() => {});
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
