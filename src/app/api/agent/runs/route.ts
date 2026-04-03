import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import type { UserInput } from '@/types/user-input';
import type { PipelineContext, PlanGenerationSession } from '@/types/plan-generation';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createRun, loadRun, updateRun } from '@/lib/services/plan-generation/run-store';
import {
  determineResumeState,
} from '@/lib/services/plan-generation/state-machine';
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

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

function computeInputHash(input: UserInput): string {
  return createHash('sha256').update(stableSerialize(input)).digest('hex');
}

async function findReusableRetryRun(
  userId: string,
  inputHash: string,
  executionMode: NonNullable<CreateAgentRunRequestBody['executionMode']>,
  mode: NonNullable<CreateAgentRunRequestBody['mode']>,
): Promise<PlanGenerationSession | null> {
  const { data, error } = await getClient()
    .from('runs')
    .select('id, state, pipeline_context')
    .eq('user_id', userId)
    .eq('input_hash', inputHash)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !data) {
    console.warn('[agent-runs] reusable retry lookup degraded:', error?.message);
    return null;
  }

  const candidate = data.find((row) => {
    const state = row.state as string | undefined;
    const pipelineContext = (row.pipeline_context as Record<string, unknown> | null) ?? {};
    return state !== 'completed'
      && state !== 'failed_terminal'
      && state !== 'cancelled'
      && (pipelineContext.executionMode as string | undefined) === executionMode
      && ((pipelineContext.mode as string | undefined) ?? 'create') === mode;
  });

  if (!candidate?.id) {
    return null;
  }

  return loadRun(candidate.id as string).catch(() => null);
}

function canUseSameRunContinuation(run: PlanGenerationSession | null): boolean {
  if (!run || run.state !== 'failed_retryable') {
    return false;
  }

  return determineResumeState(run) !== 'created';
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
    const executionMode = body.executionMode ?? 'draft_with_selective_verify';
    const mode = body.mode ?? 'create';
    const runtimeProfile = body.constraints?.runtimeProfile ?? 'netlify_free_30s';
    const inputHash = computeInputHash(body.input);

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
          executionMode: (existingPipelineContext.executionMode as string | undefined) ?? executionMode,
          runtimeProfile: (existingPipelineContext.runtimeProfile as string | undefined) ?? runtimeProfile,
          mode,
          threadId: (existingPipelineContext.threadId as string | null | undefined) ?? body.threadId ?? null,
          idempotencyHit: true,
        });

        return NextResponse.json({
          runId: existing.id,
          threadId: existingPipelineContext.threadId ?? body.threadId ?? null,
          tripId: existingPipelineContext.tripId ?? body.tripId ?? null,
          status: 'queued',
          streamUrl: `/api/agent/runs/${existing.id}/stream`,
          processUrl: `/api/agent/runs/${existing.id}/process`,
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
    const plannerModelName = resolvePlannerModelName(
      runtimeProfile,
      plannerProvider,
      semanticModel.modelName,
    );
    const reusableRun = body.options?.isRetry && userId
      ? await findReusableRetryRun(userId, inputHash, executionMode, mode)
      : null;
    const useSameRunContinuation = canUseSameRunContinuation(reusableRun);
    const resumedFromRunId = useSameRunContinuation ? reusableRun?.id ?? null : null;
    const bootstrapState = reusableRun && useSameRunContinuation
      ? determineResumeState(reusableRun)
      : 'created';

    const basePipelineContext: PipelineContext = {
      homeBaseCity,
      executionMode,
      runtimeProfile,
      costProfile: body.constraints?.costProfile ?? 'safe',
      tripId: body.tripId,
      threadId: body.threadId,
      mode,
      replanScope: body.replanScope ?? null,
      memoryEnabled: memory.enabled,
      memorySnapshot: memory.enabled ? memory as unknown as Record<string, unknown> : null,
      idempotencyKey: body.idempotencyKey,
      usageStatus,
      usageSource,
      resumedFromRunId,
      resumeStrategy: useSameRunContinuation ? 'same_run_resume' : null,
      reusedArtifactKinds: null,
      artifactReuseRejectedKinds: null,
    };

    if (useSameRunContinuation && reusableRun) {
      await updateRun(reusableRun.id, {
        pipelineContext: {
          ...(reusableRun.pipelineContext ?? {}),
          ...basePipelineContext,
        },
      });

      const { error } = await getClient()
        .from('runs')
        .update({
          state: bootstrapState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reusableRun.id);

      if (error) {
        throw new Error(`Failed to resume existing run ${reusableRun.id}: ${error.message}`);
      }

      logRunCheckpoint({
        checkpoint: 'run_created',
        runId: reusableRun.id,
        tripId: body.tripId ?? null,
        state: bootstrapState,
        executionMode,
        runtimeProfile,
        mode,
        threadId: body.threadId ?? null,
        idempotencyHit: false,
        usageStatus,
        usageSource,
        resumeSourceRunId: reusableRun.id,
        resumeStrategy: 'same_run_resume',
      });

      return NextResponse.json({
        runId: reusableRun.id,
        threadId: body.threadId ?? null,
        tripId: body.tripId ?? null,
        status: 'queued',
        streamUrl: `/api/agent/runs/${reusableRun.id}/stream`,
        processUrl: `/api/agent/runs/${reusableRun.id}/process`,
      });
    }

    const session = await createRun(userId);
    const initialState = session.state;

    await updateRun(session.id, {
      inputSnapshot: body.input,
      inputHash,
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
      pipelineContext: basePipelineContext,
    });

    logRunCheckpoint({
      checkpoint: 'run_created',
      runId: session.id,
      tripId: body.tripId ?? null,
      state: initialState,
      executionMode,
      runtimeProfile,
      mode,
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
      processUrl: `/api/agent/runs/${session.id}/process`,
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
