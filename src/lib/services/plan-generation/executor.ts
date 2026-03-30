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
  PipelineContext,
  RepairRecord,
  SessionState,
} from '@/types/plan-generation';
import { getNextPassForState, getStateAfterPassCompleted } from './state-machine';
import { loadRun, persistRunSession, countRunPasses } from './run-store';
import { getPass } from './passes';
import { PlanGenerationLogger } from './logger';
import { PassExecutionError, PassBudgetExceededError } from './errors';
import { DEFAULT_RETRY_POLICIES, DEFAULT_QUALITY_POLICY } from './constants';
import { createV4PipelineTimer } from '@/lib/utils/performance-timer';
import { logRunCheckpoint } from '@/lib/agent/run-checkpoint-log';

export interface ExecutorResult {
  passId: PassId;
  outcome: PassOutcome;
  newState: SessionState;
  warnings: string[];
  durationMs: number;
  metadata?: Record<string, unknown>;
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
  initialSession?: PlanGenerationSession,
): Promise<ExecutorResult> {
  const session = initialSession ?? await loadRun(sessionId);
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
  const priorAttempts = retryPolicy.maxRetries > 0
    ? await countRunPasses(sessionId, passId)
    : 0;
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
  let attempt = priorAttempts + 1;

  const logPassStart = (attemptNumber: number) => {
    logRunCheckpoint({
      checkpoint: 'pass_started',
      runId: sessionId,
      state: session.state,
      pipelineContext: session.pipelineContext,
      passId,
      attempt: attemptNumber,
      remainingMs: Math.max(0, budget.remainingMs()),
    });
  };

  logPassStart(attempt);

  try {
    result = await timer.measure(passId, () => passFn(ctx));
  } catch (err) {
    const errorName = err instanceof Error ? err.constructor.name : 'UnknownError';
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[executor] Pass "${passId}" threw ${errorName}: ${errorMsg} (attempt ${attempt}, ${Date.now() - startMs}ms)`);

    // リトライ対象かチェック
    if (
      attempt <= retryPolicy.maxRetries &&
      retryPolicy.retryableErrors.includes(errorName)
    ) {
      attempt++;
      console.log(`[executor] Retrying pass "${passId}" (attempt ${attempt}) after ${retryPolicy.backoffMs}ms backoff`);
      await new Promise(r => setTimeout(r, retryPolicy.backoffMs));
      logPassStart(attempt);
      try {
        result = await timer.measure(`${passId}_retry`, () => passFn(ctx));
      } catch (retryErr) {
        console.error(`[executor] Pass "${passId}" retry failed: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`);
        result = {
          outcome: 'failed_terminal',
          warnings: [`Pass "${passId}" failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`],
          durationMs: Date.now() - startMs,
        };
      }
    } else {
      result = {
        outcome: 'failed_terminal',
        warnings: [`Pass "${passId}" failed: ${errorMsg}`],
        durationMs: Date.now() - startMs,
      };
    }
  }

  // パフォーマンスレポート出力
  timer.log();

  // 結果に応じた処理
  let newState: SessionState = session.state;
  const patch = buildPassPersistencePatch(passId, result, session);

  switch (result.outcome) {
    case 'completed': {
      newState = getStateAfterPassCompleted(passId);
      break;
    }

    case 'partial': {
      break;
    }

    case 'needs_retry': {
      const totalAttempts = attempt;
      console.log(`[executor] Pass "${passId}" needs_retry — total attempts: ${totalAttempts}/${retryPolicy.maxRetries + 1}, warnings: ${result.warnings.join('; ')}`);
      if (totalAttempts > retryPolicy.maxRetries + 1) {
        console.error(`[executor] Pass "${passId}" exceeded retry limit — marking session as failed`);
        newState = 'failed';
      }
      // まだリトライ可能なら状態は変えない
      break;
    }

    case 'failed_terminal': {
      newState = 'failed';
      break;
    }
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

  const hasPatch = Object.keys(patch).length > 0 || newState !== session.state;
  const updatedSession = hasPatch
    ? await persistRunSession(sessionId, session.state, newState, patch)
    : session;

  const verificationCounts = passId === 'selective_verify'
    ? {
      verifiedCount: updatedSession.verifiedEntities.filter((entity) => entity.status === 'confirmed').length,
      flaggedCount: updatedSession.verifiedEntities.filter((entity) => entity.status !== 'confirmed').length,
    }
    : undefined;

  const checkpointPayload = {
    runId: sessionId,
    state: newState,
    pipelineContext: updatedSession.pipelineContext,
    passId,
    attempt,
    substage: typeof result.metadata?.substage === 'string' ? result.metadata.substage : undefined,
    outcome: result.outcome,
    durationMs: result.durationMs,
    remainingMs: Math.max(0, budget.remainingMs()),
    selectedTimeoutMs: typeof result.metadata?.selectedTimeoutMs === 'number'
      ? result.metadata.selectedTimeoutMs
      : undefined,
    maxTokens: typeof result.metadata?.maxTokens === 'number'
      ? result.metadata.maxTokens
      : undefined,
    promptChars: typeof result.metadata?.promptChars === 'number'
      ? result.metadata.promptChars
      : undefined,
    plannerContractVersion: typeof result.metadata?.plannerContractVersion === 'string'
      ? result.metadata.plannerContractVersion
      : undefined,
    invalidFieldPath: typeof result.metadata?.invalidFieldPath === 'string'
      ? result.metadata.invalidFieldPath
      : undefined,
    validationIssueCode: typeof result.metadata?.validationIssueCode === 'string'
      ? result.metadata.validationIssueCode
      : undefined,
    formatterContractVersion: typeof result.metadata?.formatterContractVersion === 'string'
      ? result.metadata.formatterContractVersion
      : undefined,
    recoveryMode: typeof result.metadata?.recoveryMode === 'string'
      ? result.metadata.recoveryMode
      : undefined,
    usedTextRecovery: typeof result.metadata?.usedTextRecovery === 'boolean'
      ? result.metadata.usedTextRecovery
      : undefined,
    nextDayIndex: typeof result.metadata?.nextDayIndex === 'number'
      ? result.metadata.nextDayIndex
      : undefined,
    dayChunkIndex: typeof result.metadata?.dayChunkIndex === 'number'
      ? result.metadata.dayChunkIndex
      : undefined,
    seedAttempt: typeof result.metadata?.seedAttempt === 'number'
      ? result.metadata.seedAttempt
      : undefined,
    dayAttempt: typeof result.metadata?.dayAttempt === 'number'
      ? result.metadata.dayAttempt
      : undefined,
    outlineAttempt: typeof result.metadata?.outlineAttempt === 'number'
      ? result.metadata.outlineAttempt
      : undefined,
    chunkAttempt: typeof result.metadata?.chunkAttempt === 'number'
      ? result.metadata.chunkAttempt
      : undefined,
    plannerStrategy: typeof result.metadata?.plannerStrategy === 'string'
      ? result.metadata.plannerStrategy
      : undefined,
    warningCodes: result.warnings,
    ...(verificationCounts
      ? {
        toolSummary: {
          verifiedCount: verificationCounts.verifiedCount,
          flaggedCount: verificationCounts.flaggedCount,
          toolCallsUsed: 1,
        },
      }
      : {}),
  };

  if (result.outcome === 'failed_terminal') {
    logRunCheckpoint({
      checkpoint: 'pass_failed',
      ...checkpointPayload,
      errorCode: typeof result.metadata?.errorCode === 'string' ? result.metadata.errorCode : result.warnings[0] ?? 'run_failed',
      rootCause: typeof result.metadata?.rootCause === 'string' ? result.metadata.rootCause : undefined,
    });
  } else {
    logRunCheckpoint({
      checkpoint: 'pass_completed',
      ...checkpointPayload,
    });
  }

  return {
    passId,
    outcome: result.outcome,
    newState,
    warnings: result.warnings,
    durationMs: result.durationMs,
    metadata: result.metadata,
    session: updatedSession,
  };
}

/** パスのデータをセッションの対応フィールドに保存 */
function buildPassPersistencePatch(
  passId: PassId,
  result: PassResult,
  session: PlanGenerationSession,
): Partial<PlanGenerationSession> {
  const patch: Partial<PlanGenerationSession> = {};
  const pipelineContextPatch = result.metadata?.pipelineContextPatch as Partial<PipelineContext> | undefined;
  const sessionPatch = result.metadata?.sessionPatch as Partial<PlanGenerationSession> | undefined;

  if (result.outcome === 'partial' && result.checkpointCursor) {
    patch.checkpointCursor = result.checkpointCursor;
  }

  if (pipelineContextPatch) {
    patch.pipelineContext = {
      ...(session.pipelineContext ?? {}),
      ...pipelineContextPatch,
    };
  }

  if (result.warnings.length > 0) {
    patch.warnings = [...session.warnings, ...result.warnings];
  }

  if (sessionPatch) {
    Object.assign(patch, sessionPatch);
  }

  if (!result.data) return patch;

  // local_repair は draftPlan を上書き + repairHistory に追記
  if (passId === 'local_repair') {
    const repairRecord = result.metadata?.repairRecord as RepairRecord | undefined;
    patch.draftPlan = result.data as PlanGenerationSession['draftPlan'];
    if (repairRecord) {
      patch.repairHistory = [...session.repairHistory, repairRecord];
    }
    return patch;
  }

  switch (passId) {
    case 'normalize':
      patch.normalizedInput = result.data as PlanGenerationSession['normalizedInput'];
      return patch;
    case 'draft_generate':
      if (sessionPatch?.plannerSeed !== undefined) {
        patch.plannerSeed = sessionPatch.plannerSeed;
      }
      patch.plannerDraft = result.data as PlanGenerationSession['plannerDraft'];
      return patch;
    case 'draft_format':
      patch.draftPlan = result.data as PlanGenerationSession['draftPlan'];
      return patch;
    case 'rule_score':
      patch.evaluationReport = result.data as PlanGenerationSession['evaluationReport'];
      return patch;
    case 'selective_verify':
      patch.verifiedEntities = result.data as PlanGenerationSession['verifiedEntities'];
      return patch;
    case 'timeline_construct':
      patch.timelineState = result.data as PlanGenerationSession['timelineState'];
      return patch;
    case 'narrative_polish':
      patch.narrativeState = result.data as PlanGenerationSession['narrativeState'];
      return patch;
    default:
      return patch;
  }
}
