/**
 * Plan Generation State Machine
 * セッション状態の遷移を検証・管理する純粋関数群
 */

import type { SessionState, PassId, PlanGenerationSession } from '@/types/plan-generation';
import { VALID_TRANSITIONS } from '@/types/plan-generation';
import { InvalidStateTransitionError } from './errors';
import { MAX_REPAIR_ITERATIONS, MIN_REPAIR_IMPROVEMENT } from './constants';

function hasContiguousDaySet(
  days: Array<{ day: number }> | undefined,
  expectedDayCount: number | undefined,
): boolean {
  if (!expectedDayCount || !days || days.length !== expectedDayCount) {
    return false;
  }

  const dayNumbers = new Set(days.map((day) => day.day));
  for (let day = 1; day <= expectedDayCount; day += 1) {
    if (!dayNumbers.has(day)) {
      return false;
    }
  }

  return true;
}

function getExpectedDayCount(session: PlanGenerationSession): number | undefined {
  return session.normalizedInput?.durationDays;
}

export function hasCompletePlannerSeed(session: PlanGenerationSession): boolean {
  return hasContiguousDaySet(session.plannerSeed?.days, getExpectedDayCount(session));
}

export function hasCompletePlannerDraft(session: PlanGenerationSession): boolean {
  const expectedDayCount = getExpectedDayCount(session);
  if (!hasContiguousDaySet(session.plannerDraft?.days, expectedDayCount)) {
    return false;
  }

  return session.plannerDraft!.days.every((day) => Array.isArray(day.stops) && day.stops.length > 0);
}

export function hasCompleteDraftPlan(session: PlanGenerationSession): boolean {
  const expectedDayCount = getExpectedDayCount(session);
  if (!hasContiguousDaySet(session.draftPlan?.days, expectedDayCount)) {
    return false;
  }

  return session.draftPlan!.days.every((day) => Array.isArray(day.stops) && day.stops.length > 0);
}

export function hasCompleteTimelineState(session: PlanGenerationSession): boolean {
  const expectedDayCount = getExpectedDayCount(session);
  if (!hasContiguousDaySet(session.timelineState?.days, expectedDayCount)) {
    return false;
  }

  return session.timelineState!.days.every((day) => Array.isArray(day.nodes) && day.nodes.length > 0);
}

/**
 * 状態遷移が合法かどうかを検証する
 */
export function validateTransition(from: SessionState, to: SessionState): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * 状態遷移が合法でない場合に例外を投げる
 */
export function assertTransition(from: SessionState, to: SessionState): void {
  if (!validateTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

/** 状態 → 次に実行すべきパスのマッピング */
const STATE_TO_NEXT_PASS: Partial<Record<SessionState, PassId>> = {
  created:                'normalize',
  normalized:             'draft_generate',
  draft_generated:        'draft_format',
  draft_formatted:        'rule_score',
  draft_scored:           'local_repair',
  draft_repaired_partial: 'rule_score',
  verification_partial:   'timeline_construct',
  timeline_ready:         'narrative_polish',
  core_ready:             'narrative_polish',
  enrichment_running:     'narrative_polish',
};

/**
 * 現在の状態から次に実行すべきパスを返す。
 * 終端状態 (completed / failed_terminal / cancelled) の場合は null。
 *
 * draft_scored 状態では session のデータを参照して
 * repair / verify のどちらに進むかを判断する。
 */
export function getNextPassForState(
  state: SessionState,
  session?: PlanGenerationSession,
): PassId | null {
  if (state === 'draft_scored' && session) {
    return decideAfterScoring(session);
  }
  return STATE_TO_NEXT_PASS[state] ?? null;
}

/**
 * スコアリング後の分岐判断:
 *  - pass → 検証へ進む
 *  - fail/marginal + 修復余地あり → local_repair
 *  - 修復上限到達 or 改善なし → 検証へ進む
 */
function decideAfterScoring(session: PlanGenerationSession): PassId {
  const report = session.evaluationReport;
  if (!report) return 'local_repair'; // evaluationReport 未設定は異常系 → repair で安全側に

  const iterations = session.repairHistory.length;

  // pass → 修復不要、検証へ
  if (report.passGrade === 'pass') {
    return 'selective_verify';
  }

  // 修復上限に到達 → ベストエフォートで検証へ
  if (iterations >= MAX_REPAIR_ITERATIONS) {
    return 'selective_verify';
  }

  // marginal + 前回の修復で十分な改善がなかった → 打ち切り
  if (report.passGrade === 'marginal' && iterations > 0) {
    const lastRepair = session.repairHistory[iterations - 1];
    if (!lastRepair.improved || (lastRepair.afterScore - lastRepair.beforeScore) < MIN_REPAIR_IMPROVEMENT) {
      return 'selective_verify';
    }
  }

  // fail or marginal (改善余地あり) → 修復
  return 'local_repair';
}

/**
 * failed セッションから再開可能な最新の状態を判定する。
 * セッションに保存されたデータから、最後に成功したパスの完了状態を返す。
 */
export function determineResumeState(session: PlanGenerationSession): SessionState {
  // 最も進んだ状態から逆順でチェック
  if (session.pipelineContext?.finalizedTripId && typeof session.pipelineContext?.finalizedTripVersion === 'number') {
    return 'core_ready';
  }
  if (hasCompleteTimelineState(session)) return 'timeline_ready';
  if (session.verifiedEntities && session.verifiedEntities.length > 0 && hasCompleteDraftPlan(session)) return 'verification_partial';
  if (session.evaluationReport && hasCompleteDraftPlan(session)) return 'draft_scored';
  if (hasCompleteDraftPlan(session)) return 'draft_formatted';
  if (session.pipelineContext?.currentDayExecution) return 'normalized';
  if (session.pipelineContext?.resumePassId === 'draft_generate') return 'normalized';
  if (hasCompletePlannerDraft(session)) return 'draft_generated';
  if (session.normalizedInput) return 'normalized';
  return 'created';
}

/** 状態遷移後の SessionState を PassId + PassOutcome から導出 */
const PASS_COMPLETED_STATE: Record<PassId, SessionState> = {
  normalize:          'normalized',
  draft_generate:     'draft_generated',
  draft_format:       'draft_formatted',
  rule_score:         'draft_scored',
  local_repair:       'draft_repaired_partial',
  selective_verify:   'verification_partial',
  timeline_construct: 'timeline_ready',
  narrative_polish:   'completed',
};

/**
 * パスが completed で終了した場合の遷移先状態を返す
 */
export function getStateAfterPassCompleted(passId: PassId): SessionState {
  return PASS_COMPLETED_STATE[passId];
}
