"use server";

import { getUserBillingStatus } from "@/lib/billing/user-billing-status";
import { checkBillingAccess } from "@/lib/billing/billing-checker";
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
