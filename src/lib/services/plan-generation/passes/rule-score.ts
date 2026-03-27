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
