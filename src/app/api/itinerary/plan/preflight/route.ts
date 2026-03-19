import { checkAndRecordUsage } from '@/lib/limits/check';
import { ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS } from '@/lib/services/itinerary/runtime-budget';
import { resolveModelsForPipeline } from '@/lib/services/itinerary/pipeline-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS;

export async function POST(req: Request) {
  try {
    let body: { options?: { isRetry?: boolean } };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const usageResult = await checkAndRecordUsage('plan_generation', undefined, {
      skipConsume: body.options?.isRetry,
    });

    if (!usageResult.allowed) {
      return Response.json({
        ok: false,
        allowed: false,
        limitExceeded: true,
        userType: usageResult.userType,
        resetAt: usageResult.resetAt?.toISOString() ?? null,
        remaining: usageResult.remaining,
      }, { status: 429 });
    }

    const { semanticModel, narrativeModel, modelTier, provider } = resolveModelsForPipeline(
      usageResult.userType
    );

    return Response.json({
      ok: true,
      allowed: true,
      userType: usageResult.userType,
      remaining: usageResult.remaining,
      resetAt: usageResult.resetAt?.toISOString() ?? null,
      metadata: {
        modelName: semanticModel.modelName,
        narrativeModelName: narrativeModel.modelName,
        modelTier,
        provider,
      },
    });
  } catch (error) {
    console.error('[POST /api/itinerary/plan/preflight] Unexpected error:', error);
    return Response.json({ ok: false, error: 'preflight_failed' }, { status: 500 });
  }
}
