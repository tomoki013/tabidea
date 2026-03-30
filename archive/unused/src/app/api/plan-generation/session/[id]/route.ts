/**
 * GET /api/plan-generation/session/:id
 * セッションの現在状態を取得する
 */

import { NextResponse } from 'next/server';
import { loadSession } from '@/lib/services/plan-generation/session-store';
import { SessionNotFoundError } from '@/lib/services/plan-generation/errors';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';

export const runtime = 'nodejs';

export async function GET(
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

    return NextResponse.json({
      id: session.id,
      state: session.state,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      warnings: session.warnings,
      evaluationReport: session.evaluationReport
        ? {
            overallScore: session.evaluationReport.overallScore,
            passGrade: session.evaluationReport.passGrade,
            violationCount: session.evaluationReport.violations.length,
          }
        : undefined,
      draftPlan: session.draftPlan
        ? {
            destination: session.draftPlan.destination,
            description: session.draftPlan.description,
            dayCount: session.draftPlan.days.length,
            totalStops: session.draftPlan.days.reduce((s, d) => s + d.stops.length, 0),
          }
        : undefined,
    });
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('[plan-generation] session get failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
