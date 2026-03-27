/**
 * Plan Generation Session Logger
 * パイプライン実行の観測ログ (fire-and-forget)
 *
 * GenerationRunLogger と同じパターン:
 * - DB 書き込みエラーでパイプラインを止めない
 * - .catch(() => {}) で全操作をラップ
 */

import type { PassId, PassOutcome, PassRunRecord } from '@/types/plan-generation';
import { appendPassRun } from './session-store';

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

    appendPassRun(this.sessionId, record).catch(() => {
      // fire-and-forget: never block pipeline on DB error
    });
  }
}
