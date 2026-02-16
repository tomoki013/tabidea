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

// Define Legacy Interface to maintain compatibility
export interface LegacyLimitCheckResult {
  allowed: boolean;
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
  options?: { skipConsume?: boolean }
): Promise<LegacyLimitCheckResult> {
  const usageStatus = options?.skipConsume
    ? await getUnifiedUsageStatus(action)
    : await checkAndConsumeQuota(action, metadata);

  // We need userType and userId for full compatibility
  // Note: checkAndConsumeQuota already fetched user, but we need to fetch again or change its return type.
  // For now, fetching billing info is safer to ensure we have the type.
  const billing = await checkBillingAccess({ skipAdminCheck: true });

  // Calculate current count approximation
  let currentCount = 0;
  if (usageStatus.limit !== -1) {
    currentCount = usageStatus.limit - usageStatus.remaining;
  }

  return {
    allowed: options?.skipConsume ? usageStatus.remaining !== 0 : (usageStatus as { allowed: boolean }).allowed,
    userType: billing.userType,
    userId: billing.userId,
    currentCount,
    limit: usageStatus.limit,
    remaining: usageStatus.remaining,
    resetAt: usageStatus.resetAt,
    error: (usageStatus as { error?: string }).error
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
