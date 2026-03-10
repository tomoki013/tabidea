/**
 * Compose Pipeline Orchestrator
 * 7 step パイプラインの統合実行
 */

import type { UserInput } from '@/types/user-input';
import type { Itinerary, ModelInfo } from '@/types/itinerary';
import type { Article } from '@/lib/services/ai/types';
import type {
  PipelineStepId,
  PipelineProgress,
  ComposedItinerary,
  ComposePipelineMetadata,
} from '@/types/compose-pipeline';
import { normalizeRequest } from './steps/normalize-request';
import { runSemanticPlanner } from './steps/semantic-planner';
import { resolvePlaces, isPlaceResolveEnabled } from './steps/place-resolver';
import { scoreAndSelect, candidatesToStops } from './steps/feasibility-scorer';
import { optimizeRoutes } from './steps/route-optimizer';
import { buildTimeline } from './steps/timeline-builder';
import { runNarrativeRenderer } from './steps/narrative-renderer';
import { composedToItinerary } from './adapter';
import { selectModel } from '@/lib/services/ai/model-selector';
import { createComposeTimer } from '@/lib/utils/performance-timer';
import { checkAndRecordUsage } from '@/lib/limits/check';
import type { OutlineActionState } from '@/lib/services/plan-generation/generate-outline';

// ============================================
// PipelineStepError
// ============================================

export class PipelineStepError extends Error {
  public readonly step: string;
  public readonly cause?: unknown;

  constructor(step: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'PipelineStepError';
    this.step = step;
    this.cause = cause;
  }
}

// ============================================
// Types
// ============================================

export interface ComposeOptions {
  isRetry?: boolean;
}

export type ProgressCallback = (
  step: PipelineStepId,
  message: string
) => void;

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
 * Compose Pipeline を実行
 */
export async function runComposePipeline(
  input: UserInput,
  options?: ComposeOptions,
  onProgress?: ProgressCallback
): Promise<ComposeResult> {
  const timer = createComposeTimer();
  const allWarnings: string[] = [];

  const emit = (step: PipelineStepId, message: string) => {
    onProgress?.(step, message);
  };

  try {
    // ====================================
    // Step 0: Usage check
    // ====================================
    emit('usage_check', '利用状況を確認中...');
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
    emit('normalize', '旅の条件を整理中...');
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

    // ====================================
    // Step 2: Semantic Planner
    // ====================================
    emit('semantic_plan', '候補スポットを選定中...');
    const context: Article[] = []; // RAG context could be added here
    const semanticPlan = await timer.measure('semantic_plan', async () => {
      return runSemanticPlanner({
        request: normalizedRequest,
        context,
        modelName: modelSelection.modelName,
        temperature: modelSelection.temperature,
      });
    });

    const candidateCount = semanticPlan.candidates.length;

    // ====================================
    // Step 3: Place Resolver (conditional)
    // ====================================
    const placeResolveEnabled = isPlaceResolveEnabled();
    let stops;
    let resolvedCount = 0;

    if (placeResolveEnabled) {
      emit('place_resolve', '実在スポットに照合中...');
      const resolvedGroups = await timer.measure('place_resolve', async () => {
        return resolvePlaces(
          semanticPlan.candidates,
          semanticPlan.destination
        );
      });

      resolvedCount = resolvedGroups.filter((g) => g.success).length;

      // ====================================
      // Step 4: Feasibility Scorer
      // ====================================
      emit('feasibility_score', '営業時間・実現性を確認中...');
      const { selected, filtered } = await timer.measure(
        'feasibility_score',
        async () => {
          return scoreAndSelect(resolvedGroups, normalizedRequest);
        }
      );

      stops = selected;

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
      emit('place_resolve', 'スポット照合をスキップ中...');
      emit('feasibility_score', '実現性チェックをスキップ中...');
      stops = candidatesToStops(semanticPlan.candidates);
      resolvedCount = 0;
    }

    const filteredCount = stops.length;

    if (stops.length === 0) {
      return {
        success: false,
        warnings: allWarnings,
        message: 'No viable spots found after filtering',
      };
    }

    // ====================================
    // Step 5: Route Optimizer
    // ====================================
    emit('route_optimize', '回りやすい順に調整中...');
    const optimizedDays = await timer.measure('route_optimize', async () => {
      return optimizeRoutes(
        stops,
        semanticPlan.dayStructure,
        normalizedRequest
      );
    });

    // ====================================
    // Step 6: Timeline Builder
    // ====================================
    emit('timeline_build', 'タイムラインを作成中...');
    const timelineDays = await timer.measure('timeline_build', async () => {
      return buildTimeline(optimizedDays, normalizedRequest);
    });

    // ====================================
    // Step 7: Narrative Renderer
    // ====================================
    emit('narrative_render', '旅程を仕上げ中...');
    const narrative = await timer.measure('narrative_render', async () => {
      return runNarrativeRenderer({
        timelineDays,
        request: normalizedRequest,
        context,
        modelName: modelSelection.modelName,
        temperature: 0.3,
      });
    });

    // ====================================
    // Hero Image
    // ====================================
    emit('hero_image', 'ぴったりの写真を探し中...');
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
      pipelineVersion: 'v2',
      candidateCount,
      resolvedCount,
      filteredCount,
      placeResolveEnabled,
      stepTimings,
      modelName: modelSelection.modelName,
      modelTier: modelSelection.tier,
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

    return {
      success: false,
      warnings: allWarnings,
      failedStep,
      message: error instanceof Error ? error.message : 'Pipeline execution failed',
    };
  }
}
