/**
 * Step 7: Narrative Renderer
 * Gemini generateObject() / streamObject() で説明文を生成
 * 時刻・順序・場所選定は一切変更しない — prose のみ生成
 */

import type {
  TimelineDay,
  NarrativeDay,
  NarrativeActivity,
  NormalizedRequest,
} from '@/types/itinerary-pipeline';
import type { PartialDayData } from '@/types';
import { narrativeOutputSchema } from '@/lib/services/ai/schemas/compose-schemas';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import type { Article } from '@/lib/services/ai/types';
import type { AIProviderName } from '@/lib/services/ai/providers/types';

// ============================================
// Public API
// ============================================

export interface NarrativeRendererInput {
  timelineDays: TimelineDay[];
  request: NormalizedRequest;
  context: Article[];
  modelName: string;
  provider?: AIProviderName;
  temperature: number;
}

export interface NarrativeRendererOutput {
  description: string;
  days: NarrativeDay[];
}

export interface StreamingDayEvent {
  day: number;
  dayData: PartialDayData;
  isComplete: boolean;
}

export interface NarrativeStreamResult {
  dayStream: AsyncIterable<StreamingDayEvent>;
  finalOutput: Promise<NarrativeRendererOutput>;
}

/**
 * TimelineDay[] に説明文を付与 (一括生成)
 */
export async function runNarrativeRenderer(
  input: NarrativeRendererInput
): Promise<NarrativeRendererOutput> {
  const { timelineDays, request, modelName, provider = 'gemini', temperature } = input;
  const { userPrompt, systemInstruction } = buildNarrativeInstructions(input);

  try {
    const { generateObject } = await import('ai');
    const model = await resolveLanguageModel(provider, modelName);

    const result = await generateObject({
      model,
      schema: narrativeOutputSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: 2,
    });

    const output = result.object;

    // TimelineDay と NarrativeOutput をマージ
    return mergeNarrativeOutput(timelineDays, output.description, output.days);
  } catch (error) {
    console.error('[narrative-renderer] LLM generation failed, using fallback:', error);
    // フォールバック: 構造化データのみで構築
    return buildFallbackNarrativeOutput(timelineDays, request);
  }
}

/**
 * streamObject を使って日ごとに部分データを yield する async generator
 */
export async function streamNarrativeRendererWithResult(
  input: NarrativeRendererInput
): Promise<NarrativeStreamResult> {
  const { timelineDays, request, modelName, provider = 'gemini', temperature } = input;
  const { userPrompt, systemInstruction } = buildNarrativeInstructions(input);

  try {
    const { streamObject } = await import('ai');
    const model = await resolveLanguageModel(provider, modelName);

    const result = await streamObject({
      model,
      schema: narrativeOutputSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: 2,
    });

    const finalOutput = result.object
      .then((output) =>
        mergeNarrativeOutput(timelineDays, output.description, output.days)
      )
      .catch((error) => {
        console.error('[narrative-renderer] Final object assembly failed, using fallback:', error);
        return buildFallbackNarrativeOutput(timelineDays, request);
      });

    return {
      dayStream: createStreamingDayEventStream(
        timelineDays,
        result.partialObjectStream,
        finalOutput
      ),
      finalOutput,
    };
  } catch (error) {
    console.error('[narrative-renderer] streamObject failed, using fallback:', error);
    const fallback = buildFallbackNarrativeOutput(timelineDays, request);

    return {
      dayStream: createFallbackDayStream(fallback),
      finalOutput: Promise.resolve(fallback),
    };
  }
}

export async function* streamNarrativeRenderer(
  input: NarrativeRendererInput
): AsyncGenerator<StreamingDayEvent> {
  const { dayStream } = await streamNarrativeRendererWithResult(input);
  for await (const event of dayStream) {
    yield event;
  }
}

// ============================================
// Prompt construction
// ============================================

function buildNarrativeInstructions(
  input: NarrativeRendererInput
): { userPrompt: string; systemInstruction: string } {
  const { timelineDays, request, context } = input;

  const userPrompt = buildNarrativePrompt(timelineDays, request);

  const { systemInstruction } = buildContextSandwich({
    context,
    userPrompt: '',
    generationType: 'narrativeRender',
  });

  return { userPrompt, systemInstruction };
}

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
5. arrivalTime は入力データと完全に一致させてください
6. 文を途中で切らず、各 description は完結した自然な文章で終える（「...」「…」で終わらない）`;

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

/**
 * Merge a partial narrative day with its corresponding TimelineDay
 */
function mergePartialDayToPartialData(
  tDay: TimelineDay,
  rawDay: {
    day?: number;
    title?: string;
    activities?: Array<{
      arrivalTime?: string;
      description?: string;
      activityName?: string;
    } | undefined>;
  }
): PartialDayData {
  const activities = tDay.nodes.map((node) => {
    const nActivity = rawDay.activities?.find(
      (na) => na?.arrivalTime === node.arrivalTime
    );

    return {
      time: node.arrivalTime,
      activity:
        nActivity?.activityName ||
        node.stop.candidate.activityLabel ||
        node.stop.candidate.name,
      description: nActivity?.description || node.stop.candidate.name,
    };
  });

  return {
    day: tDay.day,
    title: rawDay.title || tDay.title,
    activities,
  };
}

function narrativeDayToPartialData(day: NarrativeDay): PartialDayData {
  return {
    day: day.day,
    title: day.title,
    activities: day.activities.map((activity) => ({
      time: activity.node.arrivalTime,
      activity: activity.activityName,
      description: activity.description,
    })),
  };
}

function createStreamingDayEventStream(
  timelineDays: TimelineDay[],
  partialObjectStream: AsyncIterable<{
    days?: Array<{
      day?: number;
      title?: string;
      activities?: Array<{
        arrivalTime?: string;
        description?: string;
        activityName?: string;
      } | undefined>;
    } | undefined>;
  }>,
  finalOutput: Promise<NarrativeRendererOutput>
): AsyncIterable<StreamingDayEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      const emittedDays = new Set<number>();

      for await (const partial of partialObjectStream) {
        if (!partial.days) continue;

        for (const rawDay of partial.days) {
          if (!rawDay?.day) continue;

          const timelineDay = timelineDays.find((candidate) => candidate.day === rawDay.day);
          if (!timelineDay || emittedDays.has(rawDay.day)) {
            continue;
          }

          const expectedActivities = timelineDay.nodes.length;
          const activityCount = rawDay.activities?.filter(Boolean).length ?? 0;
          const isReady = Boolean(rawDay.title) && activityCount >= expectedActivities;

          if (!isReady) {
            continue;
          }

          emittedDays.add(rawDay.day);
          yield {
            day: rawDay.day,
            dayData: mergePartialDayToPartialData(timelineDay, rawDay),
            isComplete: true,
          };
        }
      }

      const finalNarrative = await finalOutput;
      for (const day of finalNarrative.days) {
        if (emittedDays.has(day.day)) {
          continue;
        }

        emittedDays.add(day.day);
        yield {
          day: day.day,
          dayData: narrativeDayToPartialData(day),
          isComplete: true,
        };
      }
    },
  };
}

function createFallbackDayStream(
  fallback: NarrativeRendererOutput
): AsyncIterable<StreamingDayEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const day of fallback.days) {
        yield {
          day: day.day,
          dayData: narrativeDayToPartialData(day),
          isComplete: true,
        };
      }
    },
  };
}

// ============================================
// Fallback (LLM failure)
// ============================================

export function buildFallbackNarrativeOutput(
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

async function resolveLanguageModel(provider: AIProviderName, modelName: string) {
  if (provider === 'openai') {
    const { openai } = await import('@ai-sdk/openai');
    return openai(modelName);
  }

  const { google } = await import('@ai-sdk/google');
  return google(modelName);
}
