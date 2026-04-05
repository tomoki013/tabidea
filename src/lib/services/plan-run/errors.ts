/**
 * Plan Run Pipeline エラークラス
 */

import type { PlanRunState } from '@/types/plan-run';

export class InvalidPlanRunStateTransitionError extends Error {
  constructor(from: PlanRunState, to: PlanRunState) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = 'InvalidPlanRunStateTransitionError';
  }
}

export class PlanRunNotFoundError extends Error {
  constructor(runId: string) {
    super(`PlanRun not found: ${runId}`);
    this.name = 'PlanRunNotFoundError';
  }
}

export class CompletionGateError extends Error {
  constructor(
    message: string,
    public readonly failedChecks: string[],
  ) {
    super(message);
    this.name = 'CompletionGateError';
  }
}

export class HardValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: string[],
  ) {
    super(message);
    this.name = 'HardValidationError';
  }
}

export class PlanRunStoreOperationError extends Error {
  constructor(
    message: string,
    public readonly stage: 'claim_execution' | 'commit_slice' | 'load_run' | 'update_run',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PlanRunStoreOperationError';
  }
}
