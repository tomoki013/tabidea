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
  OptimizedDay,
  TimelineDay,
  DayStructure,
  SelectedStop,
  SemanticCandidate,
} from '@/types/itinerary-pipeline';
import { normalizeRequest } from './steps/normalize-request';
import {
  runSemanticDayPlanner,
  runSemanticPlanner,
  runSemanticSeedPlanner,
  type SemanticSeedPlan,
} from './steps/semantic-planner';
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
import { normalizePlaceKey } from './destination-highlights';

// Re-export for backward compatibility
export { PipelineStepError } from './errors';

// ---- Legacy single-function pipeline constants (kept for runComposePipeline) ----
const COMPOSE_DEADLINE_MS = 26_000;
const MIN_REMAINING_FOR_PLACE_RESOLVE_MS = 9_000;
const MIN_REMAINING_FOR_HERO_IMAGE_MS = 2_500;
const MIN_REMAINING_FOR_SEMANTIC_RETRY_MS = 18_000;
const MIN_REMAINING_FOR_SEMANTIC_LLM_MS = 8_000;
const MIN_REMAINING_FOR_NARRATIVE_LLM_MS = 6_500;
const MIN_REMAINING_FOR_NARRATIVE_STREAM_MS = 9_000;
const MIN_REMAINING_FOR_SEMANTIC_FAST_MODE_MS = 22_000;
const MIN_REMAINING_FOR_ROUTE_OPTIMIZE_MS = 1_800;
const MIN_REMAINING_FOR_TIMELINE_BUILD_MS = 1_200;
const MIN_REMAINING_FOR_POST_SEMANTIC_STEPS_MS = 5_000;
const SEMANTIC_STEP_RESERVE_MS = 6_000;
const DEADLINE_RESERVE_MS = 2_000;

// ---- Split pipeline constants ----
// Structure phase: steps 0-6 (no narrative), must complete in <9s (Netlify free plan safe)
const STRUCTURE_DEADLINE_MS = 9_000;
const STRUCTURE_MIN_SEMANTIC_LLM_MS = 5_500;   // need at least 5.5s for AI
const STRUCTURE_SEMANTIC_RESERVE_MS = 500;       // reserve 500ms after semantic step
const STRUCTURE_PLACE_RESOLVE_MS = 2_500;        // skip place resolve if <2.5s remaining
const STRUCTURE_ROUTE_OPTIMIZE_MS = 1_000;
const STRUCTURE_TIMELINE_BUILD_MS = 600;
const STRUCTURE_DEADLINE_RESERVE_MS = 300;
const SEMANTIC_SPOT_BATCH_RESERVE_MS = 400;

// Narrate phase: step 7 only (narrative render), must complete in <9s
const NARRATE_DEADLINE_MS = 8_500;
const NARRATE_MIN_LLM_MS = 5_000;               // need at least 5s for any LLM call
const NARRATE_DEADLINE_RESERVE_MS = 500;

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

function buildFallbackOptimizedDays(
  stops: SelectedStop[],
  dayStructures: DayStructure[]
): OptimizedDay[] {
  const grouped = new Map<number, SelectedStop[]>();

  for (const structure of dayStructures) {
    grouped.set(structure.day, []);
  }

  for (const stop of stops) {
    const day = stop.candidate.dayHint;
    const fallbackDay = dayStructures[0]?.day ?? 1;
    const targetDay = grouped.has(day) ? day : fallbackDay;
    const target = grouped.get(targetDay) ?? [];
    target.push(stop);
    grouped.set(targetDay, target);
  }

  return dayStructures.map((structure) => {
    const dayStops = (grouped.get(structure.day) ?? []).sort(
      (a, b) => b.candidate.priority - a.candidate.priority
    );

    return {
      day: structure.day,
      title: structure.title || `${structure.day}日目`,
      overnightLocation: structure.overnightLocation || '',
      nodes: dayStops.map((stop, index) => ({
        stop,
        orderInDay: index,
        nodeId: stop.semanticId || crypto.randomUUID(),
      })),
      legs: [],
    };
  });
}

function buildFallbackTimelineDays(optimizedDays: OptimizedDay[]): TimelineDay[] {
  return optimizedDays.map((day) => {
    let currentMinutes = 9 * 60;

    const nodes = day.nodes.map((node) => {
      const stayMinutes = node.stop.candidate.stayDurationMinutes;
      const arrivalMinutes = currentMinutes;
      const departureMinutes = arrivalMinutes + stayMinutes;
      currentMinutes = departureMinutes + 20;

      return {
        stop: node.stop,
        arrivalTime: `${String(Math.floor(arrivalMinutes / 60)).padStart(2, '0')}:${String(arrivalMinutes % 60).padStart(2, '0')}`,
        departureTime: `${String(Math.floor(departureMinutes / 60)).padStart(2, '0')}:${String(departureMinutes % 60).padStart(2, '0')}`,
        stayMinutes,
        warnings: [...node.stop.warnings],
        nodeId: node.nodeId,
        semanticId: node.stop.semanticId,
      };
    });

    return {
      day: day.day,
      title: day.title,
      nodes,
      legs: day.legs,
      overnightLocation: day.overnightLocation,
      startTime: '09:00',
    };
  });
}

export function getScheduledMustVisitPlacesForDay(input: {
  mustVisitPlaces: string[];
  day: number;
  totalDays: number;
  accumulatedCandidates?: SemanticCandidate[];
  generatedCandidates?: SemanticCandidate[];
}): string[] {
  const existingKeys = new Set(
    [...(input.accumulatedCandidates ?? []), ...(input.generatedCandidates ?? [])]
      .map((candidate) => normalizePlaceKey(candidate.searchQuery || candidate.name))
      .filter(Boolean)
  );

  return input.mustVisitPlaces.filter((place, index) => {
    const assignedDay = Math.min(
      Math.floor((index * Math.max(input.totalDays, 1)) / Math.max(input.mustVisitPlaces.length, 1)) + 1,
      Math.max(input.totalDays, 1)
    );

    return assignedDay === input.day && !existingKeys.has(normalizePlaceKey(place));
  });
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
    const totalRemaining = remainingTimeMs();
    if (totalRemaining <= 0) {
      throw createDeadlineError(step, `Timed out before ${step}`);
    }

    const remaining = Math.max(totalRemaining - reserveMs, 50);

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
        throw new PipelineStepError(
          'semantic_plan',
          'AIスポット生成に十分な時間がありません。もう一度お試しください。'
        );
      }

      const semanticReserve = remainingTimeMs() > MIN_REMAINING_FOR_POST_SEMANTIC_STEPS_MS
        ? Math.max(DEADLINE_RESERVE_MS, SEMANTIC_STEP_RESERVE_MS)
        : DEADLINE_RESERVE_MS;

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
      }), semanticReserve);
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
        // Skip place resolve but still use AI-generated candidates (they have specific names)
        timeoutMitigationUsed = true;
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
      if (remainingTimeMs() < MIN_REMAINING_FOR_ROUTE_OPTIMIZE_MS) {
        timeoutMitigationUsed = true;
        fallbackUsed = true;
        emitProgress('route_optimize', '時間制限のため回遊順を簡略化中...');
        return buildFallbackOptimizedDays(stops, semanticPlan.dayStructure);
      }

      try {
        return await runWithDeadline('route_optimize', async () => optimizeRoutes(
          stops,
          semanticPlan.dayStructure,
          normalizedRequest,
          semanticPlan
        ));
      } catch (routeError) {
        if (isTimeoutLikeError(routeError)) {
          timeoutMitigationUsed = true;
          fallbackUsed = true;
          console.warn('[compose-pipeline] route optimizer timed out, using deterministic fallback:', routeError);
          emitProgress('route_optimize', '時間制限のため回遊順を簡略化中...');
          return buildFallbackOptimizedDays(stops, semanticPlan.dayStructure);
        }

        throw routeError;
      }
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
      if (remainingTimeMs() < MIN_REMAINING_FOR_TIMELINE_BUILD_MS) {
        timeoutMitigationUsed = true;
        fallbackUsed = true;
        emitProgress('timeline_build', '時間制限のためタイムラインを簡略化中...');
        return buildFallbackTimelineDays(optimizedDays);
      }

      try {
        return await runWithDeadline('timeline_build', async () => buildTimeline(optimizedDays, normalizedRequest));
      } catch (timelineError) {
        if (isTimeoutLikeError(timelineError)) {
          timeoutMitigationUsed = true;
          fallbackUsed = true;
          console.warn('[compose-pipeline] timeline builder timed out, using deterministic fallback:', timelineError);
          emitProgress('timeline_build', '時間制限のためタイムラインを簡略化中...');
          return buildFallbackTimelineDays(optimizedDays);
        }

        throw timelineError;
      }
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
        // Not enough time for any LLM call — use deterministic narrative.
        // Spot names are already validated by semantic planner, so this is safe.
        timeoutMitigationUsed = true;
        fallbackUsed = true;
        return buildFallbackNarrativeOutput(timelineDays, normalizedRequest);
      }

      try {
        if (remainingTimeMs() < MIN_REMAINING_FOR_NARRATIVE_STREAM_MS) {
          timeoutMitigationUsed = true;
          return await runWithDeadline('narrative_render', () => runNarrativeRenderer(narrativeInput));
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
          // No time for another LLM call — deterministic narrative
          timeoutMitigationUsed = true;
          return buildFallbackNarrativeOutput(timelineDays, normalizedRequest);
        }

        try {
          return await runWithDeadline('narrative_render', () => runNarrativeRenderer(narrativeInput));
        } catch (narrativeError) {
          // Final fallback — deterministic narrative with already-validated spot names
          timeoutMitigationUsed = timeoutMitigationUsed || isTimeoutLikeError(narrativeError);
          console.warn('[compose-pipeline] narrative renderer failed, using deterministic narrative:', narrativeError);
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

// ============================================
// Split Pipeline: Phase 1 — Structure
// (usage_check → normalize → semantic_plan →
//  place_resolve → feasibility → route → timeline)
// Target: < 9 seconds, no narrative rendering
// ============================================

export interface StructurePipelineResult {
  success: boolean;
  // success fields
  timeline?: TimelineDay[];
  normalizedRequest?: NormalizedRequest;
  destination?: string;
  description?: string;
  heroImage?: { url: string; photographer: string; photographerUrl: string };
  warnings: string[];
  metadata?: {
    candidateCount: number;
    resolvedCount: number;
    modelName: string;
    narrativeModelName: string;
    modelTier: 'flash' | 'pro';
    provider: string;
    timeoutMitigationUsed: boolean;
  };
  // failure fields
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
  message?: string;
}

export interface SeedPipelineResult {
  success: boolean;
  normalizedRequest?: NormalizedRequest;
  seed?: SemanticSeedPlan;
  warnings: string[];
  metadata?: {
    modelName: string;
    narrativeModelName: string;
    modelTier: 'flash' | 'pro';
    provider: string;
  };
  failedStep?: string;
  limitExceeded?: boolean;
  userType?: string;
  resetAt?: string | null;
  remaining?: number;
  message?: string;
}

export interface SpotsPipelineResult {
  success: boolean;
  candidates?: SemanticCandidate[];
  warnings: string[];
  failedStep?: string;
  message?: string;
}

export interface AssemblePipelineResult {
  success: boolean;
  timeline?: TimelineDay[];
  destination?: string;
  description?: string;
  heroImage?: { url: string; photographer: string; photographerUrl: string };
  warnings: string[];
  metadata?: {
    candidateCount: number;
    resolvedCount: number;
    modelName: string;
    narrativeModelName: string;
    modelTier: 'flash' | 'pro';
    provider: string;
    timeoutMitigationUsed: boolean;
  };
  failedStep?: string;
  message?: string;
}

export type StructureProgressCallback = (event: ComposeProgressEvent) => void;

export async function runSeedPipeline(
  input: UserInput,
  options?: ComposeOptions,
  onProgress?: StructureProgressCallback
): Promise<SeedPipelineResult> {
  const timer = createComposeTimer();
  const allWarnings: string[] = [];

  const emitProgress = (
    step: PipelineStepId,
    message: string,
    data?: Omit<Extract<ComposeProgressEvent, { type: 'progress' }>, 'type' | 'step' | 'message'>
  ) => {
    onProgress?.({ type: 'progress', step, message, ...data });
  };

  try {
    emitProgress('usage_check', '利用状況を確認中...');
    const usageResult = await timer.measure('usage_check', () =>
      checkAndRecordUsage('plan_generation', undefined, { skipConsume: options?.isRetry })
    );

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

    emitProgress('normalize', '旅の条件を整理中...');
    const normalizedRequest = await timer.measure('normalize', async () => normalizeRequest(input));

    const userType = usageResult.userType as UserType;
    const provider = getItineraryProvider();
    const semanticModel = resolveModelForPhase('outline', userType, provider);
    const narrativeModel = resolveModelForPhase('chunk', userType, provider);
    const modelTier = toComposeModelTier(userType);

    emitProgress('semantic_plan', '旅の骨格を設計中...');
    const seed = await timer.measure('semantic_plan', async () =>
      runSemanticSeedPlanner({
        request: normalizedRequest,
        context: [],
        modelName: semanticModel.modelName,
        provider,
        temperature: semanticModel.temperature,
        onProgress: (message) =>
          emitProgress('semantic_plan', message, {
            totalDays: normalizedRequest.durationDays,
          }),
      })
    );

    timer.log();

    return {
      success: true,
      normalizedRequest,
      seed,
      warnings: allWarnings,
      metadata: {
        modelName: semanticModel.modelName,
        narrativeModelName: narrativeModel.modelName,
        modelTier,
        provider,
      },
    };
  } catch (error) {
    console.error('[seed-pipeline] Failed:', error);
    timer.log();
    return {
      success: false,
      warnings: allWarnings,
      failedStep: error instanceof PipelineStepError ? error.step : undefined,
      message: error instanceof Error ? error.message : 'Seed pipeline failed',
    };
  }
}

export async function runSpotCandidatesPipeline(input: {
  normalizedRequest: NormalizedRequest;
  seed: SemanticSeedPlan;
  day: number;
  accumulatedCandidates?: SemanticCandidate[];
  modelName: string;
  provider: string;
}): Promise<SpotsPipelineResult> {
  const timer = createComposeTimer();
  const allWarnings: string[] = [];

  try {
    const fastMode = shouldUseSemanticFastMode(input.normalizedRequest, 12_000);
    const totalTarget = getSemanticCandidateTarget(input.normalizedRequest, fastMode);
    const perDayTarget = Math.max(
      2,
      Math.ceil(totalTarget / Math.max(input.normalizedRequest.durationDays, 1))
    );

    const candidates = await timer.measure('semantic_plan', async () =>
      runSemanticDayPlanner({
        request: input.normalizedRequest,
        seed: input.seed,
        context: [],
        modelName: input.modelName,
        provider: input.provider as 'gemini' | 'openai',
        temperature: 0.35,
        day: input.day,
        targetCandidateCount: perDayTarget,
        existingCandidates: input.accumulatedCandidates ?? [],
        onProgress: () => undefined,
      })
    );

    const mustVisitForDay = getScheduledMustVisitPlacesForDay({
      mustVisitPlaces: input.normalizedRequest.mustVisitPlaces,
      day: input.day,
      totalDays: input.seed.dayStructure.length,
      accumulatedCandidates: input.accumulatedCandidates,
      generatedCandidates: candidates,
    })
      .map((place) => ({
        name: place,
        role: 'must_visit' as const,
        priority: 10,
        dayHint: input.day,
        timeSlotHint: 'flexible' as const,
        stayDurationMinutes: 60,
        searchQuery: place,
        semanticId: crypto.randomUUID(),
      }));

    timer.log();

    return {
      success: true,
      candidates: [...mustVisitForDay, ...candidates],
      warnings: allWarnings,
    };
  } catch (error) {
    console.error('[spots-pipeline] Failed:', error);
    timer.log();
    return {
      success: false,
      warnings: allWarnings,
      failedStep: error instanceof PipelineStepError ? error.step : undefined,
      message: error instanceof Error ? error.message : 'Spots pipeline failed',
    };
  }
}

export async function runAssemblePipeline(input: {
  normalizedRequest: NormalizedRequest;
  seed: SemanticSeedPlan;
  candidates: SemanticCandidate[];
  metadata: NonNullable<SeedPipelineResult['metadata']>;
}): Promise<AssemblePipelineResult> {
  const timer = createComposeTimer(input.metadata.modelTier);
  const allWarnings: string[] = [];
  let timeoutMitigationUsed = false;

  try {
    const heroImagePromise: Promise<AssemblePipelineResult['heroImage']> | undefined = (async () => {
      try {
        const { getUnsplashImage } = await import('@/lib/unsplash');
        const image = await getUnsplashImage(input.seed.destination);
        if (!image) return undefined;
        return { url: image.url, photographer: image.photographer, photographerUrl: image.photographerUrl };
      } catch {
        return undefined;
      }
    })();

    const candidateCount = input.candidates.length;
    const placeResolveEnabled = isPlaceResolveEnabled();
    let stops: SelectedStop[];
    let resolvedCount = 0;

    if (placeResolveEnabled) {
      const resolvedGroups = await timer.measure('place_resolve', () =>
        resolvePlaces(input.candidates, input.seed.destination, {
          delayMs: 0,
          maxCandidates: Math.min(candidateCount, 6),
        })
      );

      resolvedCount = resolvedGroups.filter((group) => group.success).length;
      const { selected, filtered } = await timer.measure('feasibility_score', async () =>
        scoreAndSelect(resolvedGroups, input.normalizedRequest)
      );
      stops = selected;
      if (filtered.length > 0) {
        allWarnings.push(`${filtered.length}件の候補がフィルタされました`);
      }
      for (const stop of stops) {
        allWarnings.push(...stop.warnings);
      }
    } else {
      timeoutMitigationUsed = true;
      stops = candidatesToStops(input.candidates);
    }

    if (stops.length === 0) {
      return {
        success: false,
        warnings: allWarnings,
        failedStep: 'feasibility_score',
        message: '有効なスポットが見つかりませんでした',
      };
    }

    const optimizedDays = await timer.measure('route_optimize', async () => {
      try {
        return await optimizeRoutes(stops, input.seed.dayStructure, input.normalizedRequest, {
          destination: input.seed.destination,
          description: input.seed.description,
          candidates: input.candidates,
          dayStructure: input.seed.dayStructure,
          themes: input.seed.themes,
          tripIntentSummary: input.seed.tripIntentSummary,
          orderingPreferences: input.seed.orderingPreferences,
          fallbackHints: input.seed.fallbackHints,
        });
      } catch (error) {
        if (isTimeoutLikeError(error)) {
          timeoutMitigationUsed = true;
          return buildFallbackOptimizedDays(stops, input.seed.dayStructure);
        }
        throw error;
      }
    });

    const timeline = await timer.measure('timeline_build', async () => {
      try {
        return await buildTimeline(optimizedDays, input.normalizedRequest);
      } catch (error) {
        if (isTimeoutLikeError(error)) {
          timeoutMitigationUsed = true;
          return buildFallbackTimelineDays(optimizedDays);
        }
        throw error;
      }
    });

    const heroImage = heroImagePromise
      ? await Promise.race([
          heroImagePromise,
          new Promise<undefined>((resolve) =>
            setTimeout(() => resolve(undefined), SEMANTIC_SPOT_BATCH_RESERVE_MS)
          ),
        ])
      : undefined;

    timer.log();

    return {
      success: true,
      timeline,
      destination: input.seed.destination,
      description: input.seed.description,
      heroImage,
      warnings: allWarnings,
      metadata: {
        candidateCount,
        resolvedCount,
        modelName: input.metadata.modelName,
        narrativeModelName: input.metadata.narrativeModelName,
        modelTier: input.metadata.modelTier,
        provider: input.metadata.provider,
        timeoutMitigationUsed,
      },
    };
  } catch (error) {
    console.error('[assemble-pipeline] Failed:', error);
    timer.log();
    return {
      success: false,
      warnings: allWarnings,
      failedStep: error instanceof PipelineStepError ? error.step : undefined,
      message: error instanceof Error ? error.message : 'Assemble pipeline failed',
    };
  }
}

export async function runStructurePipeline(
  input: UserInput,
  options?: ComposeOptions,
  onProgress?: StructureProgressCallback
): Promise<StructurePipelineResult> {
  const timer = createComposeTimer();
  const allWarnings: string[] = [];
  const runId = crypto.randomUUID();
  const logger = new GenerationRunLogger(runId);
  const pipelineStartedAt = Date.now();
  const deadlineAt = pipelineStartedAt + STRUCTURE_DEADLINE_MS;
  let timeoutMitigationUsed = false;

  const remainingTimeMs = () => deadlineAt - Date.now();

  const createDeadlineError = (step: PipelineStepId, message: string) =>
    new PipelineStepError(step, message);

  const runWithDeadline = async <T>(
    step: PipelineStepId,
    task: () => Promise<T>,
    reserveMs: number = STRUCTURE_DEADLINE_RESERVE_MS
  ): Promise<T> => {
    const totalRemaining = remainingTimeMs();
    if (totalRemaining <= 0) {
      throw createDeadlineError(step, `Timed out before ${step}`);
    }
    const remaining = Math.max(totalRemaining - reserveMs, 50);
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
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const emitProgress = (
    step: PipelineStepId,
    message: string,
    data?: Omit<Extract<ComposeProgressEvent, { type: 'progress' }>, 'type' | 'step' | 'message'>
  ) => {
    onProgress?.({ type: 'progress', step, message, ...data });
  };

  try {
    // Step 0: Usage check
    emitProgress('usage_check', '利用状況を確認中...');
    const usageResult = await timer.measure('usage_check', () =>
      runWithDeadline('usage_check', () =>
        checkAndRecordUsage('plan_generation', undefined, { skipConsume: options?.isRetry })
      )
    );

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

    // Step 1: Normalize
    emitProgress('normalize', '旅の条件を整理中...');
    const normalizedRequest = await timer.measure('normalize', () =>
      runWithDeadline('normalize', async () => normalizeRequest(input))
    );

    // Model resolution
    const userType = usageResult.userType as UserType;
    const provider = getItineraryProvider();
    const semanticModel = resolveModelForPhase('outline', userType, provider);
    const narrativeModel = resolveModelForPhase('chunk', userType, provider);
    const modelTier = toComposeModelTier(userType);

    logger.startRun({ pipelineVersion: 'v3-structure', modelName: semanticModel.modelName, modelTier }).catch(() => {});

    // Step 2: Semantic Planner — always fast mode within structure deadline
    emitProgress('semantic_plan', '候補スポットを選定中...');
    const context: Article[] = [];
    // With a 9s total deadline, remaining after step 0+1 is ~8.4s.
    // Since 8400ms < 22000ms (FAST_MODE threshold), fast mode is always triggered here.
    const semanticCandidateTarget = Math.min(
      getSemanticCandidateTarget(normalizedRequest, true), // always cap at fast-mode limit
      10 // hard cap for structure phase to reduce AI latency
    );

    const semanticPlan = await timer.measure('semantic_plan', async () => {
      if (remainingTimeMs() < STRUCTURE_MIN_SEMANTIC_LLM_MS) {
        throw new PipelineStepError('semantic_plan', 'AIスポット生成に十分な時間がありません。もう一度お試しください。');
      }
      return runWithDeadline('semantic_plan', () => runSemanticPlanner({
        request: normalizedRequest,
        context,
        modelName: semanticModel.modelName,
        provider,
        temperature: semanticModel.temperature,
        retryOnFailure: false, // no time for retries in structure phase
        targetCandidateCount: semanticCandidateTarget,
        fastMode: true,        // always fast mode
        onProgress: (message) => emitProgress('semantic_plan', message),
      }), STRUCTURE_SEMANTIC_RESERVE_MS);
    });

    // Prefetch hero image in background
    let heroImagePromise: Promise<StructurePipelineResult['heroImage']> | undefined;
    if (remainingTimeMs() >= 3_000) {
      heroImagePromise = (async () => {
        try {
          const { getUnsplashImage } = await import('@/lib/unsplash');
          const image = await getUnsplashImage(semanticPlan.destination);
          if (!image) return undefined;
          return { url: image.url, photographer: image.photographer, photographerUrl: image.photographerUrl };
        } catch { return undefined; }
      })();
    }

    const candidateCount = semanticPlan.candidates.length;

    // Step 3: Place Resolver (conditional on time)
    const placeResolveEnabled = isPlaceResolveEnabled();
    let stops;
    let resolvedCount = 0;

    if (placeResolveEnabled && remainingTimeMs() >= STRUCTURE_PLACE_RESOLVE_MS) {
      emitProgress('place_resolve', '実在スポットに照合中...');
      const resolvedGroups = await timer.measure('place_resolve', () =>
        runWithDeadline('place_resolve', () => resolvePlaces(
          semanticPlan.candidates,
          semanticPlan.destination,
          { delayMs: 0, maxCandidates: Math.min(candidateCount, 6) }
        ))
      );

      resolvedCount = resolvedGroups.filter((g) => g.success).length;

      // Step 4: Feasibility
      emitProgress('feasibility_score', '実現性をチェック中...');
      const { selected, filtered } = await timer.measure('feasibility_score', async () =>
        runWithDeadline('feasibility_score', async () => scoreAndSelect(resolvedGroups, normalizedRequest))
      );
      stops = selected;
      if (filtered.length > 0) allWarnings.push(`${filtered.length}件の候補がフィルタされました`);
      for (const stop of stops) allWarnings.push(...stop.warnings);
    } else {
      // Skip place resolve — use AI-generated candidates directly
      if (placeResolveEnabled) timeoutMitigationUsed = true;
      emitProgress('place_resolve', 'スポット照合をスキップ中...');
      emitProgress('feasibility_score', '実現性チェックをスキップ中...');
      stops = candidatesToStops(semanticPlan.candidates);
    }

    if (stops.length === 0) {
      return { success: false, warnings: allWarnings, message: '有効なスポットが見つかりませんでした', failedStep: 'feasibility_score' };
    }

    // Step 5: Route Optimizer
    emitProgress('route_optimize', '回りやすい順に調整中...');
    const optimizedDays = await timer.measure('route_optimize', async () => {
      if (remainingTimeMs() < STRUCTURE_ROUTE_OPTIMIZE_MS) {
        timeoutMitigationUsed = true;
        return buildFallbackOptimizedDays(stops, semanticPlan.dayStructure);
      }
      try {
        return await runWithDeadline('route_optimize', async () =>
          optimizeRoutes(stops, semanticPlan.dayStructure, normalizedRequest, semanticPlan)
        );
      } catch (e) {
        if (isTimeoutLikeError(e)) { timeoutMitigationUsed = true; return buildFallbackOptimizedDays(stops, semanticPlan.dayStructure); }
        throw e;
      }
    });

    // Step 6: Timeline Builder
    emitProgress('timeline_build', 'タイムラインを作成中...');
    const timelineDays = await timer.measure('timeline_build', async () => {
      if (remainingTimeMs() < STRUCTURE_TIMELINE_BUILD_MS) {
        timeoutMitigationUsed = true;
        return buildFallbackTimelineDays(optimizedDays);
      }
      try {
        return await runWithDeadline('timeline_build', async () => buildTimeline(optimizedDays, normalizedRequest));
      } catch (e) {
        if (isTimeoutLikeError(e)) { timeoutMitigationUsed = true; return buildFallbackTimelineDays(optimizedDays); }
        throw e;
      }
    });

    // Hero image (optional, non-blocking)
    let heroImage: StructurePipelineResult['heroImage'];
    if (heroImagePromise) {
      try {
        heroImage = await Promise.race([
          heroImagePromise,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), Math.max(remainingTimeMs() - 200, 50))),
        ]);
      } catch { /* ignore */ }
    }

    timer.log();
    logger.endRun({ success: true, totalDurationMs: Date.now() - pipelineStartedAt, candidateCount, resolvedCount, filteredCount: stops.length }).catch(() => {});

    return {
      success: true,
      timeline: timelineDays,
      normalizedRequest,
      destination: semanticPlan.destination,
      description: semanticPlan.description,
      heroImage,
      warnings: allWarnings,
      metadata: {
        candidateCount,
        resolvedCount,
        modelName: semanticModel.modelName,
        narrativeModelName: narrativeModel.modelName,
        modelTier,
        provider,
        timeoutMitigationUsed,
      },
    };
  } catch (error) {
    console.error('[structure-pipeline] Pipeline failed:', error);
    timer.log();
    const failedStep = error instanceof PipelineStepError ? error.step : undefined;
    logger.endRun({ success: false, totalDurationMs: Date.now() - pipelineStartedAt, errorMessage: error instanceof Error ? error.message : 'Structure pipeline failed', failedStep }).catch(() => {});
    return {
      success: false,
      warnings: allWarnings,
      failedStep,
      message: error instanceof Error ? error.message : 'Structure pipeline failed',
    };
  }
}

// ============================================
// Split Pipeline: Phase 2 — Narrate
// (narrative_render only, with streaming support)
// Target: < 9 seconds, fallback to deterministic
// ============================================

export interface NarratePipelineInput {
  timeline: TimelineDay[];
  normalizedRequest: NormalizedRequest;
  narrativeModelName: string;
  provider: string;
  modelTier?: 'flash' | 'pro';
}

export interface NarratePipelineResult {
  success: boolean;
  itinerary?: Itinerary;
  heroImage?: { url: string; photographer: string; photographerUrl: string };
  warnings: string[];
  failedStep?: string;
  message?: string;
}

export type NarrateProgressCallback = (event: ComposeProgressEvent) => void;

export async function runNarratePipeline(
  structureInput: NarratePipelineInput,
  options?: {
    destination?: string;
    description?: string;
    heroImage?: NarratePipelineResult['heroImage'];
    warnings?: string[];
  },
  onProgress?: NarrateProgressCallback
): Promise<NarratePipelineResult> {
  const { timeline, normalizedRequest, narrativeModelName, provider } = structureInput;
  const allWarnings: string[] = [...(options?.warnings ?? [])];
  const pipelineStartedAt = Date.now();
  const deadlineAt = pipelineStartedAt + NARRATE_DEADLINE_MS;

  const remainingTimeMs = () => deadlineAt - Date.now();

  const emitProgress = (
    step: PipelineStepId,
    message: string,
    data?: Omit<Extract<ComposeProgressEvent, { type: 'progress' }>, 'type' | 'step' | 'message'>
  ) => {
    onProgress?.({ type: 'progress', step, message, ...data });
  };

  const emitDayComplete = (payload: Omit<Extract<ComposeProgressEvent, { type: 'day_complete' }>, 'type' | 'step'>) => {
    onProgress?.({ type: 'day_complete', step: 'narrative_render', ...payload });
  };

  const destination = options?.destination ?? normalizedRequest.destinations[0] ?? '';
  const description = options?.description ?? '';
  const totalDays = timeline.length;

  try {
    emitProgress('narrative_render', '旅程を仕上げ中...', { totalDays, destination, description });

    const context: Article[] = [];
    const narrativeInput = {
      timelineDays: timeline,
      request: normalizedRequest,
      context,
      modelName: narrativeModelName,
      provider: provider as import('@/lib/services/ai/providers/types').AIProviderName,
      temperature: 0.7,
    };

    let narrative: import('./steps/narrative-renderer').NarrativeRendererOutput;

    if (remainingTimeMs() < NARRATE_MIN_LLM_MS) {
      // Not enough time — deterministic fallback
      narrative = buildFallbackNarrativeOutput(timeline, normalizedRequest);
    } else {
      try {
        // Stream per-day narrative
        const streamResult = await new Promise<import('./steps/narrative-renderer').NarrativeStreamResult>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new PipelineStepError('narrative_render', 'narrative_render timed out before platform deadline'));
          }, remainingTimeMs() - NARRATE_DEADLINE_RESERVE_MS);
          streamNarrativeRendererWithResult(narrativeInput).then((r) => { clearTimeout(timeoutId); resolve(r); }).catch((e) => { clearTimeout(timeoutId); reject(e); });
        });

        for await (const event of streamResult.dayStream) {
          emitDayComplete({ day: event.day, dayData: event.dayData, isComplete: event.isComplete, totalDays, destination, description });
        }

        // Final result (resolved by the stream)
        narrative = await Promise.race([
          streamResult.finalOutput,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('final output timeout')), Math.max(remainingTimeMs() - 200, 50))),
        ]);
      } catch (streamError) {
        console.warn('[narrate-pipeline] Streaming failed, using deterministic fallback:', streamError);
        narrative = buildFallbackNarrativeOutput(timeline, normalizedRequest);
      }
    }

    // Assemble itinerary
    const composed: ComposedItinerary = {
      destination,
      description: narrative.description,
      days: narrative.days,
      heroImage: options?.heroImage,
      warnings: allWarnings,
      metadata: {
        pipelineVersion: 'v3',
        candidateCount: 0,
        resolvedCount: 0,
        filteredCount: 0,
        placeResolveEnabled: false,
        stepTimings: { narrative_render: Date.now() - pipelineStartedAt },
        modelName: narrativeModelName,
        modelTier: structureInput.modelTier ?? 'flash',
        warningCount: allWarnings.length,
        droppedCandidateCount: 0,
        fallbackUsed: false,
        timeoutMitigationUsed: false,
        compactionApplied: normalizedRequest.compaction?.applied ?? false,
        hardConstraintCount: normalizedRequest.compaction?.hardConstraintCount ?? 0,
        softPreferenceCount: normalizedRequest.compaction?.softPreferenceCount ?? 0,
        suppressedSoftPreferenceCount: normalizedRequest.compaction?.suppressedSoftPreferenceCount ?? 0,
      },
    };

    const modelInfo: ModelInfo = { modelName: narrativeModelName, tier: structureInput.modelTier ?? 'flash' };
    const itinerary = composedToItinerary(composed, modelInfo);

    return { success: true, itinerary, heroImage: options?.heroImage, warnings: allWarnings };
  } catch (error) {
    console.error('[narrate-pipeline] Failed:', error);
    const failedStep = error instanceof PipelineStepError ? error.step : undefined;
    return {
      success: false,
      warnings: allWarnings,
      failedStep,
      message: error instanceof Error ? error.message : 'Narrate pipeline failed',
    };
  }
}
