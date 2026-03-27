/**
 * Editability Scorer
 * 構造の編集しやすさ — ストップ数が適切、日が自己完結的
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { MAX_REASONABLE_STOPS_PER_DAY, MIN_STOPS_PER_DAY } from '../constants';

export function scoreEditability(
  draft: DraftPlan,
  _normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;

  for (const day of draft.days) {
    // ---- ストップ数の妥当性 ----
    if (day.stops.length > MAX_REASONABLE_STOPS_PER_DAY) {
      score -= 10;
      violations.push({
        severity: 'warning',
        category: 'editability',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: ストップ数 ${day.stops.length} が上限 ${MAX_REASONABLE_STOPS_PER_DAY} 超過`,
        suggestedFix: '重要でないストップを削除してください',
      });
    }

    if (day.stops.length < MIN_STOPS_PER_DAY) {
      score -= 5;
      violations.push({
        severity: 'info',
        category: 'editability',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: ストップ数 ${day.stops.length} が少なすぎる`,
      });
    }

    // ---- 各ストップに draftId があるか (後続の修復で必要) ----
    for (const stop of day.stops) {
      if (!stop.draftId) {
        score -= 5;
        violations.push({
          severity: 'error',
          category: 'editability',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId ?? '' },
          message: `"${stop.name}" に draftId がありません`,
        });
      }
    }

    // ---- 日の独立性: 宿泊地が設定されているか ----
    if (!day.overnightLocation) {
      score -= 3;
      violations.push({
        severity: 'info',
        category: 'editability',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: 宿泊地が未設定`,
      });
    }
  }

  // ---- 日番号の連続性 ----
  const dayNumbers = draft.days.map(d => d.day);
  for (let i = 0; i < dayNumbers.length; i++) {
    if (dayNumbers[i] !== i + 1) {
      score -= 10;
      violations.push({
        severity: 'error',
        category: 'editability',
        scope: { type: 'plan' },
        message: `日番号が不連続: [${dayNumbers.join(', ')}]`,
      });
      break;
    }
  }

  details.push(`総ストップ数: ${draft.days.reduce((s, d) => s + d.stops.length, 0)}`);

  return {
    category: 'editability',
    score: Math.max(0, score),
    details,
    violations,
  };
}
