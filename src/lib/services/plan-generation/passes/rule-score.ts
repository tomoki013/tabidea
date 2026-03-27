/**
 * Pass C: Rule-Based Scoring
 * ドラフトの品質をルールベースで採点する
 * AI は使わない — 純粋 TypeScript ロジック
 */

import type { PassContext, PassResult, EvaluationReport } from '@/types/plan-generation';
import { evaluateDraft } from '../scoring/rubric-registry';

export async function ruleScorePass(ctx: PassContext): Promise<PassResult<EvaluationReport>> {
  const start = Date.now();

  const draft = ctx.session.draftPlan;
  const normalized = ctx.session.normalizedInput;

  if (!draft || !normalized) {
    return {
      outcome: 'failed_terminal',
      warnings: ['No draftPlan or normalizedInput in session'],
      durationMs: Date.now() - start,
    };
  }

  const report = evaluateDraft(draft, normalized);

  // error レベルの違反がありスコアが極端に低い場合は QualityThresholdError で通知
  const errorViolations = report.violations.filter(v => v.severity === 'error');
  if (errorViolations.length > 0 && report.overallScore < ctx.qualityPolicy.minOverallScore) {
    const warnings = errorViolations.map(v => `[${v.category}] ${v.message}`);
    return {
      outcome: 'completed',
      data: report,
      warnings,
      durationMs: Date.now() - start,
      metadata: {
        overallScore: report.overallScore,
        passGrade: report.passGrade,
        violationCount: report.violations.length,
        repairTargetCount: report.repairTargets.length,
        qualityThresholdBreached: true,
      },
    };
  }

  return {
    outcome: 'completed',
    data: report,
    warnings: [],
    durationMs: Date.now() - start,
    metadata: {
      overallScore: report.overallScore,
      passGrade: report.passGrade,
      violationCount: report.violations.length,
      repairTargetCount: report.repairTargets.length,
    },
  };
}
