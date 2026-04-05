/**
 * Pass 7: completion_gate
 * completed 可否の最終判定 — deterministic のみ
 * 設計書 §4.2 pass 7, §4.5 completion gate
 *
 * gate を通過できない場合は failed とする。
 * AI の自己申告・confidence は使わない。
 */

import type {
  PlanRunPassContext,
  PlanRunPassResult,
} from '@/types/plan-run';
import { CompletionGateError } from '../errors';

// ============================================
// Gate Checks (設計書 §4.5)
// ============================================

function checkTripFrameValid(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  if (!run.planFrame) return 'plan_frame が存在しません';
  if (!run.planFrame.primaryDestination) return 'primaryDestination が空です';
  if (!run.planFrame.cities || run.planFrame.cities.length === 0) return 'cities が空です';
  return null;
}

function checkCityDayBlocksComplete(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  const draft = run.draftTrip;
  if (!draft) return 'draftTrip が存在しません';

  for (const city of draft.cities) {
    if (!city.cityName) return `cityName が空: cityId=${city.cityId}`;
    for (const day of city.days) {
      if (!day.title) return `${day.dayNumber}日目に title がありません`;
      if (!day.blocks || day.blocks.length === 0) return `${day.dayNumber}日目に blocks がありません`;
    }
  }
  return null;
}

function checkCityOrderIntact(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  const frame = run.planFrame;
  const draft = run.draftTrip;
  if (!frame || !draft) return null;

  const frameCities = [...frame.cities].sort((a, b) => a.cityOrder - b.cityOrder);
  const draftCities = [...draft.cities].sort((a, b) => a.cityOrder - b.cityOrder);

  if (frameCities.length !== draftCities.length) {
    return `都市数が一致しません (frame: ${frameCities.length}, draft: ${draftCities.length})`;
  }

  for (let i = 0; i < frameCities.length; i++) {
    if (frameCities[i].cityId !== draftCities[i].cityId) {
      return `都市順が一致しません: frame[${i}]=${frameCities[i].cityId}, draft[${i}]=${draftCities[i].cityId}`;
    }
  }

  return null;
}

function checkImmutableZoneIntact(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  const req = run.normalizedInput;
  const draft = run.draftTrip;
  if (!req || !draft) return null;

  // 日数一致
  const totalDays = draft.cities.flatMap((c) => c.days).length;
  if (totalDays !== req.durationDays) {
    return `日数が一致しません (要求: ${req.durationDays}, draft: ${totalDays})`;
  }

  return null;
}

function checkMealBlocksPresent(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  const draft = run.draftTrip;
  if (!draft) return null;

  for (const city of draft.cities) {
    for (const day of city.days) {
      const hasMeal = day.blocks.some((b) => b.blockType === 'meal');
      if (!hasMeal) {
        return `${day.dayNumber}日目に meal block がありません`;
      }
    }
  }
  return null;
}

function checkMustVisitPreserved(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  const req = run.normalizedInput;
  const draft = run.draftTrip;
  if (!req || !draft || req.mustVisitPlaces.length === 0) return null;

  const allPlaceNames = draft.cities
    .flatMap((c) => c.days)
    .flatMap((d) => d.blocks)
    .map((b) => b.placeName.toLowerCase());

  for (const must of req.mustVisitPlaces) {
    const found = allPlaceNames.some(
      (name) => name.includes(must.toLowerCase()) || must.toLowerCase().includes(name),
    );
    if (!found) {
      return `must_visit "${must}" が draft に含まれていません`;
    }
  }
  return null;
}

function checkTimelineExists(
  run: import('@/types/plan-run').PlanRun,
): string | null {
  if (!run.timeline || run.timeline.length === 0) return 'timeline が存在しません';
  return null;
}

// ============================================
// Pass Implementation
// ============================================

export async function completionGatePass(
  ctx: PlanRunPassContext,
): Promise<PlanRunPassResult<void>> {
  const start = Date.now();
  const { run } = ctx;

  const checks = [
    checkTripFrameValid,
    checkCityDayBlocksComplete,
    checkCityOrderIntact,
    checkImmutableZoneIntact,
    checkMealBlocksPresent,
    checkMustVisitPreserved,
    checkTimelineExists,
  ];

  const failedChecks: string[] = [];

  for (const check of checks) {
    const result = check(run);
    if (result) {
      failedChecks.push(result);
    }
  }

  if (failedChecks.length > 0) {
    console.error('[completion_gate] gate failed:', failedChecks);
    return {
      outcome: 'failed_terminal',
      newState: 'failed',
      warnings: failedChecks,
      durationMs: Date.now() - start,
      metadata: { failedChecks },
    };
  }

  return {
    outcome: 'completed',
    newState: 'gate_passed',
    warnings: [],
    durationMs: Date.now() - start,
  };
}
