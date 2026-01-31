/**
 * User Type Detection
 *
 * This module provides backwards-compatible functions for user type detection.
 * Internally, it delegates to the unified BillingChecker service.
 *
 * @deprecated For new code, use checkBillingAccess() from billing-checker.ts directly
 */

import { checkBillingAccess } from '@/lib/billing/billing-checker';
import type { UserType } from './config';

export interface UserInfo {
  type: UserType;
  userId: string | null;
  email: string | null;
}

/**
 * Server Action内でユーザー種別を取得
 *
 * @deprecated Use checkBillingAccess() from billing-checker.ts instead
 * This function is kept for backwards compatibility
 */
export async function getUserInfo(): Promise<UserInfo> {
  const billing = await checkBillingAccess();

  return {
    type: billing.userType,
    userId: billing.userId,
    email: billing.email,
  };
}

/**
 * Get user type (client-callable version)
 *
 * @deprecated Use checkBillingAccess() from billing-checker.ts instead
 * This function is kept for backwards compatibility
 */
export async function getUserTypeClient(): Promise<UserType> {
  const billing = await checkBillingAccess();
  return billing.userType;
}

// Re-export the new unified function for gradual migration
export { checkBillingAccess } from '@/lib/billing/billing-checker';
