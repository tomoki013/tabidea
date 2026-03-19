import { runSeedPipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { PreCheckedUsage } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { UserInput } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

export async function POST(req: Request) {
  try {
    let body: {
      input: UserInput;
      options?: { isRetry?: boolean };
      preCheckedUsage?: PreCheckedUsage;
    };
    try {
      body = await req.json();
    } catch (error) {
      console.error('[POST /api/itinerary/plan/seed] Invalid request body:', error);
      return Response.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
    }

    const result = await runSeedPipeline(
      body.input,
      body.options,
      undefined,
      body.preCheckedUsage
    );

    if (result.success) {
      return Response.json({
        ok: true,
        normalizedRequest: result.normalizedRequest,
        seed: result.seed,
        warnings: result.warnings,
        metadata: result.metadata,
      });
    }

    const status = result.limitExceeded ? 429 : 500;
    console.error('[POST /api/itinerary/plan/seed] Seed pipeline failed:', {
      failedStep: result.failedStep,
      message: result.message,
      limitExceeded: result.limitExceeded ?? false,
    });
    return Response.json({
      ok: false,
      error: result.message ?? 'seed_pipeline_failed',
      failedStep: result.failedStep,
      limitExceeded: result.limitExceeded ?? false,
      userType: result.userType,
      resetAt: result.resetAt,
      remaining: result.remaining,
    }, { status });
  } catch (error) {
    console.error('[POST /api/itinerary/plan/seed] Unexpected error:', error);
    return Response.json({ ok: false, error: 'seed_pipeline_failed' }, { status: 500 });
  }
}
