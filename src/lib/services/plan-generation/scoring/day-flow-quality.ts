/**
 * Day Flow Quality Scorer
 * 食事ウィンドウ、ペース、遷移の自然さを評価
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { RECOMMENDED_STOPS_PER_DAY } from '../constants';

export function scoreDayFlowQuality(
  draft: DraftPlan,
  normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;
  const pace = normalized.pace;

  for (const day of draft.days) {
    // ---- 食事チェック ----
    const mealStops = day.stops.filter(s => s.role === 'meal');
    if (mealStops.length === 0 && day.stops.length >= 3) {
      score -= 8;
      violations.push({
        severity: 'warning',
        category: 'day_flow_quality',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: 食事スポットが含まれていません`,
        suggestedFix: '昼食または夕食のスポットを追加してください',
      });
    }

    // ---- ストップ数 vs ペース ----
    const stopCount = day.stops.length;
    const range = RECOMMENDED_STOPS_PER_DAY[pace];
    if (stopCount > range.max) {
      score -= 5;
      violations.push({
        severity: 'warning',
        category: 'day_flow_quality',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: ストップ数 ${stopCount} が pace=${pace} の推奨上限 ${range.max} を超過`,
      });
    } else if (stopCount < range.min) {
      score -= 3;
      violations.push({
        severity: 'info',
        category: 'day_flow_quality',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: ストップ数 ${stopCount} が pace=${pace} の推奨下限 ${range.min} 未満`,
      });
    }

    // ---- 時間帯の自然な流れ ----
    const timeOrder = ['morning', 'midday', 'afternoon', 'evening', 'night'];
    let prevTimeIndex = -1;
    let outOfOrderCount = 0;

    for (const stop of day.stops) {
      if (stop.timeSlotHint === 'flexible') continue;
      const idx = timeOrder.indexOf(stop.timeSlotHint);
      if (idx !== -1 && idx < prevTimeIndex) {
        outOfOrderCount++;
      }
      if (idx !== -1) prevTimeIndex = idx;
    }

    if (outOfOrderCount > 1) {
      score -= 5;
      violations.push({
        severity: 'warning',
        category: 'day_flow_quality',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: 時間帯が不自然な順序 (${outOfOrderCount}箇所)`,
      });
    }
  }

  // ---- 初日・最終日の配慮 ----
  if (draft.days.length >= 2) {
    const firstDay = draft.days[0];
    const lastDay = draft.days[draft.days.length - 1];

    // 初日が重すぎないか
    if (firstDay.stops.length > 6) {
      score -= 5;
      violations.push({
        severity: 'info',
        category: 'day_flow_quality',
        scope: { type: 'day', day: firstDay.day },
        message: `到着日 (Day ${firstDay.day}) のストップ数 ${firstDay.stops.length} が多すぎる`,
      });
    }

    // 最終日が重すぎないか
    if (lastDay.stops.length > 5) {
      score -= 5;
      violations.push({
        severity: 'info',
        category: 'day_flow_quality',
        scope: { type: 'day', day: lastDay.day },
        message: `出発日 (Day ${lastDay.day}) のストップ数 ${lastDay.stops.length} が多すぎる`,
      });
    }
  }

  details.push(`ペース: ${pace}, 平均ストップ数: ${(draft.days.reduce((s, d) => s + d.stops.length, 0) / draft.days.length).toFixed(1)}`);

  return {
    category: 'day_flow_quality',
    score: Math.max(0, score),
    details,
    violations,
  };
}
