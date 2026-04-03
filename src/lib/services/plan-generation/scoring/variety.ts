/**
 * Variety Scorer
 * カテゴリ多様性、同一ストップ重複の検出
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

function normalizeStopName(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\([^)]*\)|（[^）]*）/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function scoreVariety(
  draft: DraftPlan,
  _normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;

  // ---- 同一ストップ重複 ----
  const allNames = draft.days.flatMap(d =>
    d.stops.map(s => ({ name: normalizeStopName(s.name), originalName: s.name, day: d.day, draftId: s.draftId })),
  );
  const nameCounts = new Map<string, typeof allNames>();

  for (const entry of allNames) {
    const existing = nameCounts.get(entry.name) ?? [];
    existing.push(entry);
    nameCounts.set(entry.name, existing);
  }

  for (const [name, entries] of nameCounts) {
    if (entries.length > 1) {
      score -= 10;
      const dayList = entries.map((entry) => entry.day).join(', ');
      for (const entry of entries) {
        violations.push({
          severity: 'error',
          category: 'variety',
          scope: { type: 'day', day: entry.day },
          message: `ストップ「${entry.originalName}」が重複しています (Day ${dayList})`,
          suggestedFix: '他の日と重複しない実在スポットに置き換えてください',
        });
      }
    }
  }

  // ---- カテゴリ多様性 (全体) ----
  const allCategories = draft.days.flatMap(d =>
    d.stops.map(s => s.categoryHint?.toLowerCase() ?? 'unknown'),
  );
  const uniqueCategories = new Set(allCategories);

  if (allCategories.length >= 5 && uniqueCategories.size <= 2) {
    score -= 15;
    violations.push({
      severity: 'warning',
      category: 'variety',
      scope: { type: 'plan' },
      message: `カテゴリの多様性が低い: ${uniqueCategories.size} 種類のみ`,
    });
  }
  details.push(`カテゴリ: ${uniqueCategories.size} 種類`);

  // ---- 1日内のカテゴリ偏重 ----
  for (const day of draft.days) {
    const dayCategories = day.stops.map(s => s.categoryHint?.toLowerCase() ?? 'unknown');
    const catCounts = new Map<string, number>();
    for (const cat of dayCategories) {
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }

    for (const [cat, count] of catCounts) {
      if (cat !== 'unknown' && count >= 3 && count / day.stops.length > 0.6) {
        score -= 5;
        violations.push({
          severity: 'info',
          category: 'variety',
          scope: { type: 'day', day: day.day },
          message: `Day ${day.day}: カテゴリ「${cat}」が ${count}/${day.stops.length} と偏重`,
        });
      }
    }
  }

  return {
    category: 'variety',
    score: Math.max(0, score),
    details,
    violations,
  };
}
