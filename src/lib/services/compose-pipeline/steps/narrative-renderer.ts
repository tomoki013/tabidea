/**
 * Step 7: Narrative Renderer
 * Gemini generateObject() で説明文を生成
 * 時刻・順序・場所選定は一切変更しない — prose のみ生成
 */

import type {
  TimelineDay,
  NarrativeDay,
  NarrativeActivity,
  NormalizedRequest,
} from '@/types/compose-pipeline';
import { narrativeOutputSchema } from '@/lib/services/ai/schemas/compose-schemas';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import type { Article } from '@/lib/services/ai/types';

// ============================================
// Public API
// ============================================

export interface NarrativeRendererInput {
  timelineDays: TimelineDay[];
  request: NormalizedRequest;
  context: Article[];
  modelName: string;
  temperature: number;
}

export interface NarrativeRendererOutput {
  description: string;
  days: NarrativeDay[];
}

/**
 * TimelineDay[] に説明文を付与
 */
export async function runNarrativeRenderer(
  input: NarrativeRendererInput
): Promise<NarrativeRendererOutput> {
  const { timelineDays, request, context, modelName, temperature } = input;

  const userPrompt = buildNarrativePrompt(timelineDays, request);

  const { systemInstruction } = buildContextSandwich({
    context,
    userPrompt: '',
    generationType: 'narrativeRender',
  });

  try {
    const { google } = await import('@ai-sdk/google');
    const { generateObject } = await import('ai');

    const result = await generateObject({
      model: google(modelName),
      schema: narrativeOutputSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: 1,
    });

    const output = result.object;

    // TimelineDay と NarrativeOutput をマージ
    return mergeNarrativeOutput(timelineDays, output.description, output.days);
  } catch (error) {
    console.error('[narrative-renderer] LLM generation failed, using fallback:', error);
    // フォールバック: 構造化データのみで構築
    return buildFallbackNarrative(timelineDays, request);
  }
}

// ============================================
// Prompt construction
// ============================================

function buildNarrativePrompt(
  timelineDays: TimelineDay[],
  request: NormalizedRequest
): string {
  const destinations = request.destinations.join('、');
  const lang = request.outputLanguage === 'en' ? 'English' : '日本語';

  let prompt = `以下の旅程データに説明文を付与してください。出力言語: ${lang}

【旅行概要】
- 目的地: ${destinations}
- 日数: ${request.durationDays}日間
- テーマ: ${request.themes.join('、')}
- 同行者: ${request.companions || '指定なし'}

【旅程データ】
`;

  for (const day of timelineDays) {
    prompt += `\n--- Day ${day.day}: ${day.title} ---\n`;
    for (const node of day.nodes) {
      const name = node.stop.candidate.activityLabel || node.stop.candidate.name;
      const placeName = node.stop.placeDetails?.name || node.stop.candidate.searchQuery;
      prompt += `${node.arrivalTime}-${node.departureTime} | ${name} (${placeName}) [${node.stop.candidate.role}]\n`;
    }
  }

  prompt += `
【出力ルール】
1. 各アクティビティに1-2文の生き生きとした説明文を付けてください
2. 各日にその日の見どころを反映したタイトルを付けてください
3. 全体の旅程を1-2文で紹介する description を生成してください
4. 時刻・順序・場所は変更しないでください
5. arrivalTime は入力データと完全に一致させてください`;

  return prompt;
}

// ============================================
// Merge logic
// ============================================

function mergeNarrativeOutput(
  timelineDays: TimelineDay[],
  description: string,
  narrativeDays: Array<{ day: number; title: string; activities: Array<{ arrivalTime: string; description: string; activityName: string }> }>
): NarrativeRendererOutput {
  const days: NarrativeDay[] = timelineDays.map((tDay) => {
    const nDay = narrativeDays.find((nd) => nd.day === tDay.day);

    const activities: NarrativeActivity[] = tDay.nodes.map((node) => {
      const nActivity = nDay?.activities.find(
        (na) => na.arrivalTime === node.arrivalTime
      );

      return {
        node,
        description: nActivity?.description || node.stop.candidate.name,
        activityName: nActivity?.activityName || node.stop.candidate.activityLabel || node.stop.candidate.name,
        source: {
          type: 'ai_knowledge' as const,
          confidence: 'medium' as const,
        },
      };
    });

    return {
      day: tDay.day,
      title: nDay?.title || tDay.title,
      activities,
      legs: tDay.legs,
      overnightLocation: tDay.overnightLocation,
    };
  });

  return { description, days };
}

// ============================================
// Fallback (LLM failure)
// ============================================

function buildFallbackNarrative(
  timelineDays: TimelineDay[],
  request: NormalizedRequest
): NarrativeRendererOutput {
  const days: NarrativeDay[] = timelineDays.map((tDay) => ({
    day: tDay.day,
    title: tDay.title,
    activities: tDay.nodes.map((node) => ({
      node,
      description: node.stop.candidate.name,
      activityName: node.stop.candidate.activityLabel || node.stop.candidate.name,
      source: {
        type: 'ai_knowledge' as const,
        confidence: 'low' as const,
      },
    })),
    legs: tDay.legs,
    overnightLocation: tDay.overnightLocation,
  }));

  const destinations = request.destinations.join('、');
  const description = `${destinations}の${request.durationDays}日間の旅行プラン`;

  return { description, days };
}
