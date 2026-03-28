import type {
  PlanMutationErrorCode,
  PlanMutationMeta,
  PlanMutationResult,
  PlanMutationType,
} from '@/types/plan-mutation';

interface MutationMetaOverrides extends Partial<Omit<PlanMutationMeta, 'mutationType'>> {
  durationMs?: number;
  warnings?: string[];
}

function buildMutationMeta(
  mutationType: PlanMutationType,
  overrides?: MutationMetaOverrides,
): PlanMutationMeta {
  return {
    mutationType,
    durationMs: overrides?.durationMs ?? 0,
    warnings: overrides?.warnings ?? [],
    retryCount: overrides?.retryCount,
    fallbackUsed: overrides?.fallbackUsed,
  };
}

export function mutationSuccess<T>(
  mutationType: PlanMutationType,
  data: T,
  overrides?: MutationMetaOverrides,
): PlanMutationResult<T> {
  return {
    ok: true,
    data,
    meta: buildMutationMeta(mutationType, overrides),
  };
}

export function mutationFailure<T>(
  mutationType: PlanMutationType,
  error: PlanMutationErrorCode,
  overrides?: MutationMetaOverrides,
): PlanMutationResult<T> {
  return {
    ok: false,
    error,
    meta: buildMutationMeta(mutationType, overrides),
  };
}
