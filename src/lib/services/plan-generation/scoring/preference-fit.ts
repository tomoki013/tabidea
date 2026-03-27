/**
 * Preference Fit Scorer
 * テーマ反映、travelVibe 整合、ソフト希望のカバレッジ
 */

import type { DraftPlan, CategoryScore, Violation } from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';

export function scorePreferenceFit(
  draft: DraftPlan,
  normalized: NormalizedRequest,
): CategoryScore {
  const violations: Violation[] = [];
  const details: string[] = [];

  let score = 100;

  // ---- テーマ反映 ----
  if (normalized.themes.length > 0) {
    const allTags = draft.days.flatMap(d =>
      d.stops.flatMap(s => [...(s.tags ?? []), s.categoryHint ?? '']),
    ).map(t => t.toLowerCase());
    const allStopNames = draft.days.flatMap(d =>
      d.stops.map(s => [s.name, s.activityLabel ?? '', s.rationale].join(' ').toLowerCase()),
    );
    const combined = [...allTags, ...allStopNames].join(' ');

    let themesReflected = 0;
    for (const theme of normalized.themes) {
      if (combined.includes(theme.toLowerCase())) {
        themesReflected++;
      }
    }

    const themeRatio = normalized.themes.length > 0
      ? themesReflected / normalized.themes.length
      : 1;

    if (themeRatio < 0.5) {
      score -= 25;
      violations.push({
        severity: 'warning',
        category: 'preference_fit',
        scope: { type: 'plan' },
        message: `テーマの反映が不十分: ${themesReflected}/${normalized.themes.length}`,
      });
    } else {
      details.push(`✓ テーマ ${themesReflected}/${normalized.themes.length} 反映`);
    }
  }

  // ---- travelVibe 整合 ----
  if (normalized.travelVibe) {
    const planText = [
      draft.description,
      draft.tripIntentSummary,
      ...draft.days.map(d => d.summary),
    ].join(' ').toLowerCase();

    if (!planText.includes(normalized.travelVibe.toLowerCase())) {
      score -= 10;
      violations.push({
        severity: 'info',
        category: 'preference_fit',
        scope: { type: 'plan' },
        message: `旅の雰囲気「${normalized.travelVibe}」が旅程の説明に反映されていない可能性`,
      });
    }
  }

  // ---- ソフト希望カバレッジ ----
  const rankedRequests = normalized.softPreferences.rankedRequests;
  if (rankedRequests.length > 0) {
    const planFullText = [
      draft.description,
      ...draft.days.flatMap(d => [
        d.summary,
        ...d.stops.map(s => `${s.name} ${s.rationale} ${s.activityLabel ?? ''}`),
      ]),
    ].join(' ').toLowerCase();

    let covered = 0;
    for (const request of rankedRequests) {
      const keywords = request.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matched = keywords.some(kw => planFullText.includes(kw));
      if (matched) covered++;
    }

    const coverage = rankedRequests.length > 0
      ? covered / rankedRequests.length
      : 1;

    if (coverage < 0.3) {
      score -= 20;
      violations.push({
        severity: 'warning',
        category: 'preference_fit',
        scope: { type: 'plan' },
        message: `ユーザー希望のカバレッジが低い: ${covered}/${rankedRequests.length}`,
      });
    } else {
      details.push(`✓ 希望カバレッジ ${covered}/${rankedRequests.length}`);
    }
  }

  return {
    category: 'preference_fit',
    score: Math.max(0, score),
    details,
    violations,
  };
}
