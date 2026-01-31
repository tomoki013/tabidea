"use server";

import { getUserBillingStatus } from "@/lib/billing/user-billing-status";
import { checkBillingAccess } from "@/lib/billing/billing-checker";
import { getUsageStatus, checkPlanStorageLimit } from "@/lib/limits/check";
import type { UserBillingStatus, BillingAccessInfo } from "@/types/billing";

/**
 * Get billing status for the current user
 * @deprecated Use getBillingAccessInfo() instead for more comprehensive information
 */
export async function getBillingStatus(): Promise<UserBillingStatus | null> {
  return getUserBillingStatus();
}

/**
 * Get comprehensive billing access information for the current user
 *
 * This is the recommended function for all billing-related checks.
 * It provides a single, comprehensive view of the user's billing status.
 *
 * @example
 * const billing = await getBillingAccessInfo();
 * if (billing.isPremium) {
 *   // Show premium features
 * }
 */
export async function getBillingAccessInfo(): Promise<BillingAccessInfo> {
  return checkBillingAccess();
}

/**
 * Usage statistics for the UI
 */
export interface UsageStats {
  planGeneration: {
    current: number;
    limit: number;
    remaining: number;
    resetAt: Date | null;
  };
  travelInfo: {
    current: number;
    limit: number;
    remaining: number;
    resetAt: Date | null;
  };
  planStorage: {
    current: number;
    limit: number;
  };
}

/**
 * Get usage statistics for the current user
 */
export async function getUserUsageStats(): Promise<UsageStats> {
  const [planGen, travelInfo, storage] = await Promise.all([
    getUsageStatus('plan_generation'),
    getUsageStatus('travel_info'),
    checkPlanStorageLimit(),
  ]);

  return {
    planGeneration: {
      current: planGen.currentCount,
      limit: planGen.limit,
      remaining: planGen.remaining,
      resetAt: planGen.resetAt,
    },
    travelInfo: {
      current: travelInfo.currentCount,
      limit: travelInfo.limit,
      remaining: travelInfo.remaining,
      resetAt: travelInfo.resetAt,
    },
    planStorage: {
      current: storage.currentCount,
      limit: storage.limit,
    },
  };
}
