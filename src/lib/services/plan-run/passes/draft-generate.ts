/**
 * Pass 3: draft_generate
 * city/day/block の semantic draft 生成 (Gemini AI)
 * 設計書 §4.2 pass 3
 *
 * day 単位で pause/resume に対応。
 * 設計書 §4.3: pause/resume の原則 — 基本粒度は day 単位。
 */

import { z } from 'zod';
import { generateObject, streamText } from 'ai';
import type {
  PlanRunPassContext,
  PlanRunPassResult,
  DraftTrip,
  DraftCity,
  DraftDay,
  DraftBlock,
  BlockType,
  TimeSlot,
  SpotCategory,
  MealKind,
} from '@/types/plan-run';
import type { LanguageModelV1 } from 'ai';
import { resolveModel } from '@/lib/services/ai/model-provider';
import {
  DRAFT_DAY_TIMEOUT_MS,
  DRAFT_DAY_TEXT_FALLBACK_TIMEOUT_MS,
  STREAM_FINALIZE_RESERVE_MS,
  MAX_DAY_RETRIES,
  RETRY_TEMPERATURE_INCREMENT,
} from '../constants';
import { extractFirstJsonObject, salvageIncompleteJson } from '@/lib/services/ai/structured-json-recovery';
import { randomUUID } from 'crypto';

// ============================================
// LLM Output Schema (1日分)
// ============================================

const draftBlockSchema = z.object({
  blockType: z.enum(['spot', 'meal', 'intercity_move_placeholder', 'stay_area_placeholder', 'free_slot']),
  placeName: z.string().min(1),
  searchQuery: z.string().optional(),
  areaHint: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.number().int().min(0).optional(),
  timeSlot: z.enum(['morning', 'midday', 'afternoon', 'evening', 'night', 'flexible']).optional().catch(undefined),
  category: z.enum(['sightseeing', 'nature', 'culture', 'shopping', 'activity', 'entertainment', 'other']).optional().catch(undefined),
  mealKind: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().catch(undefined),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  transportHint: z.string().optional(),
  stayArea: z.string().optional(),
  isMustVisit: z.boolean(),
  isFixedBooking: z.boolean(),
  rationale: z.string().optional(),
});

const draftDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1),
  mainArea: z.string().min(1),
  overnightLocation: z.string().min(1),
  summary: z.string().optional(),
  blocks: z.array(draftBlockSchema).min(1),
});

// ============================================
// Block Normalization (AI 出力の正規化)
// ============================================

const VALID_TIME_SLOTS = new Set(['morning', 'midday', 'afternoon', 'evening', 'night', 'flexible']);
const VALID_MEAL_KINDS = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
const VALID_CATEGORIES = new Set(['sightseeing', 'nature', 'culture', 'shopping', 'activity', 'entertainment', 'other']);

const MEAL_TO_TIME_SLOT: Record<string, string> = {
  breakfast: 'morning',
  lunch: 'midday',
  dinner: 'evening',
  brunch: 'midday',
};

/**
 * AI 出力のブロックを Zod 検証前に正規化する。
 * timeSlot/mealKind の混同、未設定フィールドのデフォルト補完を行う。
 */
export function coerceDraftBlock(block: Record<string, unknown>): Record<string, unknown> {
  const result = { ...block };
  const timeSlot = typeof result.timeSlot === 'string' ? result.timeSlot.toLowerCase() : undefined;
  const blockType = typeof result.blockType === 'string' ? result.blockType : undefined;

  // timeSlot に mealKind の値 ("lunch", "dinner", "breakfast") が入っている場合の修正
  if (timeSlot && !VALID_TIME_SLOTS.has(timeSlot) && MEAL_TO_TIME_SLOT[timeSlot]) {
    result.timeSlot = MEAL_TO_TIME_SLOT[timeSlot];
    // mealKind が未設定なら、元の値を mealKind に移す
    if (!result.mealKind && VALID_MEAL_KINDS.has(timeSlot)) {
      result.mealKind = timeSlot;
    }
  } else if (timeSlot && !VALID_TIME_SLOTS.has(timeSlot)) {
    result.timeSlot = 'flexible';
  }

  // meal block に mealKind がない場合のデフォルト
  if (blockType === 'meal' && !VALID_MEAL_KINDS.has(String(result.mealKind ?? ''))) {
    result.mealKind = 'lunch';
  }

  // spot block に category がない場合のデフォルト
  if (blockType === 'spot' && !VALID_CATEGORIES.has(String(result.category ?? ''))) {
    result.category = 'other';
  }

  return result;
}

// ============================================
// Prompt Builder (1日分)
// ============================================

function buildDayDraftPrompt(
  dayNumber: number,
  mainArea: string,
  overnightLocation: string,
  dayKind: string,
  req: {
    destinations: string[];
    durationDays: number;
    companions: string;
    themes: string[];
    budgetLevel: string;
    pace: string;
    mustVisitPlaces: string[];
    hardConstraints: string[];
    softPreferences: string[];
    outputLanguage: string;
  },
): { system: string; prompt: string } {
  const system = `あなたは旅行計画の専門家です。1日分の旅程ブロック一覧を生成してください。

重要なルール:
- AI が実際に存在する場所・施設の名前を提案すること
- 汎用的な仮のスポット名 (例: "観光スポットA") は絶対に禁止
- meal block は最低1つ含めること（blockType="meal" かつ mealKind に "lunch" or "dinner" を指定）
- timeSlot は時間帯を表す enum: "morning" / "midday" / "afternoon" / "evening" / "night" / "flexible"
- mealKind は食事種類を表す enum: "breakfast" / "lunch" / "dinner" / "snack"
- 重要: timeSlot に "lunch" や "dinner" を入れないこと（それらは mealKind に指定する値）
- isMustVisit は必ず訪れたい場所ならtrue
- isFixedBooking は予約済み・変更不可ならtrue
- placeName は正式名称を使うこと
- dayKind が arrival なら最初は移動、departure なら最後は移動
- 出力は JSON のみ`;

  const mustStr = req.mustVisitPlaces.length > 0
    ? `この日に含めるべき場所: ${req.mustVisitPlaces.join('、')}`
    : '';

  const constraintStr = req.hardConstraints.length > 0
    ? `制約:\n${req.hardConstraints.map((c) => `- ${c}`).join('\n')}`
    : '';

  const prefStr = req.softPreferences.length > 0
    ? `希望:\n${req.softPreferences.map((p) => `- ${p}`).join('\n')}`
    : '';

  const prompt = `旅行先: ${req.destinations.join('、')}
総日数: ${req.durationDays}日
この日: ${dayNumber}日目 (${dayKind})
メインエリア: ${mainArea}
宿泊地: ${overnightLocation}
同行者: ${req.companions}
テーマ: ${req.themes.join('、')}
予算: ${req.budgetLevel}
ペース: ${req.pace}
${mustStr}
${constraintStr}
${prefStr}
出力言語: ${req.outputLanguage}

${dayNumber}日目の旅程ブロック一覧を生成してください。`;

  return { system, prompt };
}

// ============================================
// Error Classification
// ============================================

const RECOVERABLE_PATTERNS = [
  /unterminated string/i,
  /unexpected end of json/i,
  /json at position/i,
  /jsonparse/i,
  /ai_jsonparseerror/i,
  /invalid json/i,
  /type validation failed/i,
  /zoderror/i,
  /invalid_enum_value/i,
  /expected .*[,}\]]/i,
  /recitation/i,
  /finishReason.*RECITATION/i,
];

function isRecoverableError(message: string): boolean {
  return RECOVERABLE_PATTERNS.some((pattern) => pattern.test(message));
}

function isTimeoutError(message: string): boolean {
  return /timeout|abort/i.test(message);
}

// ============================================
// Text Fallback (generateObject 失敗時の代替)
// ============================================

const ENUM_CONSTRAINTS = `
ENUM 制約 (必ず以下の値のみ使用):
- blockType: "spot" | "meal" | "intercity_move_placeholder" | "stay_area_placeholder" | "free_slot"
- timeSlot: "morning" | "midday" | "afternoon" | "evening" | "night" | "flexible"
- mealKind: "breakfast" | "lunch" | "dinner" | "snack"
- category: "sightseeing" | "nature" | "culture" | "shopping" | "activity" | "entertainment" | "other"

JSON のみを返してください。マークダウンフェンスやコメントは不要です。
トークン制限に近い場合は、説明文を短くして JSON を途中で切らないでください。`;

async function generateDayDraftTextFallback(
  system: string,
  prompt: string,
  model: LanguageModelV1,
  budgetMs: number,
): Promise<z.infer<typeof draftDaySchema> | null> {
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), budgetMs);

  let text = '';
  try {
    const result = await streamText({
      model,
      system: `${system}\n\n${ENUM_CONSTRAINTS}`,
      prompt,
      temperature: 0.7,
      maxTokens: 8_192,
      abortSignal: abortController.signal,
    });

    for await (const delta of result.textStream) {
      text += delta;
    }
  } catch {
    // timeout or other error — proceed with whatever text we have
  } finally {
    clearTimeout(timer);
  }

  if (!text.trim()) return null;

  // JSON 抽出を試みる
  let jsonStr = extractFirstJsonObject(text);
  if (!jsonStr) {
    jsonStr = salvageIncompleteJson(text);
  }
  if (!jsonStr) return null;

  try {
    const raw = JSON.parse(jsonStr);

    // blocks 配列の各要素を正規化
    if (raw && Array.isArray(raw.blocks)) {
      raw.blocks = raw.blocks.map((b: Record<string, unknown>) => coerceDraftBlock(b));
    }

    const parsed = draftDaySchema.safeParse(raw);
    if (parsed.success) return parsed.data;

    return null;
  } catch {
    return null;
  }
}

// ============================================
// Pass Implementation
// ============================================

export async function draftGeneratePass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<DraftTrip>> {
  const start = Date.now();
  const { run, budget } = ctx;
  const req = run.normalizedInput;
  const frame = run.planFrame;

  if (!req || !frame) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['normalizedInput または planFrame が存在しません'],
      durationMs: Date.now() - start,
    };
  }

  // resume 対応: 既存の draftTrip がある場合は続きから
  const existingDraft = run.draftTrip;
  const completedDayNumbers = new Set(
    existingDraft?.cities.flatMap((c) => c.days.map((d) => d.dayNumber)) ?? [],
  );

  const draftCities: DraftCity[] = existingDraft
    ? JSON.parse(JSON.stringify(existingDraft.cities))
    : frame.cities.map((fc) => ({
        cityId: fc.cityId,
        cityName: fc.cityName,
        cityOrder: fc.cityOrder,
        days: [] as DraftDay[],
      }));

  const resolved = resolveModel('itinerary', { modelName: run.modelName });

  // リトライ情報の引き継ぎ
  const dayRetryMap: Record<string, number> = {
    ...(run.pauseContext?.dayRetryMap ?? {}),
  };

  const allFrameDays = frame.cities.flatMap((c) =>
    c.days.map((d) => ({ ...d, cityId: c.cityId, cityName: c.cityName, cityOrder: c.cityOrder })),
  ).sort((a, b) => a.dayNumber - b.dayNumber);

  for (const frameDay of allFrameDays) {
    if (completedDayNumbers.has(frameDay.dayNumber)) continue;

    const remainingMs = budget.remainingMs();
    if (remainingMs < DRAFT_DAY_TIMEOUT_MS + STREAM_FINALIZE_RESERVE_MS) {
      // time budget 残不足 → pause
      return {
        outcome: 'partial',
        data: buildDraftTrip(frame, draftCities),
        newState: 'paused',
        warnings: [],
        durationMs: Date.now() - start,
        pauseContext: {
          pauseReason: 'runtime_budget_exhausted',
          resumePassId: 'draft_generate',
          nextDayNumber: frameDay.dayNumber,
          pausedAt: new Date().toISOString(),
          dayRetryMap,
        },
      };
    }

    const dayKey = String(frameDay.dayNumber);
    const retryCount = dayRetryMap[dayKey] ?? 0;
    const temperature = Math.min(0.8 + retryCount * RETRY_TEMPERATURE_INCREMENT, 1.2);

    const { system, prompt } = buildDayDraftPrompt(
      frameDay.dayNumber,
      frameDay.mainArea,
      frameDay.overnightLocation,
      frameDay.dayKind,
      req,
    );

    let dayResult: z.infer<typeof draftDaySchema> | null = null;

    try {
      const result = await generateObject({
        model: resolved.model,
        schema: draftDaySchema,
        system,
        prompt,
        temperature,
        maxTokens: 8_192,
        abortSignal: AbortSignal.timeout(Math.min(DRAFT_DAY_TIMEOUT_MS, budget.remainingMs() - 1_000)),
      });

      // generateObject 成功 — ブロックを正規化
      const raw = result.object;
      raw.blocks = raw.blocks.map((b) => {
        const coerced = coerceDraftBlock(b as unknown as Record<string, unknown>);
        return coerced as typeof b;
      });
      dayResult = raw;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Tier 1: Timeout/Abort
      if (isTimeoutError(message)) {
        dayRetryMap[dayKey] = retryCount + 1;
        if (dayRetryMap[dayKey] > MAX_DAY_RETRIES) {
          console.error(`[draft_generate] day ${frameDay.dayNumber}: max retries (${MAX_DAY_RETRIES}) exceeded (timeout)`);
          return {
            outcome: 'failed_terminal',
            newState: 'failed',
            warnings: [`draft_generate: day ${frameDay.dayNumber} が ${MAX_DAY_RETRIES} 回のタイムアウト後も生成できませんでした`],
            durationMs: Date.now() - start,
          };
        }
        return {
          outcome: 'partial',
          data: buildDraftTrip(frame, draftCities),
          newState: 'paused',
          warnings: [],
          durationMs: Date.now() - start,
          pauseContext: {
            pauseReason: 'runtime_budget_exhausted',
            resumePassId: 'draft_generate',
            nextDayNumber: frameDay.dayNumber,
            pausedAt: new Date().toISOString(),
            dayRetryMap,
          },
        };
      }

      // Tier 2: 回復可能エラー — テキスト fallback を試行
      if (isRecoverableError(message)) {
        console.warn(`[draft_generate] day ${frameDay.dayNumber}: structured output failed, trying text fallback. Error: ${message.slice(0, 200)}`);

        const fallbackBudgetMs = Math.min(
          DRAFT_DAY_TEXT_FALLBACK_TIMEOUT_MS,
          budget.remainingMs() - STREAM_FINALIZE_RESERVE_MS - 1_000,
        );

        if (fallbackBudgetMs > 3_000) {
          dayResult = await generateDayDraftTextFallback(
            system,
            prompt,
            resolved.model,
            fallbackBudgetMs,
          );
        }

        if (!dayResult) {
          // fallback も失敗 → pause してリトライ
          dayRetryMap[dayKey] = retryCount + 1;
          if (dayRetryMap[dayKey] > MAX_DAY_RETRIES) {
            console.error(`[draft_generate] day ${frameDay.dayNumber}: max retries (${MAX_DAY_RETRIES}) exceeded (recoverable)`);
            return {
              outcome: 'failed_terminal',
              newState: 'failed',
              warnings: [`draft_generate: day ${frameDay.dayNumber} が ${MAX_DAY_RETRIES} 回の試行後も生成できませんでした`],
              durationMs: Date.now() - start,
            };
          }
          return {
            outcome: 'partial',
            data: buildDraftTrip(frame, draftCities),
            newState: 'paused',
            warnings: [`day ${frameDay.dayNumber}: text fallback failed, will retry`],
            durationMs: Date.now() - start,
            pauseContext: {
              pauseReason: 'runtime_budget_exhausted',
              resumePassId: 'draft_generate',
              nextDayNumber: frameDay.dayNumber,
              pausedAt: new Date().toISOString(),
              dayRetryMap,
            },
          };
        }
        // fallback 成功 — dayResult が設定済み、以下で通常フローに合流
      } else {
        // Tier 3: 真のターミナルエラー
        console.error(`[draft_generate] failed on day ${frameDay.dayNumber}:`, message);
        return {
          outcome: 'failed_terminal',
          newState: 'failed',
          warnings: [`draft_generate failed on day ${frameDay.dayNumber}: ${message}`],
          durationMs: Date.now() - start,
        };
      }
    }

    if (dayResult) {
      const blocks: DraftBlock[] = dayResult.blocks.map((b) => ({
        draftId: randomUUID(),
        blockType: b.blockType as BlockType,
        placeName: b.placeName,
        searchQuery: b.searchQuery,
        areaHint: b.areaHint,
        startTime: b.startTime,
        endTime: b.endTime,
        durationMinutes: b.durationMinutes,
        timeSlot: b.timeSlot as TimeSlot | undefined,
        category: b.category as SpotCategory | undefined,
        mealKind: b.mealKind as MealKind | undefined,
        fromCity: b.fromCity,
        toCity: b.toCity,
        transportHint: b.transportHint,
        stayArea: b.stayArea,
        isMustVisit: b.isMustVisit,
        isFixedBooking: b.isFixedBooking,
        rationale: b.rationale,
      }));

      const draftDay: DraftDay = {
        dayNumber: frameDay.dayNumber,
        title: dayResult.title,
        mainArea: dayResult.mainArea,
        overnightLocation: dayResult.overnightLocation,
        summary: dayResult.summary,
        blocks,
      };

      const cityDraft = draftCities.find((c) => c.cityId === frameDay.cityId);
      if (cityDraft) {
        cityDraft.days.push(draftDay);
      }

      completedDayNumbers.add(frameDay.dayNumber);
      // 成功したらリトライカウントをリセット
      delete dayRetryMap[dayKey];
    }
  }

  const draftTrip = buildDraftTrip(frame, draftCities);

  return {
    outcome: 'completed',
    data: draftTrip,
    newState: 'draft_generated',
    warnings: [],
    durationMs: Date.now() - start,
  };
}

function buildDraftTrip(
  frame: import('@/types/plan-run').PlanFrame,
  draftCities: DraftCity[],
): DraftTrip {
  return {
    primaryDestination: frame.primaryDestination,
    title: frame.title,
    cities: draftCities.map((c) => ({
      ...c,
      days: c.days.sort((a, b) => a.dayNumber - b.dayNumber),
    })),
  };
}
