/**
 * Pass G: Narrative Polish
 * タイムライン付き旅程に AI で説明文を付与する。
 *
 * v3 の runNarrativeRenderer() を直接呼び出す。
 * Phase 2 ではバッチモード。ストリーミングは Phase 3 で対応。
 */

import type {
  PassContext,
  PassResult,
  NarrativeState,
  DayNarrative,
  ActivityNarrative,
} from '@/types/plan-generation';
import type { NarrativeDay, NarrativeActivity } from '@/types/itinerary-pipeline';
import { runNarrativeRenderer } from '@/lib/services/itinerary/steps/narrative-renderer';
import { reconstructTimelineDays } from '../bridges/draft-to-v3';
import { PassExecutionError } from '../errors';

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
// Pass Implementation
// ============================================

export async function narrativePolishPass(
  ctx: PassContext,
): Promise<PassResult<NarrativeState>> {
  const start = Date.now();

  const { normalizedInput, timelineState, generationProfile } = ctx.session;
  if (!normalizedInput || !timelineState) {
    return {
      outcome: 'failed_terminal',
      warnings: ['Missing normalizedInput or timelineState for narrative generation'],
      durationMs: Date.now() - start,
    };
  }

  // セッションから v3 TimelineDay[] を復元
  let timelineDays;
  try {
    timelineDays = reconstructTimelineDays(ctx.session);
  } catch (err) {
    return {
      outcome: 'failed_terminal',
      warnings: [`Failed to reconstruct timeline: ${err instanceof Error ? err.message : String(err)}`],
      durationMs: Date.now() - start,
    };
  }

  const modelName = generationProfile?.narrativeModelName ?? generationProfile?.modelName ?? 'gemini-2.5-flash';
  const provider = generationProfile?.provider ?? 'gemini';
  const temperature = generationProfile?.temperature ?? 0.7;

  try {
    const output = await runNarrativeRenderer({
      timelineDays,
      request: normalizedInput,
      context: [], // Phase 2: RAG articles なし (Phase 3 で追加)
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
