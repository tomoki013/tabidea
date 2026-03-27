/**
 * Rubric Registry
 * 全 9 カテゴリのスコアラーを集約し、EvaluationReport を生成する
 */

import type {
  DraftPlan,
  EvaluationReport,
  CategoryScore,
  Violation,
  RepairTarget,
  RubricCategory,
  ViolationScope,
} from '@/types/plan-generation';
import type { NormalizedRequest } from '@/types/itinerary-pipeline';
import { RUBRIC_WEIGHTS, GRADE_THRESHOLDS } from '../constants';
import { scoreConstraintFit } from './constraint-fit';
import { scorePreferenceFit } from './preference-fit';
import { scoreDestinationAuthenticity } from './destination-authenticity';
import { scoreDayFlowQuality } from './day-flow-quality';
import { scoreTemporalRealism } from './temporal-realism';
import { scoreSpatialCoherence } from './spatial-coherence';
import { scoreVariety } from './variety';
import { scoreEditability } from './editability';
import { scoreVerificationRisk } from './verification-risk';

type CategoryScorer = (draft: DraftPlan, normalized: NormalizedRequest) => CategoryScore;

const SCORERS: Record<RubricCategory, CategoryScorer> = {
  constraint_fit: scoreConstraintFit,
  preference_fit: scorePreferenceFit,
  destination_authenticity: scoreDestinationAuthenticity,
  day_flow_quality: scoreDayFlowQuality,
  temporal_realism: scoreTemporalRealism,
  spatial_coherence: scoreSpatialCoherence,
  variety: scoreVariety,
  editability: scoreEditability,
  verification_risk: scoreVerificationRisk,
};

/**
 * ドラフトを全ルブリックカテゴリで評価し、EvaluationReport を返す
 */
export function evaluateDraft(
  draft: DraftPlan,
  normalized: NormalizedRequest,
): EvaluationReport {
  const categoryScores: CategoryScore[] = [];

  // 各カテゴリを採点
  for (const [category, scorer] of Object.entries(SCORERS)) {
    const score = scorer(draft, normalized);
    categoryScores.push(score);
  }

  // 重み付きスコア計算
  let weightedSum = 0;
  let weightTotal = 0;

  for (const cs of categoryScores) {
    const weight = RUBRIC_WEIGHTS[cs.category];
    weightedSum += cs.score * weight;
    weightTotal += 100 * weight; // 各カテゴリの満点は 100
  }

  const overallScore = weightTotal > 0
    ? Math.round(weightedSum / weightTotal * 100)
    : 0;

  // 全違反をフラットに集約
  const violations = categoryScores.flatMap(cs => cs.violations);

  // 合否判定
  const passGrade = overallScore >= GRADE_THRESHOLDS.pass
    ? 'pass'
    : overallScore >= GRADE_THRESHOLDS.marginal
      ? 'marginal'
      : 'fail';

  // 修復対象を特定 (error 重大度の違反を scope でグループ化)
  const repairTargets = buildRepairTargets(violations);

  return {
    overallScore,
    categoryScores,
    violations,
    passGrade,
    repairTargets,
  };
}

/**
 * error 重大度の違反を scope でグループ化し、修復対象リストを作成
 */
function buildRepairTargets(violations: Violation[]): RepairTarget[] {
  const errors = violations.filter(v => v.severity === 'error');
  if (errors.length === 0) return [];

  // scope でグループ化
  const groups = new Map<string, { scope: ViolationScope; violations: Violation[] }>();

  for (const v of errors) {
    const key = scopeKey(v.scope);
    const group = groups.get(key);
    if (group) {
      group.violations.push(v);
    } else {
      groups.set(key, { scope: v.scope, violations: [v] });
    }
  }

  // priority 付き配列に変換 (違反が多い順)
  return Array.from(groups.values())
    .sort((a, b) => b.violations.length - a.violations.length)
    .map((g, i) => ({
      scope: g.scope,
      violations: g.violations,
      priority: i + 1,
    }));
}

function scopeKey(scope: ViolationScope): string {
  switch (scope.type) {
    case 'plan': return 'plan';
    case 'day': return `day:${scope.day}`;
    case 'stop': return `stop:${scope.day}:${scope.draftId}`;
    case 'cluster': return `cluster:${scope.day}:${scope.draftIds.join(',')}`;
  }
}
