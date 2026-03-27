/**
 * Pass G: Narrative Polish
 * タイムライン付き旅程に AI で説明文を付与する。
 *
 * v3 の runNarrativeRenderer() / streamNarrativeRendererWithResult() を直接呼び出す。
 * バッチモード (narrativePolishPass) とストリーミングモード (narrativePolishPassStreaming) を提供。
 */

import type {
  PassContext,
  PassResult,
  NarrativeState,
  DayNarrative,
  ActivityNarrative,
} from '@/types/plan-generation';
import type { NarrativeDay, NarrativeActivity } from '@/types/itinerary-pipeline';
import type { Article } from '@/types/api';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import {
  runNarrativeRenderer,
  streamNarrativeRendererWithResult,
  type StreamingDayEvent,
} from '@/lib/services/itinerary/steps/narrative-renderer';
import { PineconeRetriever } from '@/lib/services/rag/pinecone-retriever';
import { reconstructTimelineDays } from '../bridges/draft-to-v3';
import { PassExecutionError } from '../errors';

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
  narrativeDay: NarrativeDay,
): DayNarrative {
  return {
    day: narrativeDay.day,
    title: narrativeDay.title,
    activities: narrativeDay.activities.map(
      (act: NarrativeActivity): ActivityNarrative => ({
        draftId: act.node.semanticId ?? act.node.stop.semanticId ?? '',
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
    timelineDays = reconstructTimelineDays(ctx.session);
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

  // RAG コンテキスト取得
  const context = await fetchRagContext(normalizedInput);

  try {
    const output = await runNarrativeRenderer({
      timelineDays,
      request: normalizedInput,
      context,
      modelName,
      provider,
      temperature,
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
    if (err instanceof Error && /abort|timeout|timed out/i.test(err.message)) {
      return {
        outcome: 'needs_retry',
        warnings: [`Narrative generation timed out: ${err.message}`],
        durationMs: Date.now() - start,
      };
    }

    throw new PassExecutionError(
      'narrative_polish',
      err instanceof Error ? err.message : String(err),
      err,
    );
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

  // RAG コンテキスト取得
  const context = await fetchRagContext(normalizedInput);

  const streamResult = await streamNarrativeRendererWithResult({
    timelineDays,
    request: normalizedInput,
    context,
    modelName,
    provider,
    temperature,
  });

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
    if (err instanceof Error && /abort|timeout|timed out/i.test(err.message)) {
      return {
        outcome: 'needs_retry',
        warnings: [`Narrative generation timed out: ${err.message}`],
        durationMs: Date.now() - start,
      };
    }
    return {
      outcome: 'failed_terminal',
      warnings: [`Narrative generation failed: ${err instanceof Error ? err.message : String(err)}`],
      durationMs: Date.now() - start,
    };
  });

  return {
    dayStream: streamResult.dayStream,
    finalResult,
  };
}
