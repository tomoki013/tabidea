/**
 * Step 2: Semantic Planner
 * Gemini generateObject() で SemanticPlan を構造化出力
 * 候補スポットの意味的選定 — 最終時刻・順序は確定しない
 */

import type {
  NormalizedRequest,
  SemanticPlan,
  SemanticCandidate,
} from '@/types/itinerary-pipeline';
import type { Article } from '@/lib/services/ai/types';
import type { SemanticPlanOutput } from '@/lib/services/ai/schemas/compose-schemas';
import type { AIProviderName } from '@/lib/services/ai/providers/types';
import { semanticPlanSchema } from '@/lib/services/ai/schemas/compose-schemas';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import { PipelineStepError } from '../errors';

// ============================================
// Public API
// ============================================

export interface SemanticPlannerInput {
  request: NormalizedRequest;
  context: Article[];
  modelName: string;
  provider?: AIProviderName;
  temperature: number;
  retryOnFailure?: boolean;
  targetCandidateCount?: number;
  fastMode?: boolean;
  onProgress?: (message: string) => void;
}

/**
 * Semantic Planner を実行して SemanticPlan を返す
 */
export async function runSemanticPlanner(
  input: SemanticPlannerInput
): Promise<SemanticPlan> {
  const {
    request,
    context,
    modelName,
    provider = 'gemini',
    temperature,
    retryOnFailure = true,
    targetCandidateCount,
    fastMode = false,
    onProgress,
  } = input;

  onProgress?.('候補条件を整理中...');

  // ユーザープロンプトを構築
  const userPrompt = buildSemanticPlannerPrompt(request, targetCandidateCount, fastMode);

  // Context Sandwich でシステムプロンプトを構築
  const { systemInstruction } = buildContextSandwich({
    context,
    userPrompt: '',
    generationType: 'semanticPlan',
  });

  // Gemini generateObject() で構造化出力（リトライ付き）
  const { generateObject } = await import('ai');
  const model = await resolveLanguageModel(provider, modelName);

  let plan: SemanticPlanOutput;
  const primaryRetries = retryOnFailure ? 1 : 0;

  try {
    onProgress?.('AIが候補スポットを選定中...');
    const result = await generateObject({
      model,
      schema: semanticPlanSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: primaryRetries,
    });
    plan = result.object;
  } catch (firstError) {
    if (!retryOnFailure) {
      throw new PipelineStepError(
        'semantic_plan',
        `Semantic planner failed: ${firstError instanceof Error ? firstError.message : 'Unknown error'}`,
        firstError
      );
    }

    // Fallback: 温度を上げて再試行
    console.warn(
      '[semantic-planner] First attempt failed, retrying with higher temperature:',
      firstError
    );

    try {
      const fallbackResult = await generateObject({
        model,
        schema: semanticPlanSchema,
        system: systemInstruction,
        prompt: userPrompt,
        temperature: Math.min(temperature + 0.3, 1.0),
        maxRetries: 0,
      });
      plan = fallbackResult.object;
    } catch (secondError) {
      throw new PipelineStepError(
        'semantic_plan',
        `Semantic planner failed after retry: ${secondError instanceof Error ? secondError.message : 'Unknown error'}`,
        secondError
      );
    }
  }

  // Post-processing
  onProgress?.('候補スポットを整形中...');
  const processed = buildSemanticPlanResult(plan, request, targetCandidateCount);
  return processed;
}

// ============================================
// Post-processing
// ============================================

function buildSemanticPlanResult(
  plan: SemanticPlanOutput,
  request: NormalizedRequest,
  targetCandidateCount?: number
): SemanticPlan {
  // dayHint: 0 → 1 に clamp, semanticId を付与
  const clampedCandidates = plan.candidates.map((c) => ({
    ...c,
    dayHint: Math.max(c.dayHint, 1),
    priority: Math.max(c.priority, 1),
    semanticId: crypto.randomUUID(),
  }));

  // mustVisitPlaces を role: 'must_visit' で追加・マージ
  const mergedCandidates = mergeMustVisitPlaces(
    clampedCandidates,
    request.mustVisitPlaces,
    request.durationDays
  );
  const limitedCandidates = limitCandidates(mergedCandidates, targetCandidateCount);
  const constrainedDayStructure = applyHotelConstraintsToDayStructure(
    plan.dayStructure,
    request
  );

  return {
    destination: plan.destination,
    description: plan.description,
    candidates: limitedCandidates,
    dayStructure: constrainedDayStructure,
    themes: plan.themes,
    // v3 追加フィールド
    tripIntentSummary: plan.tripIntentSummary,
    orderingPreferences: plan.orderingPreferences,
    fallbackHints: plan.fallbackHints,
  };
}

// ============================================
// Prompt construction
// ============================================

function buildSemanticPlannerPrompt(
  request: NormalizedRequest,
  targetCandidateCount?: number,
  fastMode: boolean = false
): string {
  const destinations = request.destinations.join('、');
  const themes = request.softPreferences.themes.join('、');
  const paceMap = { relaxed: 'ゆったり', balanced: 'バランス', active: '充実' };
  const budgetMap = { budget: '格安', standard: '普通', premium: '少し贅沢', luxury: '贅沢' };

  const lang = request.outputLanguage === 'en' ? 'English' : '日本語';
  const suggestedCandidateCount = targetCandidateCount ?? calculateCandidateTarget(request);
  const perDayTarget = Math.max(3, Math.ceil(suggestedCandidateCount / Math.max(request.durationDays, 1)));

  let prompt = `旅行条件に合う候補スポット案を構造化して返してください。

条件:
- 目的地: ${request.isDestinationDecided ? destinations : `未定 (${request.region})`}
- 日数: ${request.durationDays}日間
- 同行者: ${request.companions || '指定なし'}
- テーマ: ${themes}
- 予算: ${budgetMap[request.budgetLevel]}
- ペース: ${paceMap[request.pace]}
- 出力言語: ${lang}
- 候補総数の目安: ${suggestedCandidateCount}件以内
- 1日あたりの目安: ${perDayTarget}〜${perDayTarget + 1}件
`;

  if (request.softPreferences.travelVibe) {
    prompt += `- 旅の雰囲気: ${request.softPreferences.travelVibe}\n`;
  }

  if (request.hardConstraints.summaryLines.length > 0) {
    prompt += `\n必ず守る条件:\n`;
    for (const line of request.hardConstraints.summaryLines) {
      prompt += `- ${line}\n`;
    }
  }

  const softSummaryLines = [
    ...request.softPreferences.rankedRequests.map((preference) => `希望: ${preference}`),
    `予算感: ${budgetMap[request.budgetLevel]}`,
    `旅のペース: ${paceMap[request.pace]}`,
  ];
  if (softSummaryLines.length > 0) {
    prompt += `\n参考にする希望:\n`;
    for (const line of softSummaryLines) {
      prompt += `- ${line}\n`;
    }
  }

  if (request.fixedSchedule.length > 0) {
    prompt += `\n予約済み:\n`;
    for (const fs of request.fixedSchedule) {
      prompt += `- ${fs.type}: ${fs.name}`;
      if (fs.date) prompt += ` (${fs.date})`;
      if (fs.time) prompt += ` ${fs.time}`;
      prompt += '\n';
    }
  }

  prompt += `
出力ルール:
1. candidates には name, role, priority, dayHint, timeSlotHint, stayDurationMinutes, searchQuery を必ず含める
2. 可能なら categoryHint, locationEn, rationale, areaHint, indoorOutdoor, tags も含める
3. dayStructure には各日の title, mainArea, overnightLocation, summary を入れる
4. 必ず訪れたい場所は role='must_visit' にする
5. 時刻と最終順序は確定しない
6. tripIntentSummary, orderingPreferences, fallbackHints を短く入れる
7. 説明文は簡潔にする
8. 絶対条件は必ず守る
9. 参考条件は全てを機械的に盛り込まず、全体のまとまりを優先して良い感じに反映する`;

  if (fastMode) {
    prompt += `\n10. 速度優先。エリアの重複を避け、候補は厳選してください`;
  }

  return prompt;
}

// ============================================
// Must-visit merging
// ============================================

function mergeMustVisitPlaces(
  candidates: SemanticCandidate[],
  mustVisitPlaces: string[],
  durationDays: number
): SemanticCandidate[] {
  if (mustVisitPlaces.length === 0) return candidates;

  const result = [...candidates];
  const existingNames = new Set(candidates.map((c) => c.searchQuery.toLowerCase()));

  for (const place of mustVisitPlaces) {
    if (existingNames.has(place.toLowerCase())) {
      // 既存候補の role を must_visit に更新
      const existing = result.find(
        (c) => c.searchQuery.toLowerCase() === place.toLowerCase()
      );
      if (existing) {
        existing.role = 'must_visit';
        existing.priority = 10;
      }
    } else {
      // 新規追加
      result.push({
        name: place,
        role: 'must_visit',
        priority: 10,
        dayHint: Math.min(Math.ceil(result.length / 6) + 1, durationDays),
        timeSlotHint: 'flexible',
        stayDurationMinutes: 60,
        searchQuery: place,
        locationEn: undefined,
        semanticId: crypto.randomUUID(),
      });
    }
  }

  return result;
}

function calculateCandidateTarget(request: NormalizedRequest): number {
  const perDay = request.durationDays >= 4 ? 5 : 6;
  const minimum = request.hardConstraints.mustVisitPlaces.length + request.durationDays * 2;
  return Math.max(minimum, Math.min(request.durationDays * perDay, 20));
}

function limitCandidates(
  candidates: SemanticCandidate[],
  targetCandidateCount?: number
): SemanticCandidate[] {
  if (!targetCandidateCount || candidates.length <= targetCandidateCount) {
    return candidates;
  }

  const mustVisit = candidates.filter((candidate) => candidate.role === 'must_visit');
  const others = candidates
    .filter((candidate) => candidate.role !== 'must_visit')
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }
      return left.dayHint - right.dayHint;
    });

  const remainingSlots = Math.max(targetCandidateCount - mustVisit.length, 0);
  return [...mustVisit, ...others.slice(0, remainingSlots)];
}

function applyHotelConstraintsToDayStructure(
  dayStructure: SemanticPlan['dayStructure'],
  request: NormalizedRequest
): SemanticPlan['dayStructure'] {
  if (request.hardConstraints.fixedHotels.length === 0) {
    return dayStructure;
  }

  return dayStructure.map((day) => {
    const bookedHotel = request.hardConstraints.fixedHotels.find((hotel) => {
      const startDay = hotel.startDay ?? day.day;
      const endDay = hotel.endDay ?? startDay;
      return day.day >= startDay && day.day <= endDay;
    });

    if (!bookedHotel) {
      return day;
    }

    return {
      ...day,
      overnightLocation: bookedHotel.name,
    };
  });
}

async function resolveLanguageModel(provider: AIProviderName, modelName: string) {
  if (provider === 'openai') {
    const { openai } = await import('@ai-sdk/openai');
    return openai(modelName);
  }

  const { google } = await import('@ai-sdk/google');
  return google(modelName);
}
