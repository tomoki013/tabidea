/**
 * Compose Pipeline Orchestrator (v3)
 * 7 step パイプラインの統合実行
 * + GenerationRunLogger による観測ログ
 */

import type { UserInput } from '@/types/user-input';
import type { Itinerary, ModelInfo } from '@/types/itinerary';
import type { PartialDayData } from '@/types';
import type { Article } from '@/lib/services/ai/types';
import type {
  PipelineStepId,
  ComposedItinerary,
  ComposePipelineMetadata,
} from '@/types/itinerary-pipeline';
import { normalizeRequest } from './steps/normalize-request';
import { runSemanticPlanner } from './steps/semantic-planner';
import { resolvePlaces, isPlaceResolveEnabled } from './steps/place-resolver';
import { scoreAndSelect, candidatesToStops } from './steps/feasibility-scorer';
import { optimizeRoutes } from './steps/route-optimizer';
import { buildTimeline } from './steps/timeline-builder';
import {
  runNarrativeRenderer,
  streamNarrativeRendererWithResult,
} from './steps/narrative-renderer';
import { composedToItinerary } from './adapter';
import { PipelineStepError } from './errors';
import { GenerationRunLogger } from './generation-run-logger';
import { selectModel } from '@/lib/services/ai/model-selector';
import { createComposeTimer } from '@/lib/utils/performance-timer';
import { checkAndRecordUsage } from '@/lib/limits/check';

// Re-export for backward compatibility
export { PipelineStepError } from './errors';

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
    const usageResult = await timer.measure('usage_check', async () => {
      return checkAndRecordUsage('plan_generation', undefined, {
        skipConsume: options?.isRetry,
      });
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
    const normalizedRequest = await timer.measure('normalize', async () => {
      return normalizeRequest(input);
    });

    // ====================================
    // Model Selection
    // ====================================
    const modelSelection = selectModel({
      phase: 'outline',
      complexity: {
        durationDays: normalizedRequest.durationDays,
        isMultiCity: normalizedRequest.destinations.length > 1,
        companionType: normalizedRequest.companions,
      },
    });

    // Update timer targets based on model tier
    if (modelSelection.tier === 'pro') {
      const { COMPOSE_TARGETS_PRO } = await import('@/lib/utils/performance-timer');
      timer.setTargets(COMPOSE_TARGETS_PRO);
    }

    // Start run logging (fire-and-forget)
    logger.startRun({
      pipelineVersion: 'v3',
      modelName: modelSelection.modelName,
      modelTier: modelSelection.tier,
    }).catch(() => {});

    // ====================================
    // Step 2: Semantic Planner
    // ====================================
    emitProgress('semantic_plan', '候補スポットを選定中...');
    const context: Article[] = []; // RAG context could be added here
    const semanticPlanStart = Date.now();
    const semanticPlan = await timer.measure('semantic_plan', async () => {
      return runSemanticPlanner({
        request: normalizedRequest,
        context,
        modelName: modelSelection.modelName,
        temperature: modelSelection.temperature,
      });
    });

    const candidateCount = semanticPlan.candidates.length;
    logger.logStep({
      stepName: 'semantic_plan',
      status: 'success',
      durationMs: Date.now() - semanticPlanStart,
      metadata: { candidateCount },
    }).catch(() => {});

    // ====================================
    // Step 3: Place Resolver (conditional)
    // ====================================
    const placeResolveEnabled = isPlaceResolveEnabled();
    let stops;
    let resolvedCount = 0;
    let filteredOutCount = 0;
    let droppedCount = 0;
    let fallbackUsed = false;

    if (placeResolveEnabled) {
      emitProgress('place_resolve', '実在スポットに照合中...');
      const resolveStart = Date.now();
      const resolvedGroups = await timer.measure('place_resolve', async () => {
        return resolvePlaces(
          semanticPlan.candidates,
          semanticPlan.destination
        );
      });

      resolvedCount = resolvedGroups.filter((g) => g.success).length;
      const failedResolves = resolvedGroups.filter((g) => !g.success).length;

      logger.logStep({
        stepName: 'place_resolve',
        status: failedResolves > 0 ? 'fallback' : 'success',
        durationMs: Date.now() - resolveStart,
        metadata: { resolvedCount, failedResolves },
      }).catch(() => {});

      if (failedResolves > 0) {
        fallbackUsed = true;
      }

      // ====================================
      // Step 4: Feasibility Scorer
      // ====================================
      emitProgress('feasibility_score', '営業時間・実現性を確認中...');
      const scoreStart = Date.now();
      const { selected, filtered } = await timer.measure(
        'feasibility_score',
        async () => {
          return scoreAndSelect(resolvedGroups, normalizedRequest);
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
    const routeStart = Date.now();
    const optimizedDays = await timer.measure('route_optimize', async () => {
      return optimizeRoutes(
        stops,
        semanticPlan.dayStructure,
        normalizedRequest,
        semanticPlan
      );
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
    const timelineStart = Date.now();
    const timelineDays = await timer.measure('timeline_build', async () => {
      return buildTimeline(optimizedDays, normalizedRequest);
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
    const narrativeStart = Date.now();

    const narrativeInput = {
      timelineDays,
      request: normalizedRequest,
      context,
      modelName: modelSelection.modelName,
      temperature: 0.3,
    };

    const narrative = await timer.measure('narrative_render', async () => {
      try {
        const streamResult = await streamNarrativeRendererWithResult(narrativeInput);

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

        return await streamResult.finalOutput;
      } catch (streamError) {
        console.warn('[compose-pipeline] streamNarrativeRenderer failed, falling back to generateObject:', streamError);
        return runNarrativeRenderer(narrativeInput);
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
    await timer.measure('hero_image', async () => {
      try {
        const { getUnsplashImage } = await import('@/lib/unsplash');
        const image = await getUnsplashImage(semanticPlan.destination);
        if (image) {
          heroImage = {
            url: image.url,
            photographer: image.photographer,
            photographerUrl: image.photographerUrl,
          };
        }
      } catch (err) {
        console.warn('[compose] Hero image fetch failed:', err);
      }
    });

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
      modelName: modelSelection.modelName,
      modelTier: modelSelection.tier,
      warningCount: allWarnings.length,
      droppedCandidateCount: droppedCount,
      fallbackUsed,
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
      modelName: modelSelection.modelName,
      tier: modelSelection.tier,
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
      totalDurationMs: 0,
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
