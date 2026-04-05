/**
 * Plan Run State Machine
 * 状態遷移の検証と、進行中 pass の解決を行う純粋関数群
 */

import type {
  DraftValidationResult,
  PlanRun,
  PlanRunPassId,
  PlanRunState,
  PlanRunResumeHint,
} from '@/types/plan-run';
import { PLAN_RUN_VALID_TRANSITIONS } from '@/types/plan-run';
import { InvalidPlanRunStateTransitionError } from './errors';

export function validateTransition(from: PlanRunState, to: PlanRunState): boolean {
  return PLAN_RUN_VALID_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PlanRunState, to: PlanRunState): void {
  if (!validateTransition(from, to)) {
    throw new InvalidPlanRunStateTransitionError(from, to);
  }
}

function shouldRepair(validation: DraftValidationResult | undefined): boolean {
  return Boolean(validation && !validation.valid && validation.repairTargetDays.length > 0);
}

export function determineNextPass(run: Pick<PlanRun, 'pauseContext' | 'lastCompletedPassId' | 'validationResult'>): PlanRunPassId | null {
  if (run.pauseContext?.resumePassId) {
    return run.pauseContext.resumePassId;
  }

  switch (run.lastCompletedPassId) {
    case undefined:
      return 'normalize_request';
    case 'normalize_request':
      return 'plan_frame_build';
    case 'plan_frame_build':
      return 'draft_generate';
    case 'draft_generate':
      return 'draft_validate';
    case 'draft_validate':
      return shouldRepair(run.validationResult) ? 'draft_repair_local' : 'timeline_finalize';
    case 'draft_repair_local':
      return 'draft_validate';
    case 'timeline_finalize':
      return 'completion_gate';
    case 'completion_gate':
      return 'persist_completed_trip';
    case 'persist_completed_trip':
      return null;
    default:
      return null;
  }
}

export function canExecute(state: PlanRunState): boolean {
  return state === 'created' || state === 'paused';
}

export function buildResumeHint(run: Pick<PlanRun, 'state' | 'pauseContext'>): PlanRunResumeHint {
  if (run.state === 'running') {
    return { mode: 'none' };
  }

  if (run.state !== 'paused' || !run.pauseContext) {
    return { mode: 'none' };
  }

  switch (run.pauseContext.pauseReason) {
    case 'runtime_budget_exhausted':
    case 'day_unit_boundary':
      return { mode: 'auto', reason: run.pauseContext.pauseReason, retryAfterMs: 750 };
    case 'infrastructure_interrupted':
    default:
      return { mode: 'manual', reason: run.pauseContext.pauseReason };
  }
}
