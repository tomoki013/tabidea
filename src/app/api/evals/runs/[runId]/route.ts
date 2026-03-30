import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { loadRun } from '@/lib/services/plan-generation/run-store';
import { assertSessionAccess } from '@/lib/services/plan-generation/auth';
import { evalService } from '@/lib/evals/service';

interface SaveRunEvalRequestBody {
  mode: 'rule_based' | 'llm_judge' | 'user_feedback';
  metrics: Record<string, number>;
  details?: Record<string, Record<string, unknown>>;
  tripId?: string;
  tripVersion?: number;
}

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
    }

    const { runId } = await params;
    const session = await loadRun(runId);
    const accessError = await assertSessionAccess(session);
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: 403 });
    }

    const body = await request.json() as SaveRunEvalRequestBody;
    await evalService.saveEvalResults({
      runId,
      tripId: body.tripId,
      tripVersion: body.tripVersion,
      evalType: body.mode,
      metrics: Object.entries(body.metrics ?? {}).map(([metricName, metricValue]) => ({
        metricName,
        metricValue,
        details: body.details?.[metricName],
      })),
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'eval_save_failed',
      },
      { status: 500 },
    );
  }
}
