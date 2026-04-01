import type { LanguageModelV1 } from 'ai';
import type { PartialDayData } from '@/types';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { narrativeOutputSchema } from '@/lib/services/ai/schemas/compose-schemas';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import { NARRATIVE_EXPERTISE_RULES } from '@/lib/services/ai/prompts/travel-expertise';
import type { Article } from '@/lib/services/ai/types';
import type { AIProviderName } from '@/lib/services/ai/providers/types';

export interface V4NarrativeActivity {
  draftId: string;
  arrivalTime: string;
  departureTime: string;
  activityName: string;
  placeName: string;
  role: string;
}

export interface V4NarrativeDay {
  day: number;
  title: string;
  overnightLocation: string;
  startTime: string;
  activities: V4NarrativeActivity[];
}

export interface V4NarrativeRendererInput {
  days: V4NarrativeDay[];
  request: NormalizedRequest;
  context: Article[];
  modelName: string;
  provider?: AIProviderName;
  temperature: number;
  model?: LanguageModelV1;
}

export interface V4NarrativeDayOutput {
  day: number;
  title: string;
  activities: Array<{
    draftId: string;
    arrivalTime: string;
    description: string;
    activityName: string;
  }>;
}

export interface V4NarrativeRendererOutput {
  description: string;
  days: V4NarrativeDayOutput[];
}

export interface StreamingDayEvent {
  day: number;
  dayData: PartialDayData;
  isComplete: boolean;
}

export interface NarrativeStreamResult {
  dayStream: AsyncIterable<StreamingDayEvent>;
  finalOutput: Promise<V4NarrativeRendererOutput>;
}

export async function runNarrativeRendererV4(
  input: V4NarrativeRendererInput,
): Promise<V4NarrativeRendererOutput> {
  const { modelName, provider = 'gemini', temperature } = input;
  const { systemInstruction, userPrompt } = buildNarrativeInstructions(input);
  const { generateObject } = await import('ai');
  const model = input.model ?? await resolveLanguageModel(provider, modelName);

  const result = await generateObject({
    model,
    schema: narrativeOutputSchema,
    system: systemInstruction,
    prompt: userPrompt,
    temperature,
    maxRetries: 1,
  });

  return mergeNarrativeOutput(input.days, result.object.description, result.object.days);
}

export async function streamNarrativeRendererV4(
  input: V4NarrativeRendererInput,
): Promise<NarrativeStreamResult> {
  const { modelName, provider = 'gemini', temperature } = input;
  const { systemInstruction, userPrompt } = buildNarrativeInstructions(input);
  const { streamObject } = await import('ai');
  const model = input.model ?? await resolveLanguageModel(provider, modelName);

  const result = await streamObject({
    model,
    schema: narrativeOutputSchema,
    system: systemInstruction,
    prompt: userPrompt,
    temperature,
    maxRetries: 1,
  });

  const finalOutput = result.object.then((output) =>
    mergeNarrativeOutput(input.days, output.description, output.days),
  );

  return {
    dayStream: createStreamingDayEventStream(
      input.days,
      result.partialObjectStream,
      finalOutput,
    ),
    finalOutput,
  };
}

function buildNarrativeInstructions(
  input: V4NarrativeRendererInput,
): { userPrompt: string; systemInstruction: string } {
  const userPrompt = buildNarrativePrompt(input.days, input.request);
  const { systemInstruction } = buildContextSandwich({
    context: input.context,
    userPrompt: '',
    generationType: 'narrativeRender',
  });

  return { userPrompt, systemInstruction };
}

function buildNarrativePrompt(
  days: V4NarrativeDay[],
  request: NormalizedRequest,
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

  for (const day of days) {
    prompt += `\n--- Day ${day.day}: ${day.title} ---\n`;
    if (day.startTime) {
      prompt += `開始時刻: ${day.startTime}\n`;
    }
    for (const activity of day.activities) {
      prompt += `${activity.arrivalTime}-${activity.departureTime} | ${activity.activityName} (${activity.placeName}) [${activity.role}]\n`;
    }
  }

  prompt += `
【出力ルール】
1. 各アクティビティに1-2文の生き生きとした説明文を付けてください
2. 各日の説明は「どの順で回る日なのか」が伝わる itinerary 的な流れを重視してください
3. 各日にその日の見どころを反映したタイトルを付けてください
4. 観光スポットの百科事典的な解説ではなく、「この時間にここへ行く理由」が分かる説明にしてください
5. 前後のスポットとのつながりや時間帯の自然さが感じられる文にしてください
6. 全体の旅程を1-2文で紹介する description を生成してください
7. 時刻・順序・場所は変更しないでください
8. arrivalTime は入力データと完全に一致させてください
9. 文を途中で切らず、各 description は完結した自然な文章で終える（「...」「…」で終わらない）
${NARRATIVE_EXPERTISE_RULES}`;

  return prompt;
}

function mergeNarrativeOutput(
  days: V4NarrativeDay[],
  description: string,
  rawDays: Array<{
    day: number;
    title: string;
    activities: Array<{
      arrivalTime: string;
      description: string;
      activityName: string;
    }>;
  }>,
): V4NarrativeRendererOutput {
  return {
    description,
    days: days.map((timelineDay) => {
      const rawDay = rawDays.find((candidate) => candidate.day === timelineDay.day);
      return {
        day: timelineDay.day,
        title: rawDay?.title ?? timelineDay.title,
        activities: timelineDay.activities.map((activity) => {
          const rawActivity = rawDay?.activities.find(
            (candidate) => candidate.arrivalTime === activity.arrivalTime,
          );
          return {
            draftId: activity.draftId,
            arrivalTime: activity.arrivalTime,
            description: rawActivity?.description ?? activity.activityName,
            activityName: rawActivity?.activityName ?? activity.activityName,
          };
        }),
      };
    }),
  };
}

function toPartialDayData(day: V4NarrativeDayOutput): PartialDayData {
  return {
    day: day.day,
    title: day.title,
    activities: day.activities.map((activity) => ({
      time: activity.arrivalTime,
      activity: activity.activityName,
      description: activity.description,
    })),
  };
}

function createStreamingDayEventStream(
  timelineDays: V4NarrativeDay[],
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
  finalOutput: Promise<V4NarrativeRendererOutput>,
): AsyncIterable<StreamingDayEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      const emittedDays = new Set<number>();

      for await (const partial of partialObjectStream) {
        if (!partial.days) {
          continue;
        }

        for (const rawDay of partial.days) {
          if (!rawDay?.day) {
            continue;
          }

          const timelineDay = timelineDays.find((candidate) => candidate.day === rawDay.day);
          if (!timelineDay || emittedDays.has(rawDay.day)) {
            continue;
          }

          const expectedActivities = timelineDay.activities.length;
          const activityCount = rawDay.activities?.filter(Boolean).length ?? 0;
          const isReady = Boolean(rawDay.title) && activityCount >= expectedActivities;
          if (!isReady) {
            continue;
          }

          emittedDays.add(rawDay.day);
          yield {
            day: rawDay.day,
            dayData: {
              day: rawDay.day,
              title: rawDay.title,
              activities: timelineDay.activities.map((activity) => {
                const rawActivity = rawDay.activities?.find(
                  (candidate) => candidate?.arrivalTime === activity.arrivalTime,
                );
                return {
                  time: activity.arrivalTime,
                  activity: rawActivity?.activityName ?? activity.activityName,
                  description: rawActivity?.description ?? activity.activityName,
                };
              }),
            },
            isComplete: true,
          };
        }
      }

      const resolved = await finalOutput;
      for (const day of resolved.days) {
        if (emittedDays.has(day.day)) {
          continue;
        }

        emittedDays.add(day.day);
        yield {
          day: day.day,
          dayData: toPartialDayData(day),
          isComplete: true,
        };
      }
    },
  };
}

export async function resolveLanguageModel(provider: AIProviderName, modelName: string) {
  if (provider === 'openai') {
    const { openai } = await import('@ai-sdk/openai');
    return openai(modelName);
  }

  const { google } = await import('@ai-sdk/google');
  return google(modelName);
}
