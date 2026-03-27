/**
 * Temporal Realism Scorer
 * 滞在時間の妥当性、1日の合計時間、深夜アクティビティの検出
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

/** 1日の活動可能時間 (分) — 8:00〜22:00 = 840分 */
const MAX_DAY_MINUTES = 840;

/** 移動のデフォルト見積もり (分/ストップ間) */
const DEFAULT_TRANSIT_MINUTES = 30;

export function scoreTemporalRealism(
  draft: DraftPlan,
  _normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;

  for (const day of draft.days) {
    // 1日の合計滞在時間 + 移動見積もり
    const totalStay = day.stops.reduce((sum, s) => sum + s.stayDurationMinutes, 0);
    const transitEstimate = Math.max(0, day.stops.length - 1) * DEFAULT_TRANSIT_MINUTES;
    const totalDay = totalStay + transitEstimate;

    if (totalDay > MAX_DAY_MINUTES) {
      score -= 8;
      violations.push({
        severity: 'warning',
        category: 'temporal_realism',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: 合計 ${totalDay}分 (滞在 ${totalStay}分 + 移動 ~${transitEstimate}分) が活動可能時間 ${MAX_DAY_MINUTES}分 を超過`,
      });
    }

    // 個別ストップの滞在時間チェック
    for (const stop of day.stops) {
      if (stop.stayDurationMinutes < 15 && stop.role !== 'accommodation') {
        violations.push({
          severity: 'info',
          category: 'temporal_realism',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId },
          message: `"${stop.name}" の滞在 ${stop.stayDurationMinutes}分 が短すぎる`,
        });
      }
      if (stop.stayDurationMinutes > 300 && stop.role !== 'accommodation') {
        score -= 3;
        violations.push({
          severity: 'warning',
          category: 'temporal_realism',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId },
          message: `"${stop.name}" の滞在 ${stop.stayDurationMinutes}分 が長すぎる`,
        });
      }
    }

    // night スロットが多すぎないか
    const nightStops = day.stops.filter(s => s.timeSlotHint === 'night');
    if (nightStops.length > 2) {
      score -= 5;
      violations.push({
        severity: 'warning',
        category: 'temporal_realism',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: 夜間アクティビティが ${nightStops.length} 件`,
      });
    }
  }

  const avgStay = draft.days.length > 0
    ? Math.round(
        draft.days.reduce((s, d) =>
          s + d.stops.reduce((ss, st) => ss + st.stayDurationMinutes, 0), 0,
        ) / draft.days.reduce((s, d) => s + d.stops.length, 0),
      )
    : 0;
  details.push(`平均滞在時間: ${avgStay}分/ストップ`);

  return {
    category: 'temporal_realism',
    score: Math.max(0, score),
    details,
    violations,
  };
}
