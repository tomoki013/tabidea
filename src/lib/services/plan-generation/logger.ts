/**
 * Plan Generation Session Logger
 * パイプライン実行の観測ログ (fire-and-forget)
 *
 * GenerationRunLogger と同じパターン:
 * - DB 書き込みエラーでパイプラインを止めない
 * - .catch(() => {}) で全操作をラップ
 */

import type { PassId, PassOutcome, PassRunRecord, PlanGenerationSession } from '@/types/plan-generation';
import { appendRunPass } from './run-store';
import { EventLogger } from '@/lib/services/analytics/event-logger';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export interface RunSummary {
  sessionId: string;
  finalState: string;
  totalDurationMs: number;
  passCount: number;
  repairIterations: number;
  destination?: string;
  durationDays?: number;
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export class PlanGenerationLogger {
  constructor(private readonly sessionId: string) {}

  /**
   * パス実行の開始・完了をログに記録
   * fire-and-forget: DB エラーはパイプラインを止めない
   */
  logPassRun(input: {
    passId: PassId;
    attempt: number;
    outcome: PassOutcome;
    durationMs: number;
    startedAt: string;
    metadata?: Record<string, unknown>;
  }): void {
    const record: PassRunRecord = {
      passId: input.passId,
      attempt: input.attempt,
      outcome: input.outcome,
      durationMs: input.durationMs,
      startedAt: input.startedAt,
      completedAt: new Date().toISOString(),
      metadata: input.metadata,
    };

    appendRunPass(this.sessionId, record).catch(() => {
      // fire-and-forget: never block pipeline on DB error
    });
  }

  /**
   * パイプライン実行全体のサマリをログに記録
   * generation_logs テーブルに EventLogger 経由で書き込む (v3 パリティ)
   */
  logRunSummary(summary: RunSummary): void {
    try {
      const supabase = createServiceRoleClient();
      const logger = new EventLogger(supabase);

      logger
        .logGeneration({
          eventType: 'plan_generated',
          destination: summary.destination,
          durationDays: summary.durationDays,
          processingTimeMs: summary.totalDurationMs,
          metadata: {
            pipeline: 'v4',
            sessionId: summary.sessionId,
            finalState: summary.finalState,
            passCount: summary.passCount,
            repairIterations: summary.repairIterations,
            warningCount: summary.warnings.length,
            ...summary.metadata,
          },
        })
        .catch(() => {
          // fire-and-forget
        });
    } catch {
      // fire-and-forget: never block pipeline on logging error
    }
  }

  /**
   * 完了したセッションからサマリを構築してログに記録
   */
  logCompletedSession(session: PlanGenerationSession, totalDurationMs: number): void {
    this.logRunSummary({
      sessionId: session.id,
      finalState: session.state,
      totalDurationMs,
      passCount: session.passRuns.length,
      repairIterations: session.repairHistory.length,
      destination: session.draftPlan?.destination,
      durationDays: session.draftPlan?.days.length,
      warnings: session.warnings,
    });
  }
}
