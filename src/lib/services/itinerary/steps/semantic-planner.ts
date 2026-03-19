/**
 * Step 2: Semantic Planner
 * Gemini generateObject() で SemanticPlan を構造化出力
 * 候補スポットの意味的選定 — 最終時刻・順序は確定しない
 */

import type {
  NormalizedRequest,
  SemanticPlan,
  SemanticCandidate,
  DestinationHighlight,
} from '@/types/itinerary-pipeline';
import type { Article } from '@/lib/services/ai/types';
import type {
  SemanticDayPlanOutput,
  SemanticPlanOutput,
  SemanticSeedOutput,
} from '@/lib/services/ai/schemas/compose-schemas';
import type { AIProviderName } from '@/lib/services/ai/providers/types';
import {
  semanticDayPlanSchema,
  semanticPlanSchema,
  semanticSeedSchema,
} from '@/lib/services/ai/schemas/compose-schemas';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import { PipelineStepError } from '../errors';
import {
  assignHighlightDaysFromAreas,
  buildDestinationHighlightPromptSections,
  mergeDestinationHighlightCandidates,
  normalizePlaceKey,
} from '../destination-highlights';

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

export interface SemanticSeedPlannerInput {
  request: NormalizedRequest;
  context: Article[];
  modelName: string;
  provider?: AIProviderName;
  temperature: number;
  onProgress?: (message: string) => void;
}

export interface SemanticSeedPlan {
  destination: string;
  description: string;
  dayStructure: SemanticPlan['dayStructure'];
  themes?: string[];
  tripIntentSummary?: string;
  orderingPreferences?: string[];
  fallbackHints?: string[];
  destinationHighlights?: DestinationHighlight[];
}

export interface SemanticDayPlannerInput {
  request: NormalizedRequest;
  seed: SemanticSeedPlan;
  context: Article[];
  modelName: string;
  provider?: AIProviderName;
  temperature: number;
  day: number;
  targetCandidateCount: number;
  existingCandidates?: SemanticCandidate[];
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

  // Validate that all candidates have specific, non-generic names
  const genericPatterns = [
    /の人気.+店$/,
    /の人気.+スポット$/,
    /のおすすめ/,
  /^おすすめ.+$/,
  /^人気.+$/,
    /の代表スポット$/,
    /の夜景スポット$/,
    /の有名.+店$/,
    /周辺の.+スポット$/,
    /popular\s+(lunch|dinner|restaurant|spot)/i,
    /recommended\s+(restaurant|cafe|spot)/i,
  ];

  const invalidCandidates = processed.candidates.filter((c) =>
    genericPatterns.some((pattern) => pattern.test(c.name) || pattern.test(c.searchQuery))
  );

  if (invalidCandidates.length > 0) {
    console.warn(
      '[semantic-planner] Rejecting generic spot names:',
      invalidCandidates.map((c) => c.name)
    );
    // Filter out generic candidates instead of failing entirely
    processed.candidates = processed.candidates.filter(
      (c) => !genericPatterns.some((pattern) => pattern.test(c.name) || pattern.test(c.searchQuery))
    );

    // If too many candidates were filtered out, fail
    if (processed.candidates.length < processed.dayStructure.length) {
      throw new PipelineStepError(
        'semantic_plan',
        'AIが具体的なスポット名を生成できませんでした。もう一度お試しください。'
      );
    }
  }

  return processed;
}

export async function runSemanticSeedPlanner(
  input: SemanticSeedPlannerInput
): Promise<SemanticSeedPlan> {
  const {
    request,
    context,
    modelName,
    provider = 'gemini',
    temperature,
    onProgress,
  } = input;

  onProgress?.('旅の骨格を設計中...');

  const { systemInstruction } = buildContextSandwich({
    context,
    userPrompt: '',
    generationType: 'semanticPlan',
  });

  const { generateObject } = await import('ai');
  const model = await resolveLanguageModel(provider, modelName);

  const result = await generateObject({
    model,
    schema: semanticSeedSchema,
    system: systemInstruction,
    prompt: buildSemanticSeedPrompt(request),
    temperature,
    maxRetries: 0,
  });

  const seed = result.object as SemanticSeedOutput;

  const constrainedDayStructure = applyHotelConstraintsToDayStructure(seed.dayStructure, request);

  return {
    destination: seed.destination,
    description: seed.description,
    dayStructure: constrainedDayStructure,
    themes: seed.themes,
    tripIntentSummary: seed.tripIntentSummary,
    orderingPreferences: seed.orderingPreferences,
    fallbackHints: seed.fallbackHints,
    destinationHighlights: assignHighlightDaysFromAreas(
      seed.destinationHighlights,
      constrainedDayStructure
    ),
  };
}

export function buildDeterministicSemanticSeedPlan(
  request: NormalizedRequest
): SemanticSeedPlan {
  const destination = buildSeedDestinationLabel(request);
  const themes = request.softPreferences.themes.slice(0, 4);
  const mustVisitPlaces = request.mustVisitPlaces.slice(0, 6);
  const dailyAreas = buildDailyAreas(request, destination);
  const dayStructure = dailyAreas.map((area, index) =>
    buildDeterministicDayStructure({
      request,
      area,
      day: index + 1,
      totalDays: dailyAreas.length,
      mustVisitPlaces,
    })
  );

  const highlightedPlaces = mustVisitPlaces.map((place, index) => ({
    name: place,
    searchQuery: place,
    areaHint: dayStructure[index % dayStructure.length]?.mainArea ?? destination,
    dayHint: (index % dayStructure.length) + 1,
    rationale: request.outputLanguage === 'en'
      ? 'Must-visit place requested by the traveler.'
      : 'ユーザーが必ず訪れたい場所として指定。',
    timeSlotHint: index % 3 === 0 ? 'morning' : index % 3 === 1 ? 'afternoon' : 'evening' as const,
    stayDurationMinutes: 90,
  }));

  const constrainedDayStructure = applyHotelConstraintsToDayStructure(dayStructure, request);

  return {
    destination,
    description: buildSeedDescription(request, destination, themes),
    dayStructure: constrainedDayStructure,
    themes: themes.length > 0 ? themes : undefined,
    tripIntentSummary: buildTripIntentSummary(request, destination, themes),
    orderingPreferences: buildOrderingPreferences(request),
    fallbackHints: buildFallbackHints(request, destination),
    destinationHighlights: highlightedPlaces.length > 0
      ? assignHighlightDaysFromAreas(highlightedPlaces, constrainedDayStructure)
      : undefined,
  };
}

export async function runSemanticDayPlanner(
  input: SemanticDayPlannerInput
): Promise<SemanticCandidate[]> {
  const {
    request,
    seed,
    context,
    modelName,
    provider = 'gemini',
    temperature,
    day,
    targetCandidateCount,
    existingCandidates = [],
    onProgress,
  } = input;

  const currentDayStructure = seed.dayStructure.find((item) => item.day === day);
  if (!currentDayStructure) {
    throw new PipelineStepError('semantic_plan', `Day ${day} structure is missing`);
  }

  onProgress?.(`${day}日目の候補スポットを編集中...`);

  const { systemInstruction } = buildContextSandwich({
    context,
    userPrompt: '',
    generationType: 'semanticPlan',
  });

  const { generateObject } = await import('ai');
  const model = await resolveLanguageModel(provider, modelName);

  const result = await generateObject({
    model,
    schema: semanticDayPlanSchema,
    system: systemInstruction,
    prompt: buildSemanticDayPrompt({
      request,
      seed,
      currentDayStructure,
      existingCandidates,
      day,
      targetCandidateCount,
    }),
    temperature,
    maxRetries: 0,
  });

  return sanitizeSemanticCandidates(
    result.object as SemanticDayPlanOutput,
    request,
    day,
    existingCandidates,
    seed.destinationHighlights
  );
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
  const constrainedDayStructure = applyHotelConstraintsToDayStructure(
    plan.dayStructure,
    request
  );
  const destinationHighlights = assignHighlightDaysFromAreas(
    plan.destinationHighlights,
    constrainedDayStructure
  );
  const groundedCandidates = mergeDestinationHighlightCandidates({
    request,
    destinationHighlights,
    candidates: mergedCandidates,
  });
  const limitedCandidates = limitCandidates(groundedCandidates, targetCandidateCount);

  return {
    destination: plan.destination,
    description: plan.description,
    candidates: limitedCandidates,
    dayStructure: constrainedDayStructure,
    themes: plan.themes,
    destinationHighlights,
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
4. 可能なら dayStructure に startArea, endArea, flowSummary, anchorMoments も入れ、その日をどう移動しながら過ごすかが分かる形にする
5. 必ず訪れたい場所は role='must_visit' にする
6. 時刻と最終順序は確定しない
7. tripIntentSummary, orderingPreferences, fallbackHints を短く入れる
8. destinationHighlights には、その都市らしさを感じる具体的な代表スポットを 3〜6 件入れる
9. 説明文は簡潔にする
10. 絶対条件は必ず守る
11. 参考条件は全てを機械的に盛り込まず、全体のまとまりを優先して良い感じに反映する
12. 【最重要】name/searchQuery/destinationHighlights.name には必ず実在する具体的なスポット名・店名を入れること。「人気ランチ店」「おすすめカフェ」「代表スポット」「夜景スポット」のような曖昧・総称的な名前は絶対に禁止
13. destinationHighlights には「この目的地に来たのに入っていないと不自然になりやすい場所」を優先して入れること
14. 候補は単なる名所の羅列ではなく、朝→昼→夕方の流れが見える“1日の回遊プラン”として組み立てること`;

  if (fastMode) {
    prompt += `\n15. 速度優先。エリアの重複を避け、候補は厳選してください`;
  }

  return prompt;
}

function buildSemanticSeedPrompt(request: NormalizedRequest): string {
  const destinations = request.destinations.join('、');
  const themes = request.softPreferences.themes.join('、');
  const paceMap = { relaxed: 'ゆったり', balanced: 'バランス', active: '充実' };
  const budgetMap = { budget: '格安', standard: '普通', premium: '少し贅沢', luxury: '贅沢' };
  const lang = request.outputLanguage === 'en' ? 'English' : '日本語';

  let prompt = `旅行条件をもとに、旅程の骨格だけを軽量に設計してください。

条件:
- 目的地: ${request.isDestinationDecided ? destinations : `未定 (${request.region})`}
- 日数: ${request.durationDays}日間
- 同行者: ${request.companions || '指定なし'}
- テーマ: ${themes}
- 予算: ${budgetMap[request.budgetLevel]}
- ペース: ${paceMap[request.pace]}
- 出力言語: ${lang}

出力ルール:
1. candidates は出力しない
2. destination, description, dayStructure を必ず返す
3. dayStructure には各日の title, mainArea, overnightLocation, summary を入れる
4. 可能なら startArea, endArea, flowSummary, anchorMoments も入れ、「どんな順で回る日か」が伝わる骨格にする
5. 各日の mainArea は移動しすぎず現実的にまとめる
6. 説明は短く、旅の期待感が高まる自然な文にする
7. orderingPreferences と fallbackHints は短い箇条書きでよい
8. destinationHighlights には、その都市らしさを感じる具体的な代表スポットを 3〜6 件入れる
9. destinationHighlights の各要素には name, areaHint, dayHint, rationale を入れる`;

  if (request.hardConstraints.summaryLines.length > 0) {
    prompt += `\n\n必ず守る条件:\n${request.hardConstraints.summaryLines.map((line) => `- ${line}`).join('\n')}`;
  }

  if (request.softPreferences.rankedRequests.length > 0) {
    prompt += `\n\n参考にする希望:\n${request.softPreferences.rankedRequests.map((line) => `- ${line}`).join('\n')}`;
  }

  prompt += `\n\n10. 旅のテーマと矛盾しない範囲で、その都市を代表する定番名所を少なくともいくつか骨格に含める`;
  prompt += `\n11. 各 dayStructure は「朝はどこから始め、どこへ流れて、夜はどこで締めるか」が分かる itinerary らしい設計にする`;

  return prompt;
}

function buildSeedDestinationLabel(request: NormalizedRequest): string {
  if (request.destinations.length > 0) {
    return request.destinations.join('・');
  }

  return request.outputLanguage === 'en'
    ? `${request.region} trip`
    : `${request.region}の旅`;
}

function buildDailyAreas(request: NormalizedRequest, fallbackDestination: string): string[] {
  const fromHotels = request.fixedSchedule
    .filter((item) => item.type === 'hotel')
    .map((item) => item.location?.trim() || item.title?.trim())
    .filter((value): value is string => Boolean(value));
  const sourceAreas = [...request.destinations, ...fromHotels];

  if (sourceAreas.length === 0) {
    return Array.from({ length: request.durationDays }, () => fallbackDestination);
  }

  return Array.from({ length: request.durationDays }, (_, index) => {
    return sourceAreas[Math.min(index, sourceAreas.length - 1)] ?? fallbackDestination;
  });
}

function buildDeterministicDayStructure(input: {
  request: NormalizedRequest;
  area: string;
  day: number;
  totalDays: number;
  mustVisitPlaces: string[];
}): SemanticPlan['dayStructure'][number] {
  const { request, area, day, totalDays, mustVisitPlaces } = input;
  const slotLabel = request.outputLanguage === 'en'
    ? `Day ${day}`
    : `${day}日目`;
  const opening = day === 1
    ? request.outputLanguage === 'en' ? 'Start gently' : '朝は無理なく始めて'
    : request.outputLanguage === 'en' ? 'Build momentum' : '朝から流れよく巡って';
  const ending = day === totalDays
    ? request.outputLanguage === 'en' ? 'wrap up the trip.' : '旅を気持ちよく締めくくる。'
    : request.outputLanguage === 'en' ? 'settle in for the evening.' : '夜は落ち着いて締める。';
  const assignedMustVisit = mustVisitPlaces.filter((_, index) => index % totalDays === day - 1).slice(0, 2);

  return {
    day,
    title: request.outputLanguage === 'en'
      ? `${slotLabel}: ${area}`
      : `${slotLabel}：${area}を中心に過ごす日`,
    mainArea: area,
    startArea: area,
    endArea: area,
    overnightLocation: area,
    summary: request.outputLanguage === 'en'
      ? `${opening} explore ${area} as the core area and ${ending}`
      : `${opening}${area}を中心に巡り、${ending}`,
    flowSummary: request.outputLanguage === 'en'
      ? `Morning in ${area}, midday around key spots, evening near ${area}.`
      : `朝は${area}周辺から始め、昼は見どころを回り、夜は${area}近くで締める流れ。`,
    anchorMoments: assignedMustVisit.length > 0
      ? assignedMustVisit
      : request.outputLanguage === 'en'
        ? [`Morning in ${area}`, `Afternoon highlights`, `Evening wind-down`]
        : [`朝は${area}を散策`, '昼は見どころを体験', '夜はゆったり締める'],
  };
}

function buildSeedDescription(
  request: NormalizedRequest,
  destination: string,
  themes: string[]
): string {
  const themeSummary = themes.length > 0
    ? themes.slice(0, 2).join(request.outputLanguage === 'en' ? ', ' : '・')
    : request.outputLanguage === 'en'
      ? 'local highlights'
      : 'その土地らしい見どころ';

  return request.outputLanguage === 'en'
    ? `${destination} itinerary centered on ${themeSummary}, paced for a ${request.companions || 'traveler'} trip.`
    : `${destination}で${themeSummary}を軸に、${request.companions || '旅行者'}でも動きやすい流れに整えた旅程です。`;
}

function buildTripIntentSummary(
  request: NormalizedRequest,
  destination: string,
  themes: string[]
): string {
  const themeSummary = themes.length > 0
    ? themes.slice(0, 3).join(request.outputLanguage === 'en' ? ', ' : '・')
    : request.outputLanguage === 'en'
      ? 'the best local highlights'
      : 'その土地らしい見どころ';

  return request.outputLanguage === 'en'
    ? `${request.durationDays}-day trip in ${destination} focused on ${themeSummary}.`
    : `${destination}で${themeSummary}を楽しむ${request.durationDays}日間の旅。`;
}

function buildOrderingPreferences(request: NormalizedRequest): string[] | undefined {
  const entries: string[] = [];

  if (request.outputLanguage === 'en') {
    entries.push(request.pace === 'relaxed' ? 'Keep transitions gentle.' : 'Keep the day moving smoothly.');
    if (request.fixedSchedule.some((item) => item.type === 'hotel')) {
      entries.push('Stay anchored around booked hotels.');
    }
    if (request.mustVisitPlaces.length > 0) {
      entries.push('Place must-visit spots early enough to avoid missing them.');
    }
  } else {
    entries.push(request.pace === 'relaxed' ? '移動を詰め込みすぎず、余白を残す。' : '流れよく回れる順序を優先する。');
    if (request.fixedSchedule.some((item) => item.type === 'hotel')) {
      entries.push('予約済みホテルを起点・終点に寄せる。');
    }
    if (request.mustVisitPlaces.length > 0) {
      entries.push('必ず行きたい場所は取りこぼさないよう前寄せで配置する。');
    }
  }

  return entries.length > 0 ? entries : undefined;
}

function buildFallbackHints(
  request: NormalizedRequest,
  destination: string
): string[] | undefined {
  const hints = request.outputLanguage === 'en'
    ? [
      `Prefer walkable alternatives around ${destination}.`,
      'Use a cafe or viewpoint as a low-risk filler if a slot opens.',
    ]
    : [
      `${destination}周辺で徒歩移動しやすい候補を優先する。`,
      '空き時間が出たらカフェや展望スポットで調整する。',
    ];

  return hints;
}

function buildSemanticDayPrompt(input: {
  request: NormalizedRequest;
  seed: SemanticSeedPlan;
  currentDayStructure: SemanticPlan['dayStructure'][number];
  existingCandidates: SemanticCandidate[];
  day: number;
  targetCandidateCount: number;
}): string {
  const { request, seed, currentDayStructure, existingCandidates, day, targetCandidateCount } = input;
  const alreadyChosen = existingCandidates.map((candidate) => candidate.searchQuery).slice(-12);
  const mustVisitForDay = request.mustVisitPlaces.filter((_, index) =>
    index % Math.max(request.durationDays, 1) === (day - 1)
  );
  const highlightSections = buildDestinationHighlightPromptSections({
    destinationHighlights: seed.destinationHighlights,
    durationDays: request.durationDays,
    day,
    existingCandidates,
  });

  return `旅行条件に合う ${day}日目 の候補スポットだけを構造化して返してください。

旅の全体像:
- 目的地: ${seed.destination}
- 旅の説明: ${seed.description}
- 日数: ${request.durationDays}日間
- 出力言語: ${request.outputLanguage === 'en' ? 'English' : '日本語'}

${day}日目の設計:
- タイトル: ${currentDayStructure.title}
- メインエリア: ${currentDayStructure.mainArea}
- 開始エリア: ${currentDayStructure.startArea || currentDayStructure.mainArea}
- 終了エリア: ${currentDayStructure.endArea || currentDayStructure.overnightLocation}
- 宿泊地: ${currentDayStructure.overnightLocation}
- 概要: ${currentDayStructure.summary}
- 日内フロー: ${currentDayStructure.flowSummary || '未指定'}
- 時間帯アンカー: ${currentDayStructure.anchorMoments?.join(' / ') || '未指定'}
- 候補件数の目安: ${targetCandidateCount}件

この旅行で代表スポットとして押さえたい場所（AIが骨格段階で選んだもの）:
${highlightSections.allHighlightsSection}

まだこの日に入っていない代表スポット:
${highlightSections.remainingHighlightsSection}

既に他の日で採用した候補:
${alreadyChosen.length > 0 ? alreadyChosen.map((name) => `- ${name}`).join('\n') : '- まだありません'}

この日に優先したい必須候補:
${mustVisitForDay.length > 0 ? mustVisitForDay.map((name) => `- ${name}`).join('\n') : '- 特になし'}

出力ルール:
1. candidates のみ返す
2. 全候補の dayHint は ${day} にする
3. name と searchQuery には必ず実在する具体的な固有名詞を入れる
4. 既に他の日で出した候補は重複禁止
5. meal は最大1件まで、残りは観光・体験・休憩のバランスをとる
6. なるべく ${currentDayStructure.mainArea} 周辺でまとまりよく選ぶ
7. 上の代表スポットのうち、この日に割り当てられているものは可能な限り候補に含める
8. 候補全体で、朝の導入→昼の中心体験→午後の回遊→夕方の締め、という旅程の流れが伝わるようにする
9. 単に有名スポットを列挙するのではなく、「この順に回ると1日が成立する」という組み合わせにする`;
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

function sanitizeSemanticCandidates(
  output: SemanticDayPlanOutput,
  request: NormalizedRequest,
  day: number,
  existingCandidates: SemanticCandidate[],
  destinationHighlights?: DestinationHighlight[]
): SemanticCandidate[] {
  const genericPatterns = [
    /の人気.+店$/,
    /の人気.+スポット$/,
    /のおすすめ/,
  /^おすすめ.+$/,
  /^人気.+$/,
    /の代表スポット$/,
    /の夜景スポット$/,
    /の有名.+店$/,
    /周辺の.+スポット$/,
    /popular\s+(lunch|dinner|restaurant|spot)/i,
    /recommended\s+(restaurant|cafe|spot)/i,
  ];

  const existingNames = new Set(
    existingCandidates.map((candidate) => normalizePlaceKey(candidate.searchQuery))
  );

  const sanitized = output.candidates
    .filter((candidate) =>
      !genericPatterns.some(
        (pattern) => pattern.test(candidate.name) || pattern.test(candidate.searchQuery)
      )
    )
    .filter((candidate) => {
      const normalized = normalizePlaceKey(candidate.searchQuery);
      if (existingNames.has(normalized)) {
        return false;
      }
      existingNames.add(normalized);
      return true;
    })
    .map((candidate) => ({
      ...candidate,
      dayHint: day,
      priority: Math.max(candidate.priority, 1),
      semanticId: crypto.randomUUID(),
    }));

  return mergeDestinationHighlightCandidates({
    request,
    destinationHighlights,
    candidates: sanitized,
    existingCandidates,
    day,
  });
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
