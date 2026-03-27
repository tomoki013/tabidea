/**
 * Spatial Coherence Scorer
 * 1日内のエリア集中度、過剰な移動の検出
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

export function scoreSpatialCoherence(
  draft: DraftPlan,
  _normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;

  for (const day of draft.days) {
    // エリアヒントの多様性 — 1日内で異なるエリアが多すぎないか
    const uniqueAreas = new Set(
      day.stops.map(s => normalizeArea(s.areaHint)).filter(Boolean),
    );

    if (uniqueAreas.size > 4) {
      score -= 8;
      violations.push({
        severity: 'warning',
        category: 'spatial_coherence',
        scope: { type: 'day', day: day.day },
        message: `Day ${day.day}: ${uniqueAreas.size} エリアを訪問 — 移動が多すぎる`,
        suggestedFix: 'エリアを 2-3 に絞って集中的に回る構成にしてください',
      });
    } else if (uniqueAreas.size <= 2) {
      details.push(`Day ${day.day}: エリア集中度◎ (${uniqueAreas.size}エリア)`);
    }

    // エリアのバックトラック検出 (A→B→A パターン)
    const areaSequence = day.stops.map(s => normalizeArea(s.areaHint));
    for (let i = 2; i < areaSequence.length; i++) {
      if (
        areaSequence[i] &&
        areaSequence[i] === areaSequence[i - 2] &&
        areaSequence[i] !== areaSequence[i - 1]
      ) {
        score -= 5;
        violations.push({
          severity: 'warning',
          category: 'spatial_coherence',
          scope: { type: 'day', day: day.day },
          message: `Day ${day.day}: エリアバックトラック検出 (${areaSequence[i - 2]}→${areaSequence[i - 1]}→${areaSequence[i]})`,
        });
        break; // 1日1回だけカウント
      }
    }
  }

  return {
    category: 'spatial_coherence',
    score: Math.max(0, score),
    details,
    violations,
  };
}

/** エリア名を正規化 (末尾の「エリア」「周辺」を除去して比較しやすくする) */
function normalizeArea(area: string): string {
  return area
    .replace(/(エリア|周辺|付近|地区|area|district)/gi, '')
    .trim()
    .toLowerCase();
}
