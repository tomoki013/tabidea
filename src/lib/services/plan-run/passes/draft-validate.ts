/**
 * Pass 4: draft_validate
 * schema / 必須構造 / hard rule 違反検査
 * 設計書 §4.2 pass 4 — AI 出力をそのまま通さない。
 * 設計書 §4.4 hard fail 条件に準拠。
 *
 * deterministic layer のみ — AI を使用しない。
 */

import type {
  PlanRunPassContext,
  PlanRunPassResult,
  DraftValidationResult,
  ValidationIssue,
} from '@/types/plan-run';
import { MIN_MEALS_PER_DAY, MAX_BLOCKS_PER_DAY } from '../constants';

// ============================================
// Validation Functions
// ============================================

function validateDayStructure(
  day: import('@/types/plan-run').DraftDay,
  durationDays: number,
  mustVisitPlaces: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { dayNumber, blocks } = day;

  // §4.4: 1日が空になる
  if (!blocks || blocks.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty_day',
      message: `${dayNumber}日目にブロックがありません`,
      dayNumber,
      repairable: true,
    });
    return issues; // 他の検証は意味なし
  }

  // §4.4: 必須 block (meal) が欠落
  const mealBlocks = blocks.filter((b) => b.blockType === 'meal');
  if (mealBlocks.length < MIN_MEALS_PER_DAY) {
    issues.push({
      severity: 'error',
      code: 'missing_meal',
      message: `${dayNumber}日目に meal block がありません (最低${MIN_MEALS_PER_DAY}個必要)`,
      dayNumber,
      repairable: true,
    });
  }

  // placeName が空でないか
  for (const block of blocks) {
    if (!block.placeName || block.placeName.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'empty_place_name',
        message: `${dayNumber}日目のブロックに placeName が空です`,
        dayNumber,
        draftId: block.draftId,
        repairable: true,
      });
    }

    // 汎用的プレースホルダー名の検出
    const genericPatterns = [
      /^(観光スポット|スポット|場所|ホテル|レストラン)[A-Za-z0-9]*$/,
      /^(spot|place|hotel|restaurant)\s*[A-Za-z0-9]*$/i,
      /^(観光|食事|宿泊)\s*[0-9]+$/,
    ];
    if (genericPatterns.some((p) => p.test(block.placeName.trim()))) {
      issues.push({
        severity: 'error',
        code: 'generic_placeholder_name',
        message: `${dayNumber}日目のブロック "${block.placeName}" は汎用プレースホルダーです`,
        dayNumber,
        draftId: block.draftId,
        repairable: true,
      });
    }
  }

  // ブロック数上限
  if (blocks.length > MAX_BLOCKS_PER_DAY) {
    issues.push({
      severity: 'warning',
      code: 'too_many_blocks',
      message: `${dayNumber}日目のブロック数 (${blocks.length}) が多すぎます (上限 ${MAX_BLOCKS_PER_DAY})`,
      dayNumber,
      repairable: false,
    });
  }

  return issues;
}

function validateCityOrder(
  cities: import('@/types/plan-run').DraftCity[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sorted = [...cities].sort((a, b) => a.cityOrder - b.cityOrder);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].cityOrder !== i + 1) {
      issues.push({
        severity: 'error',
        code: 'city_order_gap',
        message: `都市順が連続していません (cityOrder: ${sorted[i].cityOrder})`,
        repairable: false,
      });
    }
  }
  return issues;
}

function validateDayNumberContiguous(
  cities: import('@/types/plan-run').DraftCity[],
  durationDays: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allDayNumbers = cities
    .flatMap((c) => c.days.map((d) => d.dayNumber))
    .sort((a, b) => a - b);

  if (allDayNumbers.length !== durationDays) {
    issues.push({
      severity: 'error',
      code: 'day_count_mismatch',
      message: `draft の日数 (${allDayNumbers.length}) が要求 (${durationDays}) と一致しません`,
      repairable: false,
    });
    return issues;
  }

  for (let i = 1; i <= durationDays; i++) {
    if (!allDayNumbers.includes(i)) {
      issues.push({
        severity: 'error',
        code: 'missing_day',
        message: `${i}日目が存在しません`,
        dayNumber: i,
        repairable: false,
      });
    }
  }

  return issues;
}

function validateMustVisit(
  cities: import('@/types/plan-run').DraftCity[],
  mustVisitPlaces: string[],
): ValidationIssue[] {
  if (mustVisitPlaces.length === 0) return [];
  const issues: ValidationIssue[] = [];

  const allPlaceNames = cities
    .flatMap((c) => c.days)
    .flatMap((d) => d.blocks)
    .map((b) => b.placeName.toLowerCase());

  for (const must of mustVisitPlaces) {
    const found = allPlaceNames.some(
      (name) => name.includes(must.toLowerCase()) || must.toLowerCase().includes(name),
    );
    if (!found) {
      issues.push({
        severity: 'error',
        code: 'missing_must_visit',
        message: `must_visit の "${must}" が draft に含まれていません`,
        repairable: true,
      });
    }
  }

  return issues;
}

// ============================================
// Pass Implementation
// ============================================

export async function draftValidatePass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<DraftValidationResult>> {
  const start = Date.now();
  const { run } = ctx;
  const draft = run.draftTrip;
  const req = run.normalizedInput;

  if (!draft || !req) {
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: ['draftTrip または normalizedInput が存在しません'],
      durationMs: Date.now() - start,
    };
  }

  const allIssues: ValidationIssue[] = [];

  // 都市順チェック
  allIssues.push(...validateCityOrder(draft.cities));

  // 日数チェック
  allIssues.push(...validateDayNumberContiguous(draft.cities, req.durationDays));

  // must_visit チェック
  allIssues.push(...validateMustVisit(draft.cities, req.mustVisitPlaces));

  // 各日のチェック
  for (const city of draft.cities) {
    for (const day of city.days) {
      allIssues.push(...validateDayStructure(day, req.durationDays, req.mustVisitPlaces));
    }
  }

  const errors = allIssues.filter((i) => i.severity === 'error');
  const hardFailIssues = errors.filter((i) => !i.repairable);
  const hardFail = hardFailIssues.length > 0;

  const repairTargetDays = [
    ...new Set(errors.filter((i) => i.repairable && i.dayNumber !== undefined).map((i) => i.dayNumber!)),
  ];

  const result: DraftValidationResult = {
    valid: errors.length === 0,
    issues: allIssues,
    hardFail,
    repairTargetDays,
  };

  if (hardFail) {
    return {
      outcome: 'failed_terminal',
      data: result,
      newState: 'failed',
      warnings: hardFailIssues.map((i) => i.message),
      durationMs: Date.now() - start,
    };
  }

  return {
    outcome: 'completed',
    data: result,
    newState: 'draft_validated',
    warnings: allIssues.filter((i) => i.severity === 'warning').map((i) => i.message),
    durationMs: Date.now() - start,
  };
}
