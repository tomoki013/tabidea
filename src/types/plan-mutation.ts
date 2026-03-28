import type { Itinerary } from './itinerary';
import type { ReplanResult } from './replan';

export type PlanMutationType = 'generation' | 'regeneration' | 'replan';

export type PlanMutationErrorCode =
  | 'api_key_missing'
  | 'missing_required_fields'
  | 'regenerate_no_effect'
  | 'regenerate_timeout'
  | 'regenerate_failed'
  | 'replan_timeout'
  | 'replan_failed';

export interface PlanMutationMeta {
  mutationType: PlanMutationType;
  durationMs: number;
  warnings: string[];
  retryCount?: number;
  fallbackUsed?: boolean;
}

export interface PlanRegenerationPayload {
  itinerary: Itinerary;
  changedDestination: boolean;
  retryUsed: boolean;
}

export type PlanReplanPayload = ReplanResult;

export interface PlanMutationSuccess<T> {
  ok: true;
  data: T;
  meta: PlanMutationMeta;
}

export interface PlanMutationFailure {
  ok: false;
  error: PlanMutationErrorCode;
  meta: PlanMutationMeta;
}

export type PlanMutationResult<T> = PlanMutationSuccess<T> | PlanMutationFailure;
