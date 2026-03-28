/**
 * Pass Executor
 * セッション状態を見て次のパスを実行し、結果に応じて状態を遷移させる。
 * 実行方式 (HTTP/Queue/Worker) に依存しない。
 */

import type {
  PlanGenerationSession,
  PassId,
  PassResult,
  PassBudget,
  PassContext,
  PassOutcome,
  PassRunRecord,
  RepairRecord,
  SessionState,
} from '@/types/plan-generation';
import { getNextPassForState, getStateAfterPassCompleted } from './state-machine';
import { loadSession, updateSession, transitionState, countPassRuns } from './session-store';
import { getPass } from './passes';
import { PlanGenerationLogger } from './logger';
import { PassExecutionError, PassBudgetExceededError } from './errors';
import { DEFAULT_RETRY_POLICIES, DEFAULT_QUALITY_POLICY } from './constants';
import { createV4PipelineTimer } from '@/lib/utils/performance-timer';

export interface ExecutorResult {
  passId: PassId;
  outcome: PassOutcome;
  newState: SessionState;
  warnings: string[];
  durationMs: number;
  session: PlanGenerationSession;
}

/**
 * セッションの次のパスを実行する
 *
 * 1. セッションを取得
 * 2. 次のパスを特定
 * 3. PassContext を構築
 * 4. パスを実行
 * 5. 結果に応じて状態遷移 + データ保存
 * 6. ログ記録
 */
export async function executeNextPass(
  sessionId: string,
  budget: PassBudget,
): Promise<ExecutorResult> {
  const session = await loadSession(sessionId);
  const logger = new PlanGenerationLogger(sessionId);

  // 次のパスを特定 (draft_scored ではセッションデータで分岐)
  const passId = getNextPassForState(session.state, session);
  if (!passId) {
    throw new PassExecutionError(
      'normalize', // dummy
      `No next pass for state "${session.state}"`,
    );
  }

  const passFn = getPass(passId);
  if (!passFn) {
    throw new PassExecutionError(
      passId,
      `Pass "${passId}" is not registered (Phase 2+ pass?)`,
    );
  }

  // PassContext を構築
  const retryPolicy = DEFAULT_RETRY_POLICIES[passId];
  const ctx: PassContext = {
    session,
    budget,
    retryPolicy,
    qualityPolicy: DEFAULT_QUALITY_POLICY,
  };

  // 予算チェック: 残り時間が 0 以下なら実行前に打ち切り
  const remainingMs = budget.remainingMs();
  if (remainingMs <= 0) {
    throw new PassBudgetExceededError(passId, budget.maxExecutionMs, budget.maxExecutionMs - remainingMs);
  }

  // PerformanceTimer で計測
  const timer = createV4PipelineTimer(passId);

  // パス実行
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  let result: PassResult;
  let attempt = 1;

  try {
    result = await timer.measure(passId, () => passFn(ctx));
  } catch (err) {
    // リトライ対象かチェック
    const errorName = err instanceof Error ? err.constructor.name : 'UnknownError';
    if (
      attempt <= retryPolicy.maxRetries &&
      retryPolicy.retryableErrors.includes(errorName)
    ) {
      attempt++;
      await new Promise(r => setTimeout(r, retryPolicy.backoffMs));
      try {
        result = await timer.measure(`${passId}_retry`, () => passFn(ctx));
      } catch (retryErr) {
        result = {
          outcome: 'failed_terminal',
          warnings: [`Pass "${passId}" failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`],
          durationMs: Date.now() - startMs,
        };
      }
    } else {
      result = {
        outcome: 'failed_terminal',
        warnings: [`Pass "${passId}" failed: ${err instanceof Error ? err.message : String(err)}`],
        durationMs: Date.now() - startMs,
      };
    }
  }

  // パフォーマンスレポート出力
  timer.log();

  // 結果に応じた処理
  let newState: SessionState = session.state;

  switch (result.outcome) {
    case 'completed': {
      newState = getStateAfterPassCompleted(passId);
      await transitionState(sessionId, session.state, newState);
      // パスのデータをセッションに保存
      await savePassData(sessionId, passId, result, session);
      break;
    }

    case 'partial': {
      // チェックポイントを保存、状態は変えない
      if (result.checkpointCursor) {
        await updateSession(sessionId, {
          checkpointCursor: result.checkpointCursor,
        });
      }
      break;
    }

    case 'needs_retry': {
      // DB から実際の実行回数を取得してリトライ上限を判定
      const priorAttempts = await countPassRuns(sessionId, passId);
      const totalAttempts = priorAttempts + attempt;
      if (totalAttempts > retryPolicy.maxRetries + 1) {
        newState = 'failed';
        await transitionState(sessionId, session.state, 'failed');
      }
      // まだリトライ可能なら状態は変えない
      break;
    }

    case 'failed_terminal': {
      newState = 'failed';
      await transitionState(sessionId, session.state, 'failed');
      break;
    }
  }

  // 警告をセッションに蓄積
  if (result.warnings.length > 0) {
    await updateSession(sessionId, {
      warnings: [...session.warnings, ...result.warnings],
    });
  }

  // ログ記録 (fire-and-forget)
  logger.logPassRun({
    passId,
    attempt,
    outcome: result.outcome,
    durationMs: result.durationMs,
    startedAt,
    metadata: result.metadata,
  });

  // 更新後のセッションを取得
  const updatedSession = await loadSession(sessionId);

  return {
    passId,
    outcome: result.outcome,
    newState,
    warnings: result.warnings,
    durationMs: result.durationMs,
    session: updatedSession,
  };
}

/** パスのデータをセッションの対応フィールドに保存 */
async function savePassData(
  sessionId: string,
  passId: PassId,
  result: PassResult,
  session: PlanGenerationSession,
): Promise<void> {
  if (!result.data) return;

  // local_repair は draftPlan を上書き + repairHistory に追記
  if (passId === 'local_repair') {
    const repairRecord = result.metadata?.repairRecord as RepairRecord | undefined;
    const patch: Record<string, unknown> = { draftPlan: result.data };
    if (repairRecord) {
      patch.repairHistory = [...session.repairHistory, repairRecord];
    }
    await updateSession(sessionId, patch as Parameters<typeof updateSession>[1]);
    return;
  }

  const fieldMap: Partial<Record<PassId, string>> = {
    normalize: 'normalizedInput',
    draft_generate: 'draftPlan',
    rule_score: 'evaluationReport',
    selective_verify: 'verifiedEntities',
    timeline_construct: 'timelineState',
    narrative_polish: 'narrativeState',
  };

  const field = fieldMap[passId];
  if (!field) return;

  await updateSession(sessionId, {
    [field]: result.data,
  } as Parameters<typeof updateSession>[1]);
}
