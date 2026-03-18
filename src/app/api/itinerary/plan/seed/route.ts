import { runSeedPipeline } from '@/lib/services/itinerary/pipeline-orchestrator';
import type { UserInput } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 9;

export async function POST(req: Request) {
  let body: { input: UserInput; options?: { isRetry?: boolean } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = await runSeedPipeline(body.input, body.options);

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
  return Response.json({
    ok: false,
    error: result.message ?? 'seed_pipeline_failed',
    failedStep: result.failedStep,
    limitExceeded: result.limitExceeded ?? false,
    userType: result.userType,
    resetAt: result.resetAt,
    remaining: result.remaining,
  }, { status });
}
