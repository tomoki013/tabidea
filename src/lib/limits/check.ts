/**
 * @deprecated Use billing-checker.ts instead
 * Compatibility layer for limit checking
 */

import {
  checkAndConsumeQuota,
  getUsageStatus as getUnifiedUsageStatus,
  checkPlanStorageLimit as checkUnifiedPlanStorageLimit,
  checkBillingAccess
} from '@/lib/billing/billing-checker';
import type { ActionType, UserType } from '@/lib/limits/config';

export interface ResolvedUsageUser {
  id: string;
  email: string | null;
}

// Define Legacy Interface to maintain compatibility
export interface LegacyLimitCheckResult {
  allowed: boolean;
  source?: 'subscription' | 'ticket' | 'free' | 'admin' | 'anonymous';
  userType: UserType;
  userId: string | null;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date | null;
  error?: string;
}

// Export as LimitCheckResult
export type LimitCheckResult = LegacyLimitCheckResult;

/**
 * 制限をチェックし、許可されれば使用を記録する（アトミック操作）
 *
 * Delegates to Unified Billing Service
 */
export async function checkAndRecordUsage(
  action: ActionType,
  metadata?: Record<string, unknown>,
  options?: { skipConsume?: boolean; resolvedUser?: ResolvedUsageUser | null }
): Promise<LegacyLimitCheckResult> {
  if (options?.skipConsume) {
    // Read-only path still needs billing info for userType
    const [usageStatus, billing] = await Promise.all([
      getUnifiedUsageStatus(action),
      checkBillingAccess({ skipAdminCheck: true }),
    ]);

    let currentCount = 0;
    if (usageStatus.limit !== -1) {
      currentCount = usageStatus.limit - usageStatus.remaining;
    }

    return {
      allowed: usageStatus.remaining !== 0,
      userType: billing.userType,
      userId: billing.userId,
      currentCount,
      limit: usageStatus.limit,
      remaining: usageStatus.remaining,
      resetAt: usageStatus.resetAt,
    };
  }

  // Consume path: checkAndConsumeQuota now returns userType/userId directly,
  // eliminating the redundant second checkBillingAccess call
  const result = await checkAndConsumeQuota(action, metadata, {
    resolvedUser: options?.resolvedUser,
  });

  let currentCount = 0;
  if (result.limit !== -1) {
    currentCount = result.limit - result.remaining;
  }

  return {
    allowed: result.allowed,
    source: result.source,
    userType: result.userType ?? 'anonymous',
    userId: result.userId ?? null,
    currentCount,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    error: result.error,
  };
}

/**
 * 現在の使用状況を取得（表示用、記録はしない）
 */
export async function getUsageStatus(action: ActionType): Promise<{
  userType: UserType;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date | null;
}> {
  const billing = await checkBillingAccess({ skipAdminCheck: true });
  const status = await getUnifiedUsageStatus(action);

  const currentCount = status.limit === -1 ? 0 : (status.limit - status.remaining);

  return {
    userType: billing.userType,
    currentCount: Math.max(0, currentCount),
    limit: status.limit,
    remaining: status.remaining,
    resetAt: status.resetAt
  };
}

/**
 * プラン保存数をチェック
 */
export async function checkPlanStorageLimit(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  return checkUnifiedPlanStorageLimit();
}
