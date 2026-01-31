/**
 * User Billing Status
 *
 * This module provides backwards-compatible functions for billing status checks.
 * Internally, it delegates to the unified BillingChecker service.
 *
 * @deprecated For new code, use checkBillingAccess() from billing-checker.ts directly
 */

import type { UserBillingStatus } from '@/types/billing';
import {
  checkBillingAccess,
  hasActiveSubscription as billingHasActiveSubscription,
} from './billing-checker';

/**
 * Get the billing status for the current user
 *
 * @deprecated Use checkBillingAccess() from billing-checker.ts instead
 * This function is kept for backwards compatibility
 */
export async function getUserBillingStatus(): Promise<UserBillingStatus | null> {
  const billing = await checkBillingAccess();

  // Return null for anonymous users (backwards compatibility)
  if (billing.isAnonymous) {
    return null;
  }

  return {
    planType: billing.planType,
    isSubscribed: billing.isSubscribed,
    subscriptionEndsAt: billing.subscriptionEndsAt ?? undefined,
    ticketCount: billing.ticketCount,
  };
}

/**
 * Check if a user has an active subscription
 *
 * @deprecated Use hasActiveSubscription() from billing-checker.ts instead
 * This function is kept for backwards compatibility
 */
export async function hasActiveSubscription(userId: string): Promise<{
  hasActive: boolean;
  subscription?: {
    id: string;
    externalSubscriptionId: string;
    status: string;
    currentPeriodEnd: string;
  };
}> {
  return billingHasActiveSubscription(userId);
}

// Re-export the new unified function for gradual migration
export { checkBillingAccess } from './billing-checker';
