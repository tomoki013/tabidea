/**
 * Compose Pipeline Orchestrator (v3)
 * 7 step パイプラインの統合実行
 * + GenerationRunLogger による観測ログ
 */

import type { UserInput } from '@/types/user-input';
import type { Itinerary, ModelInfo } from '@/types/itinerary';
import type { PartialDayData } from '@/types';
import type { Article } from '@/lib/services/ai/types';
import type { UserType } from '@/lib/limits/config';
import type {
  PipelineStepId,
  ComposedItinerary,
  ComposePipelineMetadata,
  NormalizedRequest,
  SemanticPlan,
} from '@/types/itinerary-pipeline';
import { normalizeRequest } from './steps/normalize-request';
import { runSemanticPlanner } from './steps/semantic-planner';
import { resolvePlaces, isPlaceResolveEnabled } from './steps/place-resolver';
import { scoreAndSelect, candidatesToStops } from './steps/feasibility-scorer';
import { optimizeRoutes } from './steps/route-optimizer';
import { buildTimeline } from './steps/timeline-builder';
import {
  runNarrativeRenderer,
  buildFallbackNarrativeOutput,
  streamNarrativeRendererWithResult,
} from './steps/narrative-renderer';
import { composedToItinerary } from './adapter';
import { PipelineStepError } from './errors';
import { GenerationRunLogger } from './generation-run-logger';
import { getDefaultProvider, resolveModelForPhase } from '@/lib/services/ai/model-resolver';
import { createComposeTimer } from '@/lib/utils/performance-timer';
import { checkAndRecordUsage } from '@/lib/limits/check';

// Re-export for backward compatibility
export { PipelineStepError } from './errors';

const COMPOSE_DEADLINE_MS = 22_000;
const MIN_REMAINING_FOR_PLACE_RESOLVE_MS = 9_000;
const MIN_REMAINING_FOR_HERO_IMAGE_MS = 2_500;
const MIN_REMAINING_FOR_SEMANTIC_RETRY_MS = 14_000;
const MIN_REMAINING_FOR_SEMANTIC_LLM_MS = 5_500;
const MIN_REMAINING_FOR_NARRATIVE_LLM_MS = 6_500;
const MIN_REMAINING_FOR_NARRATIVE_STREAM_MS = 9_000;
const MIN_REMAINING_FOR_SEMANTIC_FAST_MODE_MS = 18_000;
const DEADLINE_RESERVE_MS = 2_000;

function getItineraryProvider(): 'gemini' | 'openai' {
  const provider = process.env.AI_PROVIDER_ITINERARY;
  if (provider === 'gemini' || provider === 'openai') {
    return provider;
  }
  return getDefaultProvider();
}

function toComposeModelTier(userType: UserType): 'flash' | 'pro' {
  return userType === 'pro' || userType === 'premium' || userType === 'admin'
    ? 'pro'
    : 'flash';
}

function shouldUseSemanticFastMode(
  request: NormalizedRequest,
  remainingMs: number
): boolean {
  return (
    remainingMs < MIN_REMAINING_FOR_SEMANTIC_FAST_MODE_MS ||
    request.durationDays >= 4 ||
    request.destinations.length > 1 ||
    request.mustVisitPlaces.length >= 4 ||
    request.compaction.longInputDetected ||
    request.softPreferences.rankedRequests.length >= 5
  );
}

function getSemanticCandidateTarget(
  request: NormalizedRequest,
  fastMode: boolean
): number {
  const perDay = fastMode ? 4 : request.durationDays >= 4 ? 5 : 6;
  const minimum = request.hardConstraints.mustVisitPlaces.length + request.durationDays * 2;
  const cap = fastMode ? 14 : 20;
  return Math.max(minimum, Math.min(request.durationDays * perDay, cap));
}

function isTimeoutLikeError(error: unknown): boolean {
  if (error instanceof PipelineStepError) {
    return /timed out|timeout/i.test(error.message);
  }

  if (error instanceof Error) {
    return /timed out|timeout|deadline/i.test(error.message);
  }

  return false;
}

function buildDeterministicSemanticPlan(request: NormalizedRequest): SemanticPlan {
  const destination = request.destinations[0] ?? (request.region === 'domestic' ? '日本' : '海外');
  const baseThemes = request.themes.length > 0 ? request.themes : ['観光'];

  const dayStructure = Array.from({ length: request.durationDays }, (_, idx) => ({
    day: idx + 1,
    title: `${idx + 1}日目の${destination}散策`,
    mainArea: destination,
    overnightLocation: destination,
    summary: `${destination}を無理なく巡るプラン`,
  }));

  const mustVisits = request.mustVisitPlaces.map((place, index) => ({
    name: place,
    role: 'must_visit' as const,
    priority: 10,
    dayHint: Math.min(index + 1, request.durationDays),
    timeSlotHint: 'flexible' as const,
    stayDurationMinutes: 75,
    searchQuery: place,
    semanticId: crypto.randomUUID(),
    areaHint: destination,
  }));

  const fillerCandidates = dayStructure.flatMap((day) => [
    {
      name: `${destination}の定番スポット ${day.day}`,
      role: 'recommended' as const,
      priority: 7,
      dayHint: day.day,
      timeSlotHint: 'morning' as const,
      stayDurationMinutes: 90,
      searchQuery: `${destination} 観光名所`,
      semanticId: crypto.randomUUID(),
      areaHint: destination,
    },
    {
      name: `${destination}のランチ ${day.day}`,
      role: 'meal' as const,
      priority: 6,
      dayHint: day.day,
      timeSlotHint: 'midday' as const,
      stayDurationMinutes: 60,
      searchQuery: `${destination} ランチ`,
      semanticId: crypto.randomUUID(),
      areaHint: destination,
    },
    {
      name: `${destination}の夜散策 ${day.day}`,
      role: 'recommended' as const,
      priority: 5,
      dayHint: day.day,
      timeSlotHint: 'evening' as const,
      stayDurationMinutes: 90,
      searchQuery: `${destination} 夜景`,
      semanticId: crypto.randomUUID(),
      areaHint: destination,
    },
  ]);

  const candidates = [...mustVisits, ...fillerCandidates];

  return {
    destination,
    description: `${destination}の${request.durationDays}日間プラン`,
    candidates,
    dayStructure,
    themes: baseThemes,
    tripIntentSummary: `${destination}を無理なく楽しむ`,
    orderingPreferences: ['午前に主要スポット', '昼食を挟んでエリア内を回遊'],
    fallbackHints: ['主要エリア優先', '移動時間を短く保つ'],
  };
}

// ============================================
// Types
// ============================================

export interface ComposeOptions {
  isRetry?: boolean;
}

export type ComposeProgressEvent =
  | {
      type: 'progress';
      step: PipelineStepId;
      message: string;
      totalDays?: number;
      destination?: string;
      description?: string;
    }
  | {
      type: 'day_complete';
      step: 'narrative_render';
      day: number;
      dayData: PartialDayData;
      isComplete: boolean;
      totalDays: number;
      destination: string;
      description: string;
    };

export type ProgressCallback = (event: ComposeProgressEvent) => void;

export interface ComposeResult {
  success: boolean;
  itinerary?: Itinerary;
  warnings: string[];
  metadata?: ComposePipelineMetadata;
  /** Which step failed (if applicable) */
  failedStep?: string;
  /** Limit exceeded info */
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
  message?: string;
}

// ============================================
// Public API
// ============================================

/**
 * Compose Pipeline を実行 (v3)
 */
export async function runComposePipeline(
  input: UserInput,
  options?: ComposeOptions,
  onProgress?: ProgressCallback
): Promise<ComposeResult> {
  const timer = createComposeTimer();
  const allWarnings: string[] = [];
  const runId = crypto.randomUUID();
  const logger = new GenerationRunLogger(runId);
  const pipelineStartedAt = Date.now();
  const deadlineAt = pipelineStartedAt + COMPOSE_DEADLINE_MS;
  let timeoutMitigationUsed = false;
  let fallbackUsed = false;

  const remainingTimeMs = () => deadlineAt - Date.now();

  const logStepWindow = (step: string) => {
    console.info(`[compose-pipeline] ${step}`, {
      elapsedMs: Date.now() - pipelineStartedAt,
      remainingMs: remainingTimeMs(),
    });
  };

  const createDeadlineError = (step: PipelineStepId, message: string) =>
    new PipelineStepError(step, message);

  const runWithDeadline = async <T>(
    step: PipelineStepId,
    task: () => Promise<T>,
    reserveMs: number = DEADLINE_RESERVE_MS
  ): Promise<T> => {
    const remaining = remainingTimeMs() - reserveMs;
    if (remaining <= 0) {
      throw createDeadlineError(step, `Timed out before ${step}`);
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        task(),
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(createDeadlineError(step, `${step} timed out before platform deadline`));
          }, remaining);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const emitProgress = (
    step: PipelineStepId,
    message: string,
    data?: Omit<Extract<ComposeProgressEvent, { type: 'progress' }>, 'type' | 'step' | 'message'>
  ) => {
    onProgress?.({
      type: 'progress',
      step,
      message,
      ...data,
    });
  };

  const emitDayComplete = (payload: Omit<Extract<ComposeProgressEvent, { type: 'day_complete' }>, 'type' | 'step'>) => {
    onProgress?.({
      type: 'day_complete',
      step: 'narrative_render',
      ...payload,
    });
  };

  try {
    // ====================================
    // Step 0: Usage check
    // ====================================
    emitProgress('usage_check', '利用状況を確認中...');
    logStepWindow('usage_check:start');
    const usageResult = await timer.measure('usage_check', async () => {
      return runWithDeadline('usage_check', () => checkAndRecordUsage('plan_generation', undefined, {
        skipConsume: options?.isRetry,
      }));
    });

    if (!usageResult.allowed) {
      return {
        success: false,
        warnings: [],
        limitExceeded: true,
        userType: usageResult.userType,
        resetAt: usageResult.resetAt?.toISOString() ?? null,
        remaining: usageResult.remaining,
        message: 'Usage limit exceeded',
      };
    }

    // ====================================
    // Step 1: Normalize Request
    // ====================================
    emitProgress('normalize', '旅の条件を整理中...');
    logStepWindow('normalize:start');
    const normalizedRequest = await timer.measure('normalize', async () => {
      return runWithDeadline('normalize', async () => normalizeRequest(input));
    });

    // ====================================
    // Model Resolution
    // ====================================
    const userType = usageResult.userType as UserType;
    const provider = getItineraryProvider();
    const semanticModel = resolveModelForPhase('outline', userType, provider);
    const narrativeModel = resolveModelForPhase('chunk', userType, provider);
    const modelTier = toComposeModelTier(userType);

    console.info('[compose-pipeline] model_resolution', {
      provider,
      userType,
      semanticModel: semanticModel.modelName,
      narrativeModel: narrativeModel.modelName,
      modelTier,
    });

    // Update timer targets based on model tier
    if (modelTier === 'pro') {
      const { COMPOSE_TARGETS_PRO } = await import('@/lib/utils/performance-timer');
      timer.setTargets(COMPOSE_TARGETS_PRO);
    }

    // Start run logging (fire-and-forget)
    logger.startRun({
      pipelineVersion: 'v3',
      modelName: semanticModel.modelName,
      modelTier,
    }).catch(() => {});

    // ====================================
    // Step 2: Semantic Planner
    // ====================================
    emitProgress('semantic_plan', '候補スポットを選定中...');
    logStepWindow('semantic_plan:start');
    const context: Article[] = []; // RAG context could be added here
    const semanticPlanStart = Date.now();
    const semanticFastMode = shouldUseSemanticFastMode(normalizedRequest, remainingTimeMs());
    const semanticCandidateTarget = getSemanticCandidateTarget(normalizedRequest, semanticFastMode);
    if (semanticFastMode) {
      timeoutMitigationUsed = true;
    }
    const semanticPlan = await timer.measure('semantic_plan', async () => {
      if (remainingTimeMs() < MIN_REMAINING_FOR_SEMANTIC_LLM_MS) {
        timeoutMitigationUsed = true;
        fallbackUsed = true;
        emitProgress('semantic_plan', '時間制限のため軽量プランで継続中...');
        return buildDeterministicSemanticPlan(normalizedRequest);
      }

      try {
        return await runWithDeadline('semantic_plan', () => runSemanticPlanner({
          request: normalizedRequest,
          context,
          modelName: semanticModel.modelName,
          provider,
          temperature: semanticModel.temperature,
          retryOnFailure: !semanticFastMode && remainingTimeMs() >= MIN_REMAINING_FOR_SEMANTIC_RETRY_MS,
          targetCandidateCount: semanticCandidateTarget,
          fastMode: semanticFastMode,
          onProgress: (message) => emitProgress('semantic_plan', message),
        }));
      } catch (semanticError) {
        if (isTimeoutLikeError(semanticError)) {
          timeoutMitigationUsed = true;
          fallbackUsed = true;
          console.warn('[compose-pipeline] semantic planner timed out, using deterministic fallback:', semanticError);
          emitProgress('semantic_plan', '候補選定を簡略化して継続中...');
          return buildDeterministicSemanticPlan(normalizedRequest);
        }
        throw semanticError;
      }
    });

    const candidateCount = semanticPlan.candidates.length;
    logger.logStep({
      stepName: 'semantic_plan',
      status: 'success',
      durationMs: Date.now() - semanticPlanStart,
      metadata: {
        candidateCount,
        fastMode: semanticFastMode,
        targetCandidateCount: semanticCandidateTarget,
      },
    }).catch(() => {});

    // Prefetch hero image in background to save tail latency
    let heroImagePromise: Promise<ComposedItinerary['heroImage'] | undefined> | undefined;
    const remainingAfterSemantic = remainingTimeMs();
    if (remainingAfterSemantic >= MIN_REMAINING_FOR_NARRATIVE_STREAM_MS) {
      heroImagePromise = (async () => {
        try {
          const { getUnsplashImage } = await import('@/lib/unsplash');
          const image = await getUnsplashImage(semanticPlan.destination);
          if (!image) {
            return undefined;
          }

          return {
            url: image.url,
            photographer: image.photographer,
            photographerUrl: image.photographerUrl,
          };
        } catch {
          return undefined;
        }
      })();
    }

    // ====================================
    // Step 3: Place Resolver (conditional)
    // ====================================
    const placeResolveEnabled = isPlaceResolveEnabled();
    let stops;
    let resolvedCount = 0;
    let filteredOutCount = 0;
    let droppedCount = 0;

    if (placeResolveEnabled) {
      const remainingBeforeResolve = remainingTimeMs();
      if (remainingBeforeResolve < MIN_REMAINING_FOR_PLACE_RESOLVE_MS) {
        timeoutMitigationUsed = true;
        fallbackUsed = true;
        emitProgress('place_resolve', 'スポット照合を時間制限のためスキップ中...');
        emitProgress('feasibility_score', '実現性チェックを時間制限のため簡略化中...');
        console.info('[compose-pipeline] skipping place resolve due to deadline', {
          remainingMs: remainingBeforeResolve,
          candidateCount,
        });
        stops = candidatesToStops(semanticPlan.candidates);
        resolvedCount = 0;

        logger.logStep({
          stepName: 'place_resolve',
          status: 'skipped',
          durationMs: 0,
          metadata: { reason: 'deadline', remainingMs: remainingBeforeResolve },
        }).catch(() => {});
        logger.logStep({
          stepName: 'feasibility_score',
          status: 'skipped',
          durationMs: 0,
          metadata: { reason: 'deadline' },
        }).catch(() => {});
      } else {
        emitProgress('place_resolve', '実在スポットに照合中...');
        logStepWindow('place_resolve:start');
        const resolveStart = Date.now();
        const maxCandidatesToResolve =
          remainingBeforeResolve < 12_000 ? Math.min(candidateCount, 8) : candidateCount;
        if (maxCandidatesToResolve < candidateCount) {
          timeoutMitigationUsed = true;
          fallbackUsed = true;
        }
        const resolvedGroups = await timer.measure('place_resolve', async () => {
          return runWithDeadline('place_resolve', () => resolvePlaces(
            semanticPlan.candidates,
            semanticPlan.destination,
            {
              delayMs: remainingBeforeResolve < 12_000 ? 0 : undefined,
              maxCandidates: maxCandidatesToResolve,
            }
          ));
        });

        resolvedCount = resolvedGroups.filter((g) => g.success).length;
        const failedResolves = resolvedGroups.filter((g) => !g.success).length;

        logger.logStep({
          stepName: 'place_resolve',
          status: failedResolves > 0 ? 'fallback' : 'success',
          durationMs: Date.now() - resolveStart,
          metadata: { resolvedCount, failedResolves, maxCandidatesToResolve },
        }).catch(() => {});

        if (failedResolves > 0) {
          fallbackUsed = true;
        }

        // ====================================
        // Step 4: Feasibility Scorer
        // ====================================
        emitProgress('feasibility_score', '営業時間・実現性を確認中...');
        logStepWindow('feasibility_score:start');
        const scoreStart = Date.now();
        const { selected, filtered } = await timer.measure(
          'feasibility_score',
          async () => {
            return runWithDeadline('feasibility_score', async () => scoreAndSelect(resolvedGroups, normalizedRequest));
          }
        );

        stops = selected;
        filteredOutCount = filtered.length;
        droppedCount = candidateCount - selected.length;

        logger.logStep({
          stepName: 'feasibility_score',
          status: 'success',
          durationMs: Date.now() - scoreStart,
          metadata: { selectedCount: selected.length, filteredCount: filtered.length },
        }).catch(() => {});

        if (filtered.length > 0) {
          allWarnings.push(
            `${filtered.length}件の候補がスコア不足でフィルタされました`
          );
        }

        // Collect warnings from selected stops
        for (const stop of stops) {
          allWarnings.push(...stop.warnings);
        }
      }
    } else {
      emitProgress('place_resolve', 'スポット照合をスキップ中...');
      emitProgress('feasibility_score', '実現性チェックをスキップ中...');
      stops = candidatesToStops(semanticPlan.candidates);
      resolvedCount = 0;

      logger.logStep({
        stepName: 'place_resolve',
        status: 'skipped',
        durationMs: 0,
      }).catch(() => {});
      logger.logStep({
        stepName: 'feasibility_score',
        status: 'skipped',
        durationMs: 0,
      }).catch(() => {});
    }

    const selectedCount = stops.length;

    if (stops.length === 0) {
      await logger.endRun({
        success: false,
        totalDurationMs: Date.now(),
        candidateCount,
        resolvedCount,
        filteredCount: filteredOutCount,
        errorMessage: 'No viable spots found after filtering',
        failedStep: 'feasibility_score',
      });

      return {
        success: false,
        warnings: allWarnings,
        message: 'No viable spots found after filtering',
      };
    }

    // ====================================
    // Step 5: Route Optimizer
    // ====================================
    emitProgress('route_optimize', '回りやすい順に調整中...');
    logStepWindow('route_optimize:start');
    const routeStart = Date.now();
    const optimizedDays = await timer.measure('route_optimize', async () => {
      return runWithDeadline('route_optimize', async () => optimizeRoutes(
        stops,
        semanticPlan.dayStructure,
        normalizedRequest,
        semanticPlan
      ));
    });

    logger.logStep({
      stepName: 'route_optimize',
      status: 'success',
      durationMs: Date.now() - routeStart,
    }).catch(() => {});

    // ====================================
    // Step 6: Timeline Builder
    // ====================================
    emitProgress('timeline_build', 'タイムラインを作成中...');
    logStepWindow('timeline_build:start');
    const timelineStart = Date.now();
    const timelineDays = await timer.measure('timeline_build', async () => {
      return runWithDeadline('timeline_build', async () => buildTimeline(optimizedDays, normalizedRequest));
    });

    logger.logStep({
      stepName: 'timeline_build',
      status: 'success',
      durationMs: Date.now() - timelineStart,
    }).catch(() => {});

    // ====================================
    // Step 7: Narrative Renderer (streaming)
    // ====================================
    emitProgress('narrative_render', '旅程を仕上げ中...', {
      totalDays: timelineDays.length,
      destination: semanticPlan.destination,
      description: semanticPlan.description,
    });
    logStepWindow('narrative_render:start');
    const narrativeStart = Date.now();

    const narrativeInput = {
      timelineDays,
      request: normalizedRequest,
      context,
      modelName: narrativeModel.modelName,
      provider,
      temperature: narrativeModel.temperature,
    };

    const narrative = await timer.measure('narrative_render', async () => {
      if (remainingTimeMs() < MIN_REMAINING_FOR_NARRATIVE_LLM_MS) {
        timeoutMitigationUsed = true;
        fallbackUsed = true;
        return buildFallbackNarrativeOutput(timelineDays, normalizedRequest);
      }

      try {
        if (remainingTimeMs() < MIN_REMAINING_FOR_NARRATIVE_STREAM_MS) {
          timeoutMitigationUsed = true;
          fallbackUsed = true;
          return buildFallbackNarrativeOutput(timelineDays, normalizedRequest);
        }

        const streamResult = await runWithDeadline(
          'narrative_render',
          () => streamNarrativeRendererWithResult(narrativeInput)
        );

        for await (const event of streamResult.dayStream) {
          emitDayComplete({
            day: event.day,
            dayData: event.dayData,
            isComplete: event.isComplete,
            totalDays: timelineDays.length,
            destination: semanticPlan.destination,
            description: semanticPlan.description,
          });
        }

        return await runWithDeadline('narrative_render', () => streamResult.finalOutput, 1_000);
      } catch (streamError) {
        console.warn('[compose-pipeline] streamNarrativeRenderer failed, falling back to generateObject:', streamError);
        fallbackUsed = true;
        if (remainingTimeMs() < MIN_REMAINING_FOR_NARRATIVE_LLM_MS) {
          timeoutMitigationUsed = true;
          return buildFallbackNarrativeOutput(timelineDays, normalizedRequest);
        }

        try {
          return await runWithDeadline('narrative_render', () => runNarrativeRenderer(narrativeInput));
        } catch (narrativeError) {
          timeoutMitigationUsed = timeoutMitigationUsed || isTimeoutLikeError(narrativeError);
          fallbackUsed = true;
          console.warn('[compose-pipeline] narrative renderer fallback failed, using deterministic narrative:', narrativeError);
          return buildFallbackNarrativeOutput(timelineDays, normalizedRequest);
        }
      }
    });

    logger.logStep({
      stepName: 'narrative_render',
      status: 'success',
      durationMs: Date.now() - narrativeStart,
    }).catch(() => {});

    // ====================================
    // Hero Image
    // ====================================
    emitProgress('hero_image', 'ぴったりの写真を探し中...');
    let heroImage: ComposedItinerary['heroImage'] | undefined;
    const remainingBeforeHero = remainingTimeMs();
    if (remainingBeforeHero < MIN_REMAINING_FOR_HERO_IMAGE_MS) {
      timeoutMitigationUsed = true;
      console.info('[compose-pipeline] skipping hero image due to deadline', {
        remainingMs: remainingBeforeHero,
      });
    } else {
      logStepWindow('hero_image:start');
      await timer.measure('hero_image', async () => {
        try {
          if (heroImagePromise) {
            heroImage = await runWithDeadline('hero_image', () => heroImagePromise, 500);
            return;
          }

          const { getUnsplashImage } = await import('@/lib/unsplash');
          const image = await runWithDeadline('hero_image', () => getUnsplashImage(semanticPlan.destination), 500);
          if (image) {
            heroImage = {
              url: image.url,
              photographer: image.photographer,
              photographerUrl: image.photographerUrl,
            };
          }
        } catch (err) {
          timeoutMitigationUsed = true;
          console.warn('[compose] Hero image fetch failed:', err);
        }
      });
    }

    // ====================================
    // Assemble composed itinerary
    // ====================================
    timer.log();
    const report = timer.getReport();

    const stepTimings: Record<string, number> = {};
    for (const step of report.steps) {
      stepTimings[step.name] = step.duration;
    }

    const metadata: ComposePipelineMetadata = {
      pipelineVersion: 'v3',
      candidateCount,
      resolvedCount,
      filteredCount: selectedCount,
      placeResolveEnabled,
      stepTimings,
      modelName: semanticModel.modelName,
      modelTier,
      warningCount: allWarnings.length,
      droppedCandidateCount: droppedCount,
      fallbackUsed,
      timeoutMitigationUsed,
      compactionApplied: normalizedRequest.compaction.applied,
      hardConstraintCount: normalizedRequest.compaction.hardConstraintCount,
      softPreferenceCount: normalizedRequest.compaction.softPreferenceCount,
      suppressedSoftPreferenceCount: normalizedRequest.compaction.suppressedSoftPreferenceCount,
    };

    const composed: ComposedItinerary = {
      destination: semanticPlan.destination,
      description: narrative.description,
      days: narrative.days,
      heroImage,
      warnings: allWarnings,
      metadata,
    };

    const modelInfo: ModelInfo = {
      modelName: semanticModel.modelName,
      tier: modelTier,
    };

    const itinerary = composedToItinerary(composed, modelInfo);

    // End run logging (fire-and-forget)
    logger.endRun({
      success: true,
      totalDurationMs: report.totalDuration,
      candidateCount,
      resolvedCount,
      filteredCount: selectedCount,
      droppedCount,
      warningCount: allWarnings.length,
      fallbackUsed,
      inputSnapshot: normalizedRequest,
      semanticPlanSnapshot: {
        destination: semanticPlan.destination,
        candidateCount: semanticPlan.candidates.length,
        dayCount: semanticPlan.dayStructure.length,
        tripIntentSummary: semanticPlan.tripIntentSummary,
      },
      selectedStopsSnapshot: stops.map((s) => ({
        name: s.candidate.name,
        semanticId: s.semanticId,
        feasibilityScore: s.feasibilityScore,
      })),
      finalItinerarySnapshot: itinerary,
    }).catch(() => {});

    return {
      success: true,
      itinerary,
      warnings: allWarnings,
      metadata,
    };
  } catch (error) {
    console.error('[compose-pipeline] Pipeline failed:', error);
    timer.log();

    const failedStep = error instanceof PipelineStepError ? error.step : undefined;

    // Log failure (fire-and-forget)
    logger.endRun({
      success: false,
      totalDurationMs: Date.now() - pipelineStartedAt,
      errorMessage: error instanceof Error ? error.message : 'Pipeline execution failed',
      failedStep,
      fallbackUsed: false,
    }).catch(() => {});

    return {
      success: false,
      warnings: allWarnings,
      failedStep,
      message: error instanceof Error ? error.message : 'Pipeline execution failed',
    };
  }
}
