/**
 * Plan Generation Error Classes
 * パイプラインのエラー分類
 */

import type { PassId, SessionState } from '@/types/plan-generation';

/** パイプライン全般のベースエラー */
export class PlanGenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PlanGenerationError';
  }
}

/** 不正な状態遷移 */
export class InvalidStateTransitionError extends PlanGenerationError {
  public readonly from: SessionState;
  public readonly to: SessionState;

  constructor(from: SessionState, to: SessionState) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = 'InvalidStateTransitionError';
    this.from = from;
    this.to = to;
  }
}

/** パス実行中のエラー */
export class PassExecutionError extends PlanGenerationError {
  public readonly passId: PassId;

  constructor(passId: PassId, message: string, cause?: unknown) {
    super(`Pass "${passId}" failed: ${message}`, { cause });
    this.name = 'PassExecutionError';
    this.passId = passId;
  }
}

/** パスが時間予算を超過した */
export class PassBudgetExceededError extends PlanGenerationError {
  public readonly passId: PassId;
  public readonly budgetMs: number;
  public readonly actualMs: number;

  constructor(passId: PassId, budgetMs: number, actualMs: number) {
    super(`Pass "${passId}" exceeded budget: ${actualMs}ms > ${budgetMs}ms`);
    this.name = 'PassBudgetExceededError';
    this.passId = passId;
    this.budgetMs = budgetMs;
    this.actualMs = actualMs;
  }
}

/** 品質スコアが閾値を下回った */
export class QualityThresholdError extends PlanGenerationError {
  public readonly passId: PassId;
  public readonly score: number;
  public readonly threshold: number;

  constructor(passId: PassId, score: number, threshold: number) {
    super(`Pass "${passId}" quality below threshold: ${score} < ${threshold}`);
    this.name = 'QualityThresholdError';
    this.passId = passId;
    this.score = score;
    this.threshold = threshold;
  }
}

/** セッションが見つからない */
export class SessionNotFoundError extends PlanGenerationError {
  public readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
  }
}
