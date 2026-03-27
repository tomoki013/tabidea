/**
 * Destination Authenticity Scorer
 * その目的地ならではのスポットか、generic filler ではないかを判定
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { GENERIC_NAME_PATTERNS } from '../constants';

export function scoreDestinationAuthenticity(
  draft: DraftPlan,
  _normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;
  let genericCount = 0;
  let totalStops = 0;

  for (const day of draft.days) {
    for (const stop of day.stops) {
      totalStops++;

      // generic 名称チェック
      const isGeneric = GENERIC_NAME_PATTERNS.some(pattern =>
        pattern.test(stop.name),
      );

      if (isGeneric) {
        genericCount++;
        violations.push({
          severity: 'error',
          category: 'destination_authenticity',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId },
          message: `Generic 名称: "${stop.name}"`,
          suggestedFix: '具体的な実在する場所名に置き換えてください',
        });
      }

      // low confidence + no searchQuery = 高リスク
      if (stop.aiConfidence === 'low' && !stop.searchQuery) {
        violations.push({
          severity: 'warning',
          category: 'destination_authenticity',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId },
          message: `Low confidence で searchQuery なし: "${stop.name}"`,
        });
      }
    }
  }

  // generic 比率によるスコア減算
  if (totalStops > 0) {
    const genericRatio = genericCount / totalStops;
    if (genericRatio > 0.3) {
      score -= 40;
    } else if (genericRatio > 0.15) {
      score -= 25;
    } else if (genericRatio > 0) {
      score -= genericCount * 8;
    }
    details.push(`Generic 名称: ${genericCount}/${totalStops} (${Math.round(genericRatio * 100)}%)`);
  }

  // 目的地名がストップに反映されているか (目的地らしさ)
  const destKeywords = draft.destination.toLowerCase().split(/[\s,、・]+/).filter(w => w.length > 1);
  const allAreas = draft.days.map(d => d.mainArea.toLowerCase());
  const areaMatch = destKeywords.some(kw => allAreas.some(a => a.includes(kw)));
  if (!areaMatch && destKeywords.length > 0) {
    score -= 10;
    violations.push({
      severity: 'info',
      category: 'destination_authenticity',
      scope: { type: 'plan' },
      message: `目的地「${draft.destination}」の地名が各日の mainArea に現れていない`,
    });
  }

  return {
    category: 'destination_authenticity',
    score: Math.max(0, score),
    details,
    violations,
  };
}
