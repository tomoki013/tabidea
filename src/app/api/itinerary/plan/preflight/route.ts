import { checkAndRecordUsage } from '@/lib/limits/check';
import type { UserType } from '@/lib/limits/config';
import { logPreflightCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { resolveModelsForPipeline } from '@/lib/services/itinerary/pipeline-helpers';
import { createPerformanceTimer } from '@/lib/utils/performance-timer';
import { withPromiseTimeout } from '@/lib/utils/promise-timeout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

const PREFLIGHT_TIMEOUT_MS = 1_500;
const DEGRADED_PREFLIGHT_USER_TYPE: UserType = 'free';

export async function POST(req: Request) {
  const timer = createPerformanceTimer('planGeneration:preflight', {
    usage_check: PREFLIGHT_TIMEOUT_MS,
  });

  try {
    let body: { options?: { isRetry?: boolean } };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    logPreflightCheckpoint({
      checkpoint: 'preflight_started',
      isRetry: body.options?.isRetry ?? false,
    });

    const usageResult = await timer.measure('usage_check', () => withPromiseTimeout(
      () => checkAndRecordUsage('plan_generation', undefined, {
        skipConsume: true,
      }),
      PREFLIGHT_TIMEOUT_MS,
      'plan preflight usage check',
    ));

    if (!usageResult.allowed) {
      timer.log();
      logPreflightCheckpoint({
        checkpoint: 'preflight_completed',
        allowed: false,
        limitExceeded: true,
        userType: usageResult.userType,
        remaining: usageResult.remaining,
      });
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

    timer.log();
    logPreflightCheckpoint({
      checkpoint: 'preflight_completed',
      allowed: true,
      degraded: false,
      userType: usageResult.userType,
      remaining: usageResult.remaining,
    });

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
    timer.log();
    logPreflightCheckpoint({
      checkpoint: 'preflight_degraded',
      degraded: process.env.NODE_ENV !== 'production',
      errorCode: error instanceof Error ? error.message : 'preflight_failed',
    });

    if (process.env.NODE_ENV !== 'production') {
      const { semanticModel, narrativeModel, modelTier, provider } = resolveModelsForPipeline(
        DEGRADED_PREFLIGHT_USER_TYPE,
      );

      return Response.json({
        ok: true,
        allowed: true,
        userType: DEGRADED_PREFLIGHT_USER_TYPE,
        remaining: null,
        resetAt: null,
        degraded: true,
        metadata: {
          modelName: semanticModel.modelName,
          narrativeModelName: narrativeModel.modelName,
          modelTier,
          provider,
        },
      });
    }

    console.error('[POST /api/itinerary/plan/preflight] Unexpected error:', error);
    return Response.json({ ok: false, error: 'preflight_failed' }, { status: 503 });
  }
}
