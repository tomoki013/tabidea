/**
 * POST /api/plan-generation/session/:id/run
 * 次のパスを実行する
 */

import { NextResponse } from 'next/server';
import type { PassBudget } from '@/types/plan-generation';
import { executeNextPass } from '@/lib/services/plan-generation/executor';
import { SessionNotFoundError, PassExecutionError } from '@/lib/services/plan-generation/errors';
import { REQUEST_DEADLINE_MS, PLATFORM_HEADROOM_MS } from '@/lib/services/plan-generation/constants';

export const maxDuration = 25;
export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestStart = Date.now();

  try {
    const { id } = await params;

    // PassBudget を HTTP デッドラインから構築
    const deadlineAt = requestStart + REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS;
    const budget: PassBudget = {
      maxExecutionMs: REQUEST_DEADLINE_MS - PLATFORM_HEADROOM_MS,
      deadlineAt,
      remainingMs: () => deadlineAt - Date.now(),
    };

    const result = await executeNextPass(id, budget);

    return NextResponse.json({
      passId: result.passId,
      outcome: result.outcome,
      newState: result.newState,
      warnings: result.warnings,
      durationMs: result.durationMs,
      session: {
        id: result.session.id,
        state: result.session.state,
        updatedAt: result.session.updatedAt,
      },
    });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (err instanceof PassExecutionError) {
      return NextResponse.json(
        {
          error: err.message,
          passId: err.passId,
          durationMs: Date.now() - requestStart,
        },
        { status: 500 },
      );
    }
    console.error('[plan-generation] run failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
