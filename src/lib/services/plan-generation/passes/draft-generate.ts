/**
 * Pass B: Full Draft Generation
 * AI に旅程ドラフト全体を一気に生成させる
 *
 * 現行の semantic planner (候補リスト生成) とは根本的に異なり、
 * AI に「旅程全体」を day > stops の構造で自由に設計させる。
 */

import { randomUUID } from 'crypto';
import type { PassContext, PassResult, DraftPlan, DraftStop, DraftDay } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { buildContextSandwich } from '@/lib/services/ai/prompt-builder';
import { draftPlanLlmSchema } from '../schemas/draft-plan-schema';
import { PassExecutionError } from '../errors';
import type { DraftPlanLlmOutput } from '../schemas/draft-plan-schema';

// ============================================
// Prompt Construction
// ============================================

function buildDraftPrompt(normalized: NormalizedRequest): string {
  const parts: string[] = [];

  // ---- 基本情報 ----
  parts.push(`## 旅行条件`);
  parts.push(`- 目的地: ${normalized.destinations.join(', ')}`);
  parts.push(`- 日数: ${normalized.durationDays}日`);
  if (normalized.startDate) parts.push(`- 出発日: ${normalized.startDate}`);
  parts.push(`- 同行者: ${normalized.companions}`);
  parts.push(`- テーマ: ${normalized.themes.join(', ') || '特になし'}`);
  parts.push(`- 予算: ${normalized.budgetLevel}`);
  parts.push(`- ペース: ${normalized.pace}`);
  if (normalized.travelVibe) parts.push(`- 旅の雰囲気: ${normalized.travelVibe}`);
  if (normalized.preferredTransport.length > 0) {
    parts.push(`- 移動手段: ${normalized.preferredTransport.join(', ')}`);
  }

  // ---- 必須条件 (Hard Constraints) ----
  const hc = normalized.hardConstraints;
  if (hc.mustVisitPlaces.length > 0) {
    parts.push(`\n## 必ず含めるスポット`);
    for (const place of hc.mustVisitPlaces) {
      parts.push(`- ${place} (role: must_visit, aiConfidence: high)`);
    }
  }
  if (hc.fixedTransports.length > 0) {
    parts.push(`\n## 予約済み交通`);
    for (const t of hc.fixedTransports) {
      parts.push(`- ${t.name} (${t.type}${t.date ? `, ${t.date}` : ''}${t.time ? ` ${t.time}` : ''})`);
    }
  }
  if (hc.fixedHotels.length > 0) {
    parts.push(`\n## 予約済みホテル`);
    for (const h of hc.fixedHotels) {
      parts.push(`- ${h.name}${h.checkInDate ? ` (${h.checkInDate}〜${h.checkOutDate ?? ''})` : ''}`);
    }
  }
  if (hc.freeTextDirectives.length > 0) {
    parts.push(`\n## ユーザーの指示`);
    for (const d of hc.freeTextDirectives) {
      parts.push(`- ${d}`);
    }
  }

  // ---- 希望 (Soft Preferences) ----
  const sp = normalized.softPreferences;
  if (sp.rankedRequests.length > 0) {
    parts.push(`\n## 希望 (優先度順)`);
    for (const r of sp.rankedRequests) {
      parts.push(`- ${r}`);
    }
  }

  // ---- 自由記述 ----
  if (normalized.freeText) {
    parts.push(`\n## 自由記述`);
    parts.push(normalized.freeText);
  }

  // ---- 出力指示 ----
  parts.push(`\n## 出力指示`);
  parts.push(`以下のルールで旅程ドラフトを作成してください：`);
  parts.push(`1. 各 day に 3〜8 個の stops を含める（ペース: ${normalized.pace}）`);
  parts.push(`2. 各 stop の name は具体的で実在する場所名にする。「東京 観光」「朝の散策」のような曖昧な名称は禁止`);
  parts.push(`3. 各 stop の aiConfidence を正直に自己評価する — 確実に存在する場所は high、自信がない場所は low`);
  parts.push(`4. 必ず訪れたい場所 (must_visit) は必ず含める`);
  parts.push(`5. 各日に少なくとも 1 つの食事 (role: meal) を含める`);
  parts.push(`6. 初日は到着日として午後〜夕方スタートの軽めな構成にする`);
  parts.push(`7. 最終日は出発日として午前中心の構成にする`);
  parts.push(`8. 各 day の stops は訪問順に並べる（朝→夜の時系列順）`);
  parts.push(`9. 1 日のメインエリアを絞り、過剰な移動を避ける`);
  parts.push(`10. その目的地ならではのスポットと、小さな地元体験を混ぜる`);
  parts.push(`11. 各 stop の rationale に「なぜこの時間帯にこの場所なのか」を具体的に書く`);

  return parts.join('\n');
}

// ============================================
// LLM Output → DraftPlan 変換
// ============================================

function llmOutputToDraftPlan(output: DraftPlanLlmOutput): DraftPlan {
  return {
    destination: output.destination,
    description: output.description,
    tripIntentSummary: output.tripIntentSummary,
    themes: output.themes ?? [],
    orderingPreferences: output.orderingPreferences ?? [],
    days: output.days.map(day => ({
      day: day.day,
      title: day.title,
      mainArea: day.mainArea,
      overnightLocation: day.overnightLocation,
      summary: day.summary,
      stops: day.stops.map(stop => ({
        draftId: randomUUID(),
        name: stop.name,
        searchQuery: stop.searchQuery,
        role: stop.role,
        timeSlotHint: stop.timeSlotHint,
        stayDurationMinutes: stop.stayDurationMinutes,
        areaHint: stop.areaHint,
        rationale: stop.rationale,
        aiConfidence: stop.aiConfidence,
        categoryHint: stop.categoryHint,
        activityLabel: stop.activityLabel,
        locationEn: stop.locationEn,
        indoorOutdoor: stop.indoorOutdoor,
        tags: stop.tags,
      } satisfies DraftStop)),
    } satisfies DraftDay)),
  };
}

// ============================================
// Pass Implementation
// ============================================

export async function draftGeneratePass(ctx: PassContext): Promise<PassResult<DraftPlan>> {
  const start = Date.now();

  const normalized = ctx.session.normalizedInput;
  if (!normalized) {
    return {
      outcome: 'failed_terminal',
      warnings: ['No normalizedInput in session'],
      durationMs: Date.now() - start,
    };
  }

  // Prompt 構築
  const userPrompt = buildDraftPrompt(normalized);
  const { systemInstruction } = buildContextSandwich({
    context: [],
    userPrompt,
    generationType: 'semanticPlan',
  });

  // モデル解決 — 動的インポートで ai SDK を使用
  const provider = ctx.session.generationProfile?.provider ?? 'gemini';
  const modelName = ctx.session.generationProfile?.modelName ?? 'gemini-2.5-flash';
  const temperature = ctx.session.generationProfile?.temperature ?? 0.5;

  try {
    const model = await resolveLanguageModel(provider, modelName);
    const { generateObject } = await import('ai');

    const result = await generateObject({
      model,
      schema: draftPlanLlmSchema,
      system: systemInstruction,
      prompt: userPrompt,
      temperature,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(60_000),
    });

    const draftPlan = llmOutputToDraftPlan(result.object);

    return {
      outcome: 'completed',
      data: draftPlan,
      warnings: [],
      durationMs: Date.now() - start,
      metadata: {
        modelName,
        provider,
        temperature,
        dayCount: draftPlan.days.length,
        totalStops: draftPlan.days.reduce((sum, d) => sum + d.stops.length, 0),
      },
    };
  } catch (err) {
    // タイムアウトやAbortはリトライ可能
    if (err instanceof Error && /abort|timeout|timed out/i.test(err.message)) {
      return {
        outcome: 'needs_retry',
        warnings: [`Draft generation timed out: ${err.message}`],
        durationMs: Date.now() - start,
      };
    }

    throw new PassExecutionError('draft_generate', err instanceof Error ? err.message : String(err), err);
  }
}

// ============================================
// Language Model Resolution (reuse pattern from semantic-planner)
// ============================================

async function resolveLanguageModel(provider: string, modelName: string) {
  if (provider === 'openai') {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai(modelName);
  }

  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google(modelName);
}
