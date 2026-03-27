/**
 * Verification Risk Scorer
 * AI 確信度が低いストップ、幻覚リスクの高いストップを検出
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

export function scoreVerificationRisk(
  draft: DraftPlan,
  _normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;
  let lowConfidenceCount = 0;
  let totalStops = 0;

  for (const day of draft.days) {
    for (const stop of day.stops) {
      totalStops++;

      if (stop.aiConfidence === 'low') {
        lowConfidenceCount++;
        violations.push({
          severity: 'warning',
          category: 'verification_risk',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId },
          message: `"${stop.name}" — AI 確信度: low`,
        });
      }

      // searchQuery が name と同一 or 空 → 検証困難
      if (!stop.searchQuery || stop.searchQuery === stop.name) {
        violations.push({
          severity: 'info',
          category: 'verification_risk',
          scope: { type: 'stop', day: day.day, draftId: stop.draftId },
          message: `"${stop.name}" — searchQuery が不十分`,
        });
      }
    }
  }

  // low confidence 比率によるスコア減算
  if (totalStops > 0) {
    const lowRatio = lowConfidenceCount / totalStops;
    if (lowRatio > 0.4) {
      score -= 30;
    } else if (lowRatio > 0.2) {
      score -= 15;
    } else if (lowConfidenceCount > 0) {
      score -= lowConfidenceCount * 5;
    }

    details.push(`Low confidence: ${lowConfidenceCount}/${totalStops} (${Math.round(lowRatio * 100)}%)`);
  }

  return {
    category: 'verification_risk',
    score: Math.max(0, score),
    details,
    violations,
  };
}
