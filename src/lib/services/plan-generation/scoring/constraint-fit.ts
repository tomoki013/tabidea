/**
 * Constraint Fit Scorer
 * must-visit 充足、fixedSchedule 遵守、日数・宿泊制約の検証
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

export function scoreConstraintFit(
  draft: DraftPlan,
  normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;

  // ---- must-visit 充足 ----
  const allStopNames = draft.days.flatMap(d =>
    d.stops.map(s => s.name.toLowerCase()),
  );

  for (const place of normalized.hardConstraints.mustVisitPlaces) {
    const found = allStopNames.some(
      name => name.includes(place.toLowerCase()) || place.toLowerCase().includes(name),
    );
    if (!found) {
      score -= 25;
      violations.push({
        severity: 'error',
        category: 'constraint_fit',
        scope: { type: 'plan' },
        message: `必須スポット「${place}」が旅程に含まれていません`,
        suggestedFix: `「${place}」をいずれかの日に追加してください`,
      });
    } else {
      details.push(`✓ must-visit「${place}」を確認`);
    }
  }

  // ---- 日数一致 ----
  if (draft.days.length !== normalized.durationDays) {
    score -= 20;
    violations.push({
      severity: 'error',
      category: 'constraint_fit',
      scope: { type: 'plan' },
      message: `日数が不一致: 要求 ${normalized.durationDays}日 vs 生成 ${draft.days.length}日`,
    });
  } else {
    details.push(`✓ 日数 ${normalized.durationDays}日 一致`);
  }

  // ---- 目的地一致 ----
  const draftDest = draft.destination.toLowerCase();
  const destMatch = normalized.destinations.some(d =>
    draftDest.includes(d.toLowerCase()) || d.toLowerCase().includes(draftDest),
  );
  if (!destMatch && normalized.destinations.length > 0) {
    score -= 15;
    violations.push({
      severity: 'error',
      category: 'constraint_fit',
      scope: { type: 'plan' },
      message: `目的地が不一致: 要求 ${normalized.destinations.join(', ')} vs 生成 ${draft.destination}`,
    });
  }

  // ---- 固定ホテルの宿泊地反映 ----
  for (const hotel of normalized.hardConstraints.fixedHotels) {
    const matched = draft.days.some(d =>
      d.overnightLocation.toLowerCase().includes(hotel.name.toLowerCase()) ||
      hotel.name.toLowerCase().includes(d.overnightLocation.toLowerCase()),
    );
    if (!matched) {
      score -= 10;
      violations.push({
        severity: 'warning',
        category: 'constraint_fit',
        scope: { type: 'plan' },
        message: `予約済みホテル「${hotel.name}」が宿泊地に反映されていません`,
      });
    }
  }

  return {
    category: 'constraint_fit',
    score: Math.max(0, score),
    details,
    violations,
  };
}
