/**
 * Unified Billing Checker Service
 *
 * This is the SINGLE SOURCE OF TRUTH for all billing-related checks.
 * All billing status checks, subscription verifications, and access
 * control decisions should go through this service.
 *
 * Usage:
 *   const billing = await checkBillingAccess();
 *   if (billing.isPremium) { ... }
 */

import { createClient } from '@/lib/supabase/server';
import type { PlanType } from '@/types/billing';
import type { UserType } from '@/lib/limits/config';

// ============================================
// Types
// ============================================

/**
 * Comprehensive billing access information
 * This interface provides all billing-related data in a single object
 */
export interface BillingAccessInfo {
  // User identity
  userId: string | null;
  email: string | null;

  // User classification
  userType: UserType;

  // Subscription status
  isSubscribed: boolean;
  planType: PlanType;
  subscriptionEndsAt: string | null;

  // Ticket information
  ticketCount: number;

  // Derived access flags (for convenience)
  isPremium: boolean;
  isAdmin: boolean;
  isFree: boolean;
  isAnonymous: boolean;

  // Subscription details (for internal use)
  subscriptionId?: string;
  externalSubscriptionId?: string;
  subscriptionStatus?: string;
}

/**
 * Options for billing access check
 */
export interface CheckBillingOptions {
  /**
   * If true, skip the admin check (for performance when admin status is not needed)
   */
  skipAdminCheck?: boolean;
}

// ============================================
// Admin Check Helper
// ============================================

/**
 * Check if the given email belongs to an admin user
 * Admin emails are configured via ADMIN_EMAILS environment variable
 */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

// ============================================
// Core Billing Check Function
// ============================================

/**
 * Check the billing access status for the current user
 *
 * This is the PRIMARY function for all billing checks in the application.
 * It performs a single, optimized query to gather all billing-related information.
 *
 * @param options - Optional configuration for the check
 * @returns BillingAccessInfo with comprehensive billing status
 *
 * @example
 * // Basic usage
 * const billing = await checkBillingAccess();
 * if (billing.isPremium) {
 *   // Allow premium features
 * }
 *
 * @example
 * // Check user type
 * const billing = await checkBillingAccess();
 * switch (billing.userType) {
 *   case 'admin': // Full access
 *   case 'premium': // Paid features
 *   case 'free': // Limited features
 *   case 'anonymous': // Very limited
 * }
 */
export async function checkBillingAccess(
  options?: CheckBillingOptions
): Promise<BillingAccessInfo> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Anonymous user - no billing data
  if (authError || !user) {
    return createAnonymousBillingInfo();
  }

  // Check admin status first (via email or database)
  const isAdmin = !options?.skipAdminCheck && (isAdminEmail(user.email) || (await checkAdminInDb(supabase, user.id)));

  if (isAdmin) {
    return createAdminBillingInfo(user.id, user.email ?? null);
  }

  // Fetch subscription and tickets in parallel for performance
  const [subscriptionResult, ticketsResult] = await Promise.all([
    fetchActiveSubscription(supabase, user.id),
    fetchTicketCount(supabase, user.id),
  ]);

  // Determine user type based on subscription status
  const hasValidSubscription =
    subscriptionResult.hasActive && isSubscriptionPeriodValid(subscriptionResult.subscription?.currentPeriodEnd);

  const userType: UserType = hasValidSubscription ? 'premium' : 'free';

  return {
    userId: user.id,
    email: user.email ?? null,
    userType,
    isSubscribed: hasValidSubscription,
    planType: hasValidSubscription
      ? (subscriptionResult.subscription?.planCode as PlanType) ?? 'pro_monthly'
      : 'free',
    subscriptionEndsAt: subscriptionResult.subscription?.currentPeriodEnd ?? null,
    ticketCount: ticketsResult,
    isPremium: hasValidSubscription,
    isAdmin: false,
    isFree: !hasValidSubscription,
    isAnonymous: false,
    subscriptionId: subscriptionResult.subscription?.id,
    externalSubscriptionId: subscriptionResult.subscription?.externalSubscriptionId,
    subscriptionStatus: subscriptionResult.subscription?.status,
  };
}

/**
 * Check billing access for a specific user ID
 * Useful for admin operations or webhook processing
 */
export async function checkBillingAccessForUser(
  userId: string
): Promise<BillingAccessInfo> {
  const supabase = await createClient();

  // Fetch user info
  const { data: userData } = await supabase
    .from('users')
    .select('email, is_admin')
    .eq('id', userId)
    .single();

  const email = userData?.email ?? null;
  const isAdmin = userData?.is_admin === true || isAdminEmail(email);

  if (isAdmin) {
    return createAdminBillingInfo(userId, email);
  }

  // Fetch subscription and tickets in parallel
  const [subscriptionResult, ticketsResult] = await Promise.all([
    fetchActiveSubscription(supabase, userId),
    fetchTicketCount(supabase, userId),
  ]);

  const hasValidSubscription =
    subscriptionResult.hasActive && isSubscriptionPeriodValid(subscriptionResult.subscription?.currentPeriodEnd);

  const userType: UserType = hasValidSubscription ? 'premium' : 'free';

  return {
    userId,
    email,
    userType,
    isSubscribed: hasValidSubscription,
    planType: hasValidSubscription
      ? (subscriptionResult.subscription?.planCode as PlanType) ?? 'pro_monthly'
      : 'free',
    subscriptionEndsAt: subscriptionResult.subscription?.currentPeriodEnd ?? null,
    ticketCount: ticketsResult,
    isPremium: hasValidSubscription,
    isAdmin: false,
    isFree: !hasValidSubscription,
    isAnonymous: false,
    subscriptionId: subscriptionResult.subscription?.id,
    externalSubscriptionId: subscriptionResult.subscription?.externalSubscriptionId,
    subscriptionStatus: subscriptionResult.subscription?.status,
  };
}

// ============================================
// Specialized Check Functions
// ============================================

/**
 * Check if the current user has an active subscription
 * This is a lightweight check for double-payment prevention in checkout flow
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
  const supabase = await createClient();
  return fetchActiveSubscription(supabase, userId);
}

/**
 * Quick check if current user is premium (subscription or admin)
 * Optimized for performance-critical paths
 */
export async function isPremiumUser(): Promise<boolean> {
  const billing = await checkBillingAccess();
  return billing.isPremium || billing.isAdmin;
}

/**
 * Get the user type for the current user
 * Backwards-compatible with existing code
 */
export async function getUserType(): Promise<UserType> {
  const billing = await checkBillingAccess();
  return billing.userType;
}

// ============================================
// Internal Helper Functions
// ============================================

/**
 * Create billing info for anonymous users
 */
function createAnonymousBillingInfo(): BillingAccessInfo {
  return {
    userId: null,
    email: null,
    userType: 'anonymous',
    isSubscribed: false,
    planType: 'free',
    subscriptionEndsAt: null,
    ticketCount: 0,
    isPremium: false,
    isAdmin: false,
    isFree: false,
    isAnonymous: true,
  };
}

/**
 * Create billing info for admin users
 */
function createAdminBillingInfo(userId: string, email: string | null): BillingAccessInfo {
  return {
    userId,
    email,
    userType: 'admin',
    isSubscribed: false,
    planType: 'admin',
    subscriptionEndsAt: null,
    ticketCount: 0,
    isPremium: true, // Admins have premium access
    isAdmin: true,
    isFree: false,
    isAnonymous: false,
  };
}

/**
 * Check if user is admin in database
 */
async function checkAdminInDb(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return data?.is_admin === true;
}

/**
 * Fetch active subscription for a user
 */
async function fetchActiveSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{
  hasActive: boolean;
  subscription?: {
    id: string;
    externalSubscriptionId: string;
    status: string;
    currentPeriodEnd: string;
    planCode?: string;
  };
}> {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('id, external_subscription_id, status, current_period_end, plan_code')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !subscription) {
    return { hasActive: false };
  }

  // Verify period is still valid
  if (!isSubscriptionPeriodValid(subscription.current_period_end)) {
    return { hasActive: false };
  }

  return {
    hasActive: true,
    subscription: {
      id: subscription.id,
      externalSubscriptionId: subscription.external_subscription_id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      planCode: subscription.plan_code,
    },
  };
}

/**
 * Fetch total ticket count for a user
 */
async function fetchTicketCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { data: tickets } = await supabase
    .from('entitlement_grants')
    .select('remaining_count')
    .eq('user_id', userId)
    .eq('entitlement_type', 'plan_generation')
    .eq('grant_type', 'ticket_pack')
    .eq('status', 'active')
    .gt('valid_until', new Date().toISOString());

  return tickets?.reduce((sum, t) => sum + (t.remaining_count || 0), 0) || 0;
}

/**
 * Check if subscription period end date is valid (in the future)
 */
function isSubscriptionPeriodValid(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false;
  return new Date(periodEnd) > new Date();
}

// ============================================
// Re-exports for convenience
// ============================================

export { isAdminEmail };
