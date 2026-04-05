/**
 * Pass 5: draft_repair_local
 * 局所修復 — 失敗部位だけ修復し再評価
 * 設計書 §4.2 pass 5
 *
 * 修復後は必ず draft_validate に戻す。
 * MAX_REPAIR_ITERATIONS を超えたら failed とする。
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import type {
  PlanRunPassContext,
  PlanRunPassResult,
  DraftTrip,
  DraftBlock,
  BlockType,
  TimeSlot,
  SpotCategory,
  MealKind,
  RepairRecord,
} from '@/types/plan-run';
import { resolveModel } from '@/lib/services/ai/model-provider';
import { REPAIR_TIMEOUT_MS, MAX_REPAIR_ITERATIONS } from '../constants';
import { coerceDraftBlock } from './draft-generate';
import { randomUUID } from 'crypto';

const repairDaySchema = z.object({
  title: z.string().min(1),
  mainArea: z.string().min(1),
  overnightLocation: z.string().min(1),
  summary: z.string().optional(),
  blocks: z.array(z.object({
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
  })).min(1),
});

async function repairSingleDay(
  dayNumber: number,
  city: import('@/types/plan-run').DraftCity,
  issueMessages: string[],
  req: {
    destinations: string[];
    companions: string;
    themes: string[];
    budgetLevel: string;
    pace: string;
    mustVisitPlaces: string[];
    outputLanguage: string;
  },
  modelName: string | undefined,
  budgetMs: number,
): Promise<import('@/types/plan-run').DraftDay | null> {
  const system = `あなたは旅行計画の修復専門家です。問題のある1日分の旅程を修正してください。

重要なルール:
- 実際に存在する場所の正式名称を使うこと
- 汎用的な仮のスポット名は絶対に禁止
- meal block は最低1つ含めること（blockType="meal" かつ mealKind に "lunch" or "dinner" を指定）
- timeSlot は時間帯を表す enum: "morning" / "midday" / "afternoon" / "evening" / "night" / "flexible"
- mealKind は食事種類を表す enum: "breakfast" / "lunch" / "dinner" / "snack"
- 重要: timeSlot に "lunch" や "dinner" を入れないこと（それらは mealKind に指定する値）
- isMustVisit / isFixedBooking は元の値を維持
- 指摘された問題だけを修正すること`;

  const issueStr = issueMessages.map((m) => `- ${m}`).join('\n');
  const mustStr = req.mustVisitPlaces.length > 0
    ? `必ず含める: ${req.mustVisitPlaces.join('、')}`
    : '';

  const prompt = `旅行先: ${req.destinations.join('、')}
都市: ${city.cityName}
修正対象: ${dayNumber}日目
同行者: ${req.companions}
ペース: ${req.pace}
予算: ${req.budgetLevel}
${mustStr}

問題点:
${issueStr}

${dayNumber}日目の旅程ブロック一覧を修正して出力してください。`;

  const resolved = resolveModel('itinerary', { modelName });

  try {
    const result = await generateObject({
      model: resolved.model,
      schema: repairDaySchema,
      system,
      prompt,
      temperature: 0.6,
      maxTokens: 8_192,
      abortSignal: AbortSignal.timeout(Math.min(REPAIR_TIMEOUT_MS, budgetMs - 500)),
    });

    const raw = result.object;
    const blocks: DraftBlock[] = raw.blocks.map((b) => {
      const coerced = coerceDraftBlock(b as unknown as Record<string, unknown>);
      return {
        draftId: randomUUID(),
        blockType: coerced.blockType as BlockType,
        placeName: coerced.placeName as string,
        searchQuery: coerced.searchQuery as string | undefined,
        areaHint: coerced.areaHint as string | undefined,
        startTime: coerced.startTime as string | undefined,
        endTime: coerced.endTime as string | undefined,
        durationMinutes: coerced.durationMinutes as number | undefined,
        timeSlot: coerced.timeSlot as TimeSlot | undefined,
        category: coerced.category as SpotCategory | undefined,
        mealKind: coerced.mealKind as MealKind | undefined,
        fromCity: coerced.fromCity as string | undefined,
        toCity: coerced.toCity as string | undefined,
        transportHint: coerced.transportHint as string | undefined,
        stayArea: coerced.stayArea as string | undefined,
        isMustVisit: coerced.isMustVisit as boolean,
        isFixedBooking: coerced.isFixedBooking as boolean,
        rationale: coerced.rationale as string | undefined,
      };
    });

    return {
      dayNumber,
      title: raw.title,
      mainArea: raw.mainArea,
      overnightLocation: raw.overnightLocation,
      summary: raw.summary,
      blocks,
    };
  } catch {
    return null;
  }
}

export async function draftRepairLocalPass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<DraftTrip>> {
  const start = Date.now();
  const { run, budget } = ctx;
  const draft = run.draftTrip;
  const req = run.normalizedInput;
  const validation = run.validationResult;

  if (!draft || !req || !validation) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['draftTrip / normalizedInput / validationResult が存在しません'],
      durationMs: Date.now() - start,
    };
  }

  // 修復回数チェック
  const currentIteration = (run.repairHistory?.length ?? 0) + 1;
  if (currentIteration > MAX_REPAIR_ITERATIONS) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: [`修復回数の上限 (${MAX_REPAIR_ITERATIONS}) を超えました`],
      durationMs: Date.now() - start,
    };
  }

  if (validation.repairTargetDays.length === 0) {
    // 修復対象なし → そのまま通す
    return {
      outcome: 'completed',
      data: draft,
      newState: 'draft_repaired',
      warnings: [],
      durationMs: Date.now() - start,
    };
  }

  const repairedDraft: DraftTrip = JSON.parse(JSON.stringify(draft));
  const repairRecords: RepairRecord[] = [...(run.repairHistory ?? [])];
  const warnings: string[] = [];

  for (const targetDayNumber of validation.repairTargetDays) {
    const remainingMs = budget.remainingMs();
    if (remainingMs < REPAIR_TIMEOUT_MS + 1_000) {
      warnings.push(`day ${targetDayNumber} の修復をスキップ (時間不足)`);
      continue;
    }

    const issues = validation.issues
      .filter((i) => i.dayNumber === targetDayNumber && i.severity === 'error' && i.repairable)
      .map((i) => i.message);

    if (issues.length === 0) continue;

    const city = repairedDraft.cities.find((c) => c.days.some((d) => d.dayNumber === targetDayNumber));
    if (!city) continue;

    const repairStart = Date.now();
    const repairedDay = await repairSingleDay(
      targetDayNumber,
      city,
      issues,
      req,
      run.modelName,
      remainingMs,
    );

    const record: RepairRecord = {
      iteration: currentIteration,
      targetDayNumber,
      issueCode: issues[0] ?? 'unknown',
      result: repairedDay ? 'fixed' : 'unresolved',
      durationMs: Date.now() - repairStart,
      timestamp: new Date().toISOString(),
    };
    repairRecords.push(record);

    if (repairedDay) {
      const dayIdx = city.days.findIndex((d) => d.dayNumber === targetDayNumber);
      if (dayIdx >= 0) {
        city.days[dayIdx] = repairedDay;
      }
    } else {
      warnings.push(`day ${targetDayNumber} の修復に失敗しました`);
    }
  }

  return {
    outcome: 'completed',
    data: repairedDraft,
    newState: 'draft_repaired',
    warnings,
    durationMs: Date.now() - start,
    metadata: { repairRecords },
  };
}
