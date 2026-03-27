/**
 * POST /api/plan-generation/session/:id/finalize
 * 完了したセッションから Itinerary を生成して返却する
 */

import { NextResponse } from 'next/server';
import { loadSession } from '@/lib/services/plan-generation/session-store';
import { sessionToItinerary } from '@/lib/services/plan-generation/bridges/session-to-itinerary';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';

export const maxDuration = 10;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await loadSession(id);

    if (session.state !== 'completed') {
      return NextResponse.json(
        { error: `Session is not completed (state: ${session.state})` },
        { status: 400 },
      );
    }

    const itinerary = sessionToItinerary(session);

    return NextResponse.json({ itinerary });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('[plan-generation] finalize failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
