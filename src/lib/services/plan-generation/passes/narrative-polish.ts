/**
 * Pass G: Narrative Polish
 * タイムライン付き旅程に AI で説明文を付与する。
 *
 * v4 専用 narrative renderer を呼び出す。
 * バッチモード (narrativePolishPass) とストリーミングモード (narrativePolishPassStreaming) を提供。
 */

import type {
  PassContext,
  PassResult,
  NarrativeState,
  DayNarrative,
  ActivityNarrative,
} from '@/types/plan-generation';
import type { Article } from '@/types/api';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import {
  runNarrativeRendererV4,
  streamNarrativeRendererV4,
  resolveLanguageModel,
  type StreamingDayEvent,
} from '../renderers/narrative-renderer-v4';
import type { AIProviderName } from '@/lib/services/ai/providers/types';
import { PineconeRetriever } from '@/lib/services/rag/pinecone-retriever';
import { reconstructTimelineDays } from '../transform/draft-to-timeline';

export type { StreamingDayEvent };

// ============================================
// RAG Context Retrieval
// ============================================

const RAG_TIMEOUT_MS = 2_000;

let retrieverInstance: PineconeRetriever | null = null;

function getRetriever(): PineconeRetriever {
  if (!retrieverInstance) {
    retrieverInstance = new PineconeRetriever();
  }
  return retrieverInstance;
}

async function fetchRagContext(normalizedInput: NormalizedRequest): Promise<Article[]> {
  try {
    const query = [
      ...normalizedInput.destinations,
      ...normalizedInput.themes,
    ].filter(Boolean).join(' ');

    if (!query.trim()) return [];

    const retriever = getRetriever();
    const result = await Promise.race([
      retriever.search(query, { topK: 5, minScore: 0.7 }),
      new Promise<Article[]>((_, reject) =>
        setTimeout(() => reject(new Error('RAG timeout')), RAG_TIMEOUT_MS),
      ),
    ]);
    return result;
  } catch (err) {
    console.warn('[narrative-polish] RAG retrieval failed, using empty context:', err);
    return [];
  }
}

// ============================================
// Conversion: NarrativeRendererOutput → NarrativeState
// ============================================

function narrativeDayToState(
  narrativeDay: {
    day: number;
    title: string;
    activities: Array<{
      draftId: string;
      activityName: string;
      description: string;
    }>;
  },
): DayNarrative {
  return {
    day: narrativeDay.day,
    title: narrativeDay.title,
    activities: narrativeDay.activities.map(
      (act): ActivityNarrative => ({
        draftId: act.draftId,
        activityName: act.activityName,
        description: act.description,
      }),
    ),
  };
}

// ============================================
// Shared precondition check
// ============================================

function checkPreconditions(ctx: PassContext) {
  const { normalizedInput, timelineState, generationProfile } = ctx.session;

  if (!normalizedInput || !timelineState) {
    return { ok: false as const, error: 'Missing normalizedInput or timelineState for narrative generation' };
  }

  let timelineDays;
  try {
    timelineDays = reconstructTimelineDays(ctx.session).map((day) => ({
      day: day.day,
      title: day.title,
      overnightLocation: day.overnightLocation,
      startTime: day.startTime,
      activities: day.nodes.map((node) => ({
        draftId: node.draftId,
        arrivalTime: node.arrivalTime,
        departureTime: node.departureTime,
        activityName: node.draftStop.activityLabel ?? node.draftStop.name,
        placeName: node.placeDetails?.name ?? node.draftStop.name,
        role: node.draftStop.role,
      })),
    }));
  } catch (err) {
    return { ok: false as const, error: `Failed to reconstruct timeline: ${err instanceof Error ? err.message : String(err)}` };
  }

  const modelName = generationProfile?.narrativeModelName ?? generationProfile?.modelName ?? 'gemini-2.5-flash';
  const provider = generationProfile?.provider ?? 'gemini';
  const temperature = generationProfile?.temperature ?? 0.7;

  return { ok: true as const, normalizedInput, timelineDays, modelName, provider, temperature };
}

// ============================================
// Batch Pass (used by executor /run route)
// ============================================

export async function narrativePolishPass(
  ctx: PassContext,
): Promise<PassResult<NarrativeState>> {
  const start = Date.now();

  const check = checkPreconditions(ctx);
  if (!check.ok) {
    return {
      outcome: 'failed_terminal',
      warnings: [check.error],
      durationMs: Date.now() - start,
    };
  }

  const { normalizedInput, timelineDays, modelName, provider, temperature } = check;
  if (ctx.budget.remainingMs() < 4_000) {
    return {
      outcome: 'failed_terminal',
      warnings: ['narrative_generation_timeout'],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        errorCode: 'narrative_generation_timeout',
        rootCause: 'insufficient_runtime_budget',
      },
    };
  }

  // RAG コンテキスト取得とモデル解決を並行実行してレイテンシを短縮
  const [context, preResolvedModel] = await Promise.all([
    fetchRagContext(normalizedInput),
    resolveLanguageModel(provider as AIProviderName, modelName),
  ]);

  try {
    const output = await runNarrativeRendererV4({
      days: timelineDays,
      request: normalizedInput,
      context,
      modelName,
      provider,
      temperature,
      model: preResolvedModel,
    });

    const dayNarratives = output.days.map(narrativeDayToState);

    const narrativeState: NarrativeState = {
      description: output.description,
      completedDays: dayNarratives.map(d => d.day),
      dayNarratives,
      warnings: [],
    };

    return {
      outcome: 'completed',
      data: narrativeState,
      warnings: [],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        daysGenerated: dayNarratives.length,
        ragArticleCount: context.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      outcome: 'failed_terminal',
      warnings: [/abort|timeout|timed out/i.test(message) ? 'narrative_generation_timeout' : 'narrative_generation_provider_error'],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        errorCode: /abort|timeout|timed out/i.test(message)
          ? 'narrative_generation_timeout'
          : 'narrative_generation_provider_error',
        rootCause: /abort|timeout|timed out/i.test(message) ? 'timeout' : 'renderer_error',
      },
    };
  }
}

// ============================================
// Streaming Pass (used by SSE /stream route)
// ============================================

export interface StreamingNarrativeResult {
  dayStream: AsyncIterable<StreamingDayEvent>;
  finalResult: Promise<PassResult<NarrativeState>>;
}

export async function narrativePolishPassStreaming(
  ctx: PassContext,
): Promise<StreamingNarrativeResult> {
  const start = Date.now();

  const check = checkPreconditions(ctx);
  if (!check.ok) {
    const failResult: PassResult<NarrativeState> = {
      outcome: 'failed_terminal',
      warnings: [check.error],
      durationMs: Date.now() - start,
    };
    return {
      dayStream: (async function* () { /* empty */ })(),
      finalResult: Promise.resolve(failResult),
    };
  }

  const { normalizedInput, timelineDays, modelName, provider, temperature } = check;
  if (ctx.budget.remainingMs() < 4_000) {
    const fallbackResult: PassResult<NarrativeState> = {
      outcome: 'failed_terminal',
      warnings: ['narrative_generation_timeout'],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        errorCode: 'narrative_generation_timeout',
        rootCause: 'insufficient_runtime_budget',
      },
    };
    return {
      dayStream: (async function* () { /* empty */ })(),
      finalResult: Promise.resolve(fallbackResult),
    };
  }

  // RAG コンテキスト取得とモデル解決を並行実行してTTFTを短縮
  const [context, preResolvedModel] = await Promise.all([
    fetchRagContext(normalizedInput),
    resolveLanguageModel(provider as AIProviderName, modelName),
  ]);

  let streamResult: Awaited<ReturnType<typeof streamNarrativeRendererV4>>;
  try {
    streamResult = await streamNarrativeRendererV4({
      days: timelineDays,
      request: normalizedInput,
      context,
      modelName,
      provider,
      temperature,
      model: preResolvedModel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const fallbackResult: PassResult<NarrativeState> = {
      outcome: 'failed_terminal',
      warnings: [/abort|timeout|timed out/i.test(message) ? 'narrative_generation_timeout' : 'narrative_generation_provider_error'],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        errorCode: /abort|timeout|timed out/i.test(message)
          ? 'narrative_generation_timeout'
          : 'narrative_generation_provider_error',
        rootCause: /abort|timeout|timed out/i.test(message) ? 'timeout' : 'stream_init_error',
      },
    };
    return {
      dayStream: (async function* () { /* empty */ })(),
      finalResult: Promise.resolve(fallbackResult),
    };
  }

  const finalResult = streamResult.finalOutput.then((output): PassResult<NarrativeState> => {
    const dayNarratives = output.days.map(narrativeDayToState);
    return {
      outcome: 'completed',
      data: {
        description: output.description,
        completedDays: dayNarratives.map(d => d.day),
        dayNarratives,
        warnings: [],
      },
      warnings: [],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        daysGenerated: dayNarratives.length,
        ragArticleCount: context.length,
      },
    };
  }).catch((err): PassResult<NarrativeState> => {
    const message = err instanceof Error ? err.message : String(err);
    return {
      outcome: 'failed_terminal',
      warnings: [/abort|timeout|timed out/i.test(message) ? 'narrative_generation_timeout' : 'narrative_generation_provider_error'],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        errorCode: /abort|timeout|timed out/i.test(message)
          ? 'narrative_generation_timeout'
          : 'narrative_generation_provider_error',
        rootCause: /abort|timeout|timed out/i.test(message) ? 'timeout' : 'stream_final_error',
      },
    };
  });

  return {
    dayStream: streamResult.dayStream,
    finalResult,
  };
}
