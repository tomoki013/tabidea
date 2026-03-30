import { NextResponse } from 'next/server';
import type { UserInput } from '@/types/user-input';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createRun, updateRun } from '@/lib/services/plan-generation/run-store';
import { getUser } from '@/lib/supabase/server';
import { getUserSettings } from '@/app/actions/user-settings';
import { memoryService } from '@/lib/memory/service';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';
import { checkAndRecordUsage } from '@/lib/limits/check';
import type { UserType } from '@/lib/limits/config';
import { resolveModelsForPipeline } from '@/lib/services/itinerary/pipeline-helpers';
import { withPromiseTimeout } from '@/lib/utils/promise-timeout';
import {
  getDefaultHomeBaseCityForRegion,
  getDefaultRegionForLanguage,
  isLanguageCode,
  type LanguageCode,
  DEFAULT_LANGUAGE,
} from '@/lib/i18n/locales';

interface CreateAgentRunRequestBody {
  threadId?: string;
  tripId?: string;
  mode?: 'create' | 'replan' | 'patch_assist';
  executionMode?: 'draft_only' | 'draft_with_selective_verify' | 'reverify' | 'replan_partial';
  constraints?: {
    runtimeProfile?: string;
    costProfile?: string;
  };
  input: UserInput;
  replanScope?: Record<string, unknown> | null;
  idempotencyKey?: string;
  options?: {
    isRetry?: boolean;
  };
}

export const maxDuration = 10;
export const runtime = 'nodejs';

const RUN_AUTH_TIMEOUT_MS = 1_000;
const RUN_USAGE_TIMEOUT_MS = 1_500;
const RUN_SETTINGS_TIMEOUT_MS = 1_000;
const RUN_MEMORY_TIMEOUT_MS = 1_000;

function getClient() {
  return createServiceRoleClient();
}

function resolvePlannerProvider(
  inheritedProvider: 'gemini' | 'openai',
): 'gemini' | 'openai' {
  const envProvider = process.env.AI_MODEL_PLANNER_PROVIDER;
  if (envProvider === 'gemini' || envProvider === 'openai') {
    return envProvider;
  }
  return inheritedProvider;
}

function resolvePlannerModelName(
  runtimeProfile: string | undefined,
  plannerProvider: 'gemini' | 'openai',
  inheritedModelName: string,
): string {
  if (!process.env.AI_MODEL_PLANNER_NAME?.trim()) {
    if (runtimeProfile === 'netlify_free_30s' && plannerProvider === 'gemini') {
      return 'gemini-3-flash-preview';
    }
  }
  return process.env.AI_MODEL_PLANNER_NAME?.trim() || inheritedModelName;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreateAgentRunRequestBody;

    if (!body.input) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const user = await withPromiseTimeout(
      () => getUser().catch(() => null),
      RUN_AUTH_TIMEOUT_MS,
      'run auth resolve',
    ).catch(() => null);
    const userId = user?.id;

    if (userId && body.idempotencyKey) {
      const { data: existing } = await getClient()
        .from('runs')
        .select('id, state, pipeline_context')
        .eq('user_id', userId)
        .contains('pipeline_context', { idempotencyKey: body.idempotencyKey })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const existingPipelineContext = (existing.pipeline_context as Record<string, unknown> | null) ?? {};
        logRunCheckpoint({
          checkpoint: 'run_created',
          runId: existing.id as string,
          tripId: (existingPipelineContext.tripId as string | null | undefined) ?? body.tripId ?? null,
          state: existing.state as string,
          executionMode: (existingPipelineContext.executionMode as string | undefined) ?? body.executionMode ?? 'draft_with_selective_verify',
          runtimeProfile: (existingPipelineContext.runtimeProfile as string | undefined) ?? body.constraints?.runtimeProfile ?? 'netlify_free_30s',
          mode: body.mode ?? 'create',
          threadId: (existingPipelineContext.threadId as string | null | undefined) ?? body.threadId ?? null,
          idempotencyHit: true,
        });

        return NextResponse.json({
          runId: existing.id,
          threadId: existingPipelineContext.threadId ?? body.threadId ?? null,
          tripId: existingPipelineContext.tripId ?? body.tripId ?? null,
          status: 'queued',
          streamUrl: `/api/agent/runs/${existing.id}/stream`,
        });
      }
    }

    let usageStatus: 'confirmed' | 'degraded' = 'confirmed';
    let usageSource: string = 'unknown';

    const usageResult = await withPromiseTimeout(
      () => checkAndRecordUsage('plan_generation', undefined, {
        skipConsume: body.options?.isRetry,
        resolvedUser: user ? { id: user.id, email: user.email ?? null } : null,
      }),
      RUN_USAGE_TIMEOUT_MS,
      'run usage check',
    ).catch((error) => {
      usageStatus = 'degraded';
      usageSource = userId ? 'unknown' : 'anonymous';
      console.warn('[agent-runs] usage check degraded, allowing run creation:', error);
      return null;
    });

    if (usageResult && !usageResult.allowed) {
      return NextResponse.json({
        error: usageResult.error ?? 'limit_exceeded',
        limitExceeded: true,
        userType: usageResult.userType,
        remaining: usageResult.remaining,
        resetAt: usageResult.resetAt?.toISOString() ?? null,
      }, { status: 429 });
    }

    if (usageResult) {
      usageStatus = 'confirmed';
      usageSource = usageResult.source ?? usageResult.userType ?? 'unknown';
    }

    const { settings } = userId
      ? await withPromiseTimeout(
        () => getUserSettings().catch(() => ({ settings: null })),
        RUN_SETTINGS_TIMEOUT_MS,
        'run user settings load',
      ).catch(() => ({ settings: null }))
      : { settings: null };
    const preferredLanguage: LanguageCode =
      settings?.preferredLanguage && isLanguageCode(settings.preferredLanguage)
        ? settings.preferredLanguage
        : DEFAULT_LANGUAGE;
    const preferredRegion = settings?.preferredRegion ?? getDefaultRegionForLanguage(preferredLanguage);
    const homeBaseCity = settings?.homeBaseCity?.trim() || getDefaultHomeBaseCityForRegion(preferredRegion);

    const memory = userId
      ? await withPromiseTimeout(
        () => memoryService.getMemoryProfile(userId).catch(() => ({
          enabled: false,
          version: 1,
          schemaVersion: 1,
          capabilities: {
            crossTripPersonalization: true,
            preferenceInference: false,
          },
          profile: null,
          source: 'explicit' as const,
        })),
        RUN_MEMORY_TIMEOUT_MS,
        'run memory load',
      ).catch(() => ({
        enabled: false,
        version: 1,
        schemaVersion: 1,
        capabilities: {
          crossTripPersonalization: true,
          preferenceInference: false,
        },
        profile: null,
        source: 'explicit' as const,
      }))
      : {
        enabled: false,
        version: 1,
        schemaVersion: 1,
        capabilities: {
          crossTripPersonalization: true,
          preferenceInference: false,
        },
        profile: null,
        source: 'explicit' as const,
      };

    const resolvedUserType = (usageResult?.userType ?? 'free') as UserType;
    const { semanticModel, narrativeModel, modelTier, provider } = resolveModelsForPipeline(
      resolvedUserType,
    );
    const plannerProvider = resolvePlannerProvider(provider);
    const runtimeProfile = body.constraints?.runtimeProfile ?? 'netlify_free_30s';
    const plannerModelName = resolvePlannerModelName(
      runtimeProfile,
      plannerProvider,
      semanticModel.modelName,
    );
    const session = await createRun(userId);

    await updateRun(session.id, {
      inputSnapshot: body.input,
      generationProfile: {
        modelName: semanticModel.modelName,
        narrativeModelName: narrativeModel.modelName,
        plannerModelName,
        modelTier,
        provider,
        plannerProvider,
        temperature: semanticModel.temperature,
        pipelineVersion: 'v4',
      },
      pipelineContext: {
        homeBaseCity,
        executionMode: body.executionMode ?? 'draft_with_selective_verify',
        runtimeProfile,
        costProfile: body.constraints?.costProfile ?? 'safe',
        tripId: body.tripId,
        threadId: body.threadId,
        mode: body.mode ?? 'create',
        replanScope: body.replanScope ?? null,
        memoryEnabled: memory.enabled,
        memorySnapshot: memory.enabled ? memory as unknown as Record<string, unknown> : null,
        idempotencyKey: body.idempotencyKey,
        usageStatus,
        usageSource,
      },
    });

    logRunCheckpoint({
      checkpoint: 'run_created',
      runId: session.id,
      tripId: body.tripId ?? null,
      state: session.state,
      executionMode: body.executionMode ?? 'draft_with_selective_verify',
      runtimeProfile,
      mode: body.mode ?? 'create',
      threadId: body.threadId ?? null,
      idempotencyHit: false,
      usageStatus,
      usageSource,
    });

    return NextResponse.json({
      runId: session.id,
      threadId: body.threadId ?? null,
      tripId: body.tripId ?? null,
      status: 'queued',
      streamUrl: `/api/agent/runs/${session.id}/stream`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 },
    );
  }
}
