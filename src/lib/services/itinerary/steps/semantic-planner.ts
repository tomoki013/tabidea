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
  temperature: number;
}

/**
 * Semantic Planner を実行して SemanticPlan を返す
 */
export async function runSemanticPlanner(
  input: SemanticPlannerInput
): Promise<SemanticPlan> {
  const { request, context, modelName, temperature } = input;

  // ユーザープロンプトを構築
  const userPrompt = buildSemanticPlannerPrompt(request);

  // Context Sandwich でシステムプロンプトを構築
  const { systemInstruction } = buildContextSandwich({
    context,
    userPrompt: '',
    generationType: 'semanticPlan',
  });

  // Gemini generateObject() で構造化出力（リトライ付き）
  const { google } = await import('@ai-sdk/google');
  const { generateObject } = await import('ai');

  let plan: SemanticPlanOutput;

  try {
    const result = await generateObject({
      model: google(modelName),
      schema: semanticPlanSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: 2,
    });
    plan = result.object;
  } catch (firstError) {
    // Fallback: 温度を上げて再試行
    console.warn(
      '[semantic-planner] First attempt failed, retrying with higher temperature:',
      firstError
    );

    try {
      const fallbackResult = await generateObject({
        model: google(modelName),
        schema: semanticPlanSchema,
        system: systemInstruction,
        prompt: userPrompt,
        temperature: Math.min(temperature + 0.3, 1.0),
        maxRetries: 2,
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
  const processed = buildSemanticPlanResult(plan, request);
  return processed;
}

// ============================================
// Post-processing
// ============================================

function buildSemanticPlanResult(
  plan: SemanticPlanOutput,
  request: NormalizedRequest
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

  return {
    destination: plan.destination,
    description: plan.description,
    candidates: mergedCandidates,
    dayStructure: plan.dayStructure,
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

function buildSemanticPlannerPrompt(request: NormalizedRequest): string {
  const destinations = request.destinations.join('、');
  const themes = request.themes.join('、');
  const paceMap = { relaxed: 'ゆったり', balanced: 'バランス', active: '充実' };
  const budgetMap = { budget: '格安', standard: '普通', premium: '少し贅沢', luxury: '贅沢' };

  const lang = request.outputLanguage === 'en' ? 'English' : '日本語';

  let prompt = `以下の条件で旅行プランの候補スポットを選定してください。

【旅行条件】
- 目的地: ${request.isDestinationDecided ? destinations : `未定 (${request.region})`}
- 日数: ${request.durationDays}日間
- 同行者: ${request.companions || '指定なし'}
- テーマ: ${themes}
- 予算: ${budgetMap[request.budgetLevel]}
- ペース: ${paceMap[request.pace]}
- 出力言語: ${lang}
`;

  if (request.travelVibe) {
    prompt += `- 旅の雰囲気: ${request.travelVibe}\n`;
  }

  if (request.freeText) {
    prompt += `- 補足: ${request.freeText}\n`;
  }

  if (request.mustVisitPlaces.length > 0) {
    prompt += `- 必ず訪れたい場所: ${request.mustVisitPlaces.join('、')}\n`;
  }

  if (request.fixedSchedule.length > 0) {
    prompt += `\n【予約済みスケジュール】\n`;
    for (const fs of request.fixedSchedule) {
      prompt += `- ${fs.type}: ${fs.name}`;
      if (fs.date) prompt += ` (${fs.date})`;
      if (fs.time) prompt += ` ${fs.time}`;
      prompt += '\n';
    }
  }

  prompt += `
【出力ルール】
1. 各日に半日なら4-6個、1日なら6-8個の候補スポットを提案してください
2. 各候補には以下を含めてください:
   - name: スポットの正式名称
   - role: must_visit(必須) / recommended(推奨) / meal(食事) / accommodation(宿泊) / filler(時間調整)
   - priority: 1-10の優先度 (10=最高)
   - dayHint: 推奨する日 (1-based)
   - timeSlotHint: 推奨する時間帯 (morning/midday/afternoon/evening/night/flexible)
   - stayDurationMinutes: 推奨滞在時間（分）
   - searchQuery: Google Places APIで検索するためのスポット正式名称
   - categoryHint: カテゴリ (temple, cafe, restaurant, park, museum, etc.)
   - locationEn: 英語での場所名
   - rationale: この候補を選んだ理由 (1文)
   - areaHint: エリア名 (例: "浅草エリア", "銀座周辺")
   - indoorOutdoor: 'indoor', 'outdoor', or 'both'
   - tags: 候補のタグ (例: ["写真映え", "静か"])

3. 最終的な時刻と順序は確定させないでください — それは後のステップで決定します
4. dayStructureで各日のメインエリア・宿泊地・概要を定義してください
5. 食事スポット（朝食・昼食・夕食）を各日に適切に含めてください
6. 必ず訪れたい場所は role: 'must_visit' として含めてください
7. tripIntentSummary: 旅の意図を1-2文でまとめてください
8. orderingPreferences: 順序に関する好みのリスト (例: ["寺社は午前中", "食事は地元の店"])
9. fallbackHints: 候補が不足した場合の補完ヒントリスト`;

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
