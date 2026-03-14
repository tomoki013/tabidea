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
  OptimizedDay,
  TimelineDay,
  DayStructure,
  SelectedStop,
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
const MIN_REMAINING_FOR_EMERGENCY_SEMANTIC_LLM_MS = 2_200;
const MIN_REMAINING_FOR_NARRATIVE_LLM_MS = 6_500;
const MIN_REMAINING_FOR_NARRATIVE_STREAM_MS = 9_000;
const MIN_REMAINING_FOR_SEMANTIC_FAST_MODE_MS = 18_000;
const MIN_REMAINING_FOR_ROUTE_OPTIMIZE_MS = 1_800;
const MIN_REMAINING_FOR_TIMELINE_BUILD_MS = 1_200;
const MIN_REMAINING_FOR_POST_SEMANTIC_STEPS_MS = 4_200;
const SEMANTIC_STEP_RESERVE_MS = 5_000;
const DEADLINE_RESERVE_MS = 2_000;

const DESTINATION_FALLBACK_CANDIDATES: Record<string, Array<{
  name: string;
  role: 'recommended' | 'meal';
  timeSlotHint: 'morning' | 'midday' | 'afternoon' | 'evening';
  stayDurationMinutes: number;
  searchQuery: string;
  areaHint: string;
}>> = {
  東京: [
    { name: '浅草寺', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '浅草寺', areaHint: '浅草' },
    { name: '東京スカイツリー', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 120, searchQuery: '東京スカイツリー', areaHint: '押上' },
    { name: 'すみだ北斎美術館', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 75, searchQuery: 'すみだ北斎美術館', areaHint: '両国' },
    { name: '築地場外市場で海鮮ランチ', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 75, searchQuery: '築地場外市場 海鮮', areaHint: '築地' },
    { name: '渋谷スクランブルスクエア展望台', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 75, searchQuery: '渋谷スカイ', areaHint: '渋谷' },
  ],
  京都: [
    { name: '清水寺', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '清水寺', areaHint: '東山' },
    { name: '伏見稲荷大社', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '伏見稲荷大社', areaHint: '伏見' },
    { name: '錦市場で京グルメ食べ歩き', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 60, searchQuery: '錦市場', areaHint: '四条河原町' },
    { name: '嵐山竹林の小径', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 75, searchQuery: '嵐山竹林の小径', areaHint: '嵐山' },
    { name: '祇園白川の夜散策', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 60, searchQuery: '祇園白川', areaHint: '祇園' },
  ],
  大阪: [
    { name: '大阪城天守閣', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 90, searchQuery: '大阪城天守閣', areaHint: '大阪城公園' },
    { name: '黒門市場で食べ歩き', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 75, searchQuery: '黒門市場', areaHint: '日本橋' },
    { name: '新世界・通天閣エリア散策', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 90, searchQuery: '通天閣', areaHint: '新世界' },
    { name: '道頓堀リバーサイド散策', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 60, searchQuery: '道頓堀', areaHint: 'ミナミ' },
    { name: '梅田スカイビル空中庭園展望台', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 60, searchQuery: '梅田スカイビル', areaHint: '梅田' },
  ],
  札幌: [
    { name: '大通公園', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 60, searchQuery: '大通公園', areaHint: '大通' },
    { name: '札幌市時計台', role: 'recommended', timeSlotHint: 'morning', stayDurationMinutes: 45, searchQuery: '札幌市時計台', areaHint: '大通' },
    { name: '二条市場で海鮮丼ランチ', role: 'meal', timeSlotHint: 'midday', stayDurationMinutes: 60, searchQuery: '二条市場 海鮮丼', areaHint: '狸小路' },
    { name: '白い恋人パーク', role: 'recommended', timeSlotHint: 'afternoon', stayDurationMinutes: 90, searchQuery: '白い恋人パーク', areaHint: '宮の沢' },
    { name: '藻岩山ロープウェイ夜景', role: 'recommended', timeSlotHint: 'evening', stayDurationMinutes: 90, searchQuery: '藻岩山ロープウェイ', areaHint: '藻岩山' },
  ],
};

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

  const destinationSeeds = Object.entries(DESTINATION_FALLBACK_CANDIDATES)
    .find(([key]) => destination.includes(key))?.[1];
  const fallbackSeeds = destinationSeeds ?? [
    { name: `${destination}駅周辺の主要スポット`, role: 'recommended' as const, timeSlotHint: 'morning' as const, stayDurationMinutes: 75, searchQuery: `${destination} 駅 観光名所`, areaHint: `${destination}駅周辺` },
    { name: `${destination}のローカル市場ランチ`, role: 'meal' as const, timeSlotHint: 'midday' as const, stayDurationMinutes: 60, searchQuery: `${destination} 市場 ランチ`, areaHint: destination },
    { name: `${destination}中心街の文化スポット`, role: 'recommended' as const, timeSlotHint: 'afternoon' as const, stayDurationMinutes: 90, searchQuery: `${destination} 文化施設`, areaHint: destination },
    { name: `${destination}の夜景スポット`, role: 'recommended' as const, timeSlotHint: 'evening' as const, stayDurationMinutes: 75, searchQuery: `${destination} 展望台 夜景`, areaHint: destination },
  ];

  const fillerCandidates = dayStructure.flatMap((day) =>
    fallbackSeeds.slice(0, 3).map((seed, index) => ({
      name: request.durationDays > 1 ? `${seed.name}（${day.day}日目）` : seed.name,
      role: seed.role,
      priority: Math.max(5, 7 - index),
      dayHint: day.day,
      timeSlotHint: seed.timeSlotHint,
      stayDurationMinutes: seed.stayDurationMinutes,
      searchQuery: seed.searchQuery,
      semanticId: crypto.randomUUID(),
      areaHint: seed.areaHint,
      rationale: '時間制限時の代替候補として、検索しやすい具体スポットを優先',
    }))
  );

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
      const runEmergencySemanticPlanner = async () => {
        timeoutMitigationUsed = true;
        emitProgress('semantic_plan', '時間制限のため候補数を絞って再選定中...');

        const emergencyTarget = Math.max(
          normalizedRequest.hardConstraints.mustVisitPlaces.length + normalizedRequest.durationDays,
          Math.min(normalizedRequest.durationDays * 3, 10)
        );

        return runWithDeadline('semantic_plan', () => runSemanticPlanner({
          request: normalizedRequest,
          context,
          modelName: semanticModel.modelName,
          provider,
          temperature: Math.max(semanticModel.temperature - 0.1, 0),
          retryOnFailure: false,
          targetCandidateCount: emergencyTarget,
          fastMode: true,
          onProgress: (message) => emitProgress('semantic_plan', message),
        }), DEADLINE_RESERVE_MS);
      };

      if (remainingTimeMs() < MIN_REMAINING_FOR_SEMANTIC_LLM_MS) {
        if (remainingTimeMs() >= MIN_REMAINING_FOR_EMERGENCY_SEMANTIC_LLM_MS) {
          try {
            return await runEmergencySemanticPlanner();
          } catch (emergencyError) {
            console.warn('[compose-pipeline] emergency semantic planner failed, using deterministic fallback:', emergencyError);
          }
        }

        timeoutMitigationUsed = true;
        fallbackUsed = true;
        emitProgress('semantic_plan', '時間制限のため最終フォールバックで継続中...');
        return buildDeterministicSemanticPlan(normalizedRequest);
      }

      try {
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
        }), Math.min(semanticReserve, Math.max(DEADLINE_RESERVE_MS, Math.floor(remainingTimeMs() * 0.35))));
      } catch (semanticError) {
        if (isTimeoutLikeError(semanticError)) {
          timeoutMitigationUsed = true;
          if (remainingTimeMs() >= MIN_REMAINING_FOR_EMERGENCY_SEMANTIC_LLM_MS) {
            try {
              return await runEmergencySemanticPlanner();
            } catch (emergencyError) {
              console.warn('[compose-pipeline] emergency semantic retry failed, using deterministic fallback:', emergencyError);
            }
          }

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
