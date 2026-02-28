/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unified Billing Checker Service
 *
 * This is the SINGLE SOURCE OF TRUTH for all billing-related checks.
 * All billing status checks, subscription verifications, and access
 * control decisions should go through this service.
 */

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import type { PlanType } from '@/types/billing';
import {
  type UserType,
  type ActionType,
  PLAN_GENERATION_LIMITS,
  TRAVEL_INFO_LIMITS,
  isUnlimited
} from '@/lib/limits/config';

// ============================================
// Types
// ============================================

export interface BillingAccessInfo {
  userId: string | null;
  email: string | null;
  userType: UserType;
  isSubscribed: boolean;
  planType: PlanType;
  subscriptionEndsAt: string | null;
  ticketCount: number;
  isPro: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  isFree: boolean;
  isAnonymous: boolean;
  subscriptionId?: string;
  externalSubscriptionId?: string;
  subscriptionStatus?: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  source?: 'subscription' | 'ticket' | 'free' | 'admin' | 'anonymous';
  remaining: number;
  limit: number;
  resetAt: Date | null;
  error?: string;
}

export interface CheckBillingOptions {
  skipAdminCheck?: boolean;
}

interface QuotaSource {
  type: 'subscription' | 'ticket' | 'free' | 'admin';
  id?: string; // ticket grant id
  remaining: number;
  expiresAt: Date;
  priorityDate: Date; // Used for sorting (usually same as expiresAt)
}

// ============================================
// Admin Check Helper
// ============================================

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

// ============================================
// Plan Code → UserType Resolution
// ============================================

export function resolveUserTypeFromPlanCode(planCode: PlanType | undefined): UserType {
  switch (planCode) {
    case 'premium_monthly':
    case 'premium_yearly':
      return 'premium';
    case 'pro_monthly':
      return 'pro';
    default:
      console.warn(`[billing] Unknown plan code: ${planCode}, defaulting to 'free'`);
      return 'free';
  }
}

// ============================================
// Core Billing Check Functions
// ============================================

export async function checkBillingAccess(
  options?: CheckBillingOptions
): Promise<BillingAccessInfo> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createAnonymousBillingInfo();
  }

  const isAdmin = !options?.skipAdminCheck && isAdminEmail(user.email);
  if (isAdmin) {
    return createAdminBillingInfo(user.id, user.email ?? null);
  }

  const [subscriptionResult, ticketsResult] = await Promise.all([
    fetchActiveSubscription(supabase, user.id),
    fetchTicketCount(supabase, user.id),
  ]);

  const hasValidSubscription =
    subscriptionResult.hasActive && isSubscriptionPeriodValid(subscriptionResult.subscription?.currentPeriodEnd);

  const planCode = subscriptionResult.subscription?.planCode as PlanType | undefined;
  const userType: UserType = hasValidSubscription
    ? resolveUserTypeFromPlanCode(planCode)
    : 'free';

  return {
    userId: user.id,
    email: user.email ?? null,
    userType,
    isSubscribed: hasValidSubscription,
    planType: hasValidSubscription ? (planCode ?? 'pro_monthly') : 'free',
    subscriptionEndsAt: subscriptionResult.subscription?.currentPeriodEnd ?? null,
    ticketCount: ticketsResult,
    isPro: userType === 'pro',
    isPremium: userType === 'premium',
    isAdmin: false,
    isFree: !hasValidSubscription,
    isAnonymous: false,
    subscriptionId: subscriptionResult.subscription?.id,
    externalSubscriptionId: subscriptionResult.subscription?.externalSubscriptionId,
    subscriptionStatus: subscriptionResult.subscription?.status,
  };
}

/**
 * Check and Consume Quota based on Priority Logic
 * Priority: Expires Soonest (Subscription Month End vs Ticket Expiry)
 */
export async function checkAndConsumeQuota(
  action: ActionType,
  metadata?: Record<string, unknown>
): Promise<LimitCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Handle Anonymous Users (IP-based, legacy logic)
  if (!user) {
    return handleAnonymousUsage(action, metadata);
  }

  // 2. Handle Admin
  if (isAdminEmail(user.email)) {
    return {
      allowed: true,
      source: 'admin',
      remaining: -1,
      limit: -1,
      resetAt: null
    };
  }

  // 3. Gather Quota Sources
  // Fetch Subscription & Tickets
  const [subscriptionData, ticketsData, usageCount] = await Promise.all([
    fetchActiveSubscription(supabase, user.id),
    fetchValidTickets(supabase, user.id),
    fetchMonthlyUsageCount(supabase, user.id, action) // Excludes tickets
  ]);

  const now = new Date();
  const candidates: QuotaSource[] = [];

  // Source A: Subscription / Free Plan
  const hasActiveSub = subscriptionData.hasActive && isSubscriptionPeriodValid(subscriptionData.subscription?.currentPeriodEnd);
  const subPlanCode = subscriptionData.subscription?.planCode as PlanType | undefined;
  const userType: UserType = hasActiveSub
    ? resolveUserTypeFromPlanCode(subPlanCode)
    : 'free';

  const config = action === 'plan_generation'
    ? PLAN_GENERATION_LIMITS[userType]
    : TRAVEL_INFO_LIMITS[userType];

  // If unlimited, add as candidate with far future expiry
  if (isUnlimited(config)) {
     candidates.push({
       type: 'subscription', // or 'premium_unlimited'
       remaining: 999999,
       expiresAt: new Date(now.getFullYear() + 100, 0, 1), // Far future
       priorityDate: new Date(now.getFullYear() + 100, 0, 1)
     });
  } else {
    // Monthly Limit
    const limit = config.limit;
    const remaining = Math.max(0, limit - usageCount);

    // Calculate reset date (Month End)
    // Note: This aligns with "Subscription expires at next reset"
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    if (remaining > 0) {
      candidates.push({
        type: hasActiveSub ? 'subscription' : 'free',
        remaining,
        expiresAt: nextMonth,
        priorityDate: nextMonth
      });
    }
  }

  // Source B: Tickets
  // Only for plan_generation usually, but generic enough
  if (action === 'plan_generation') {
    for (const ticket of ticketsData) {
      if (ticket.remaining_count > 0 && ticket.valid_until) {
        const validUntil = new Date(ticket.valid_until);
        if (validUntil > now) {
          candidates.push({
            type: 'ticket',
            id: ticket.id,
            remaining: ticket.remaining_count,
            expiresAt: validUntil,
            priorityDate: validUntil
          });
        }
      }
    }
  }

  // 4. Select Best Source
  // Filter out expired or empty sources (already done above mostly)
  // Sort by Priority Date (ASC) -> Earliest expiry first
  candidates.sort((a, b) => a.priorityDate.getTime() - b.priorityDate.getTime());

  const selectedSource = candidates[0];

  if (!selectedSource) {
    return {
      allowed: false,
      currentCount: usageCount, // approx
      limit: config.limit,
      remaining: 0,
      resetAt: null, // Calc if needed
      error: 'Limit exceeded'
    } as any; // Cast to satisfy loose return type or fix type
  }

  // 5. Consume
  try {
    if (selectedSource.type === 'ticket' && selectedSource.id) {
      // Consume Ticket
      // Decrement
      const { error: updateError } = await supabase.rpc('decrement_ticket', {
        p_grant_id: selectedSource.id
      });

      // If RPC missing, use raw update (less safe but works for now if RPC not there)
      if (updateError) {
         // Fallback to raw update
         const { error: rawError } = await supabase
           .from('entitlement_grants')
           .update({ remaining_count: selectedSource.remaining - 1 })
           .eq('id', selectedSource.id)
           .eq('remaining_count', selectedSource.remaining); // optimistic lock

         if (rawError) throw rawError;
      }

      // Log Usage
      await supabase.from('usage_logs').insert({
        user_id: user.id,
        action_type: action,
        metadata: {
          ...metadata,
          source: 'ticket',
          grant_id: selectedSource.id
        }
      });

      return {
        allowed: true,
        source: 'ticket',
        remaining: selectedSource.remaining - 1,
        limit: selectedSource.remaining, // Ticket limit is itself
        resetAt: selectedSource.expiresAt
      };

    } else {
      // Consume Subscription / Free
      await supabase.from('usage_logs').insert({
        user_id: user.id,
        action_type: action,
        metadata: {
          ...metadata,
          source: selectedSource.type // 'subscription' or 'free'
        }
      });

      return {
        allowed: true,
        source: selectedSource.type as any,
        remaining: selectedSource.remaining - 1,
        limit: config.limit,
        resetAt: selectedSource.expiresAt
      };
    }
  } catch (err) {
    console.error('Consumption error:', err);
    return {
      allowed: false,
      error: 'Transaction failed',
      limit: 0,
      remaining: 0,
      resetAt: null
    };
  }
}

/**
 * Handle Anonymous Usage (Delegate to existing RPC or simplified logic)
 */
async function handleAnonymousUsage(action: ActionType, metadata?: any): Promise<LimitCheckResult> {
  const supabase = await createClient();
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || '0.0.0.0';

  const { data: hashData } = await supabase.rpc('get_ip_hash', { p_ip: ip });
  const ipHash = hashData;

  const config = action === 'plan_generation'
    ? PLAN_GENERATION_LIMITS['anonymous']
    : TRAVEL_INFO_LIMITS['anonymous'];

  const { data, error } = await supabase.rpc('check_and_record_usage', {
    p_user_id: null,
    p_ip_hash: ipHash,
    p_action_type: action,
    p_limit: config.limit,
    p_period: config.period,
    p_metadata: metadata || {},
  });

  if (error || !data.allowed) {
    return {
      allowed: false,
      source: 'anonymous',
      limit: config.limit,
      remaining: 0,
      resetAt: null,
      error: 'Limit exceeded'
    };
  }

  return {
    allowed: true,
    source: 'anonymous',
    limit: data.limit,
    remaining: data.remaining,
    resetAt: data.reset_at ? new Date(data.reset_at) : null
  };
}


// ============================================
// Data Fetching Helpers
// ============================================

async function fetchActiveSubscription(supabase: any, userId: string) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, external_subscription_id, status, current_period_end, plan_code')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!subscription) {
    return { hasActive: false };
  }

  return {
    hasActive: true,
    subscription: {
      id: subscription.id,
      externalSubscriptionId: subscription.external_subscription_id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      planCode: subscription.plan_code
    }
  };
}

async function fetchValidTickets(supabase: any, userId: string) {
  const { data: tickets } = await supabase
    .from('entitlement_grants')
    .select('id, remaining_count, valid_until')
    .eq('user_id', userId)
    .eq('entitlement_type', 'plan_generation')
    .eq('grant_type', 'ticket_pack')
    .eq('status', 'active')
    .gt('remaining_count', 0)
    .gt('valid_until', new Date().toISOString());

  return tickets || [];
}

async function fetchTicketCount(supabase: any, userId: string): Promise<number> {
  const tickets = await fetchValidTickets(supabase, userId);
  return tickets.reduce((sum: number, t: any) => sum + (t.remaining_count || 0), 0);
}

async function fetchMonthlyUsageCount(supabase: any, userId: string, action: ActionType): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Count logs where user_id matches, action matches, after start of month
  // AND source is NOT 'ticket'.
  // We use .or() to include rows where source is null (legacy/standard) OR source != ticket.
  // Note: Standard 'neq' filters out nulls, so we must explicitly handle nulls.
  const { count } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', action)
    .gte('created_at', startOfMonth.toISOString())
    .or('metadata->>source.is.null,metadata->>source.neq.ticket');

  return count || 0;
}

function isSubscriptionPeriodValid(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false;
  return new Date(periodEnd) > new Date();
}

function createAnonymousBillingInfo(): BillingAccessInfo {
  return {
    userId: null,
    email: null,
    userType: 'anonymous',
    isSubscribed: false,
    planType: 'free',
    subscriptionEndsAt: null,
    ticketCount: 0,
    isPro: false,
    isPremium: false,
    isAdmin: false,
    isFree: false,
    isAnonymous: true,
  };
}

function createAdminBillingInfo(userId: string, email: string | null): BillingAccessInfo {
  return {
    userId,
    email,
    userType: 'admin',
    isSubscribed: false,
    planType: 'admin',
    subscriptionEndsAt: null,
    ticketCount: 0,
    isPro: false,
    isPremium: true,
    isAdmin: true,
    isFree: false,
    isAnonymous: false,
  };
}

// ============================================
// Specialized Exports
// ============================================

export async function hasActiveSubscription(userId: string) {
  const supabase = await createClient();
  return fetchActiveSubscription(supabase, userId);
}

export async function isPremiumUser(): Promise<boolean> {
  const billing = await checkBillingAccess();
  return billing.isPremium || billing.isAdmin;
}

export async function isProOrAbove(): Promise<boolean> {
  const billing = await checkBillingAccess();
  return billing.isPro || billing.isPremium || billing.isAdmin;
}

export async function getUserType(): Promise<UserType> {
  const billing = await checkBillingAccess();
  return billing.userType;
}

/**
 * Get simple usage status (for UI display)
 */
export async function getUsageStatus(action: ActionType): Promise<{
  limit: number;
  remaining: number;
  resetAt: Date | null;
  ticketCount: number;
}> {
  const billing = await checkBillingAccess();

  if (billing.isAdmin) {
    return { limit: -1, remaining: -1, resetAt: null, ticketCount: 0 };
  }

  // Calculate Subscription Usage
  const supabase = await createClient();
  const usageCount = billing.userId ? await fetchMonthlyUsageCount(supabase, billing.userId, action) : 0;

  const config = action === 'plan_generation'
      ? PLAN_GENERATION_LIMITS[billing.userType]
      : TRAVEL_INFO_LIMITS[billing.userType];

  let subRemaining = -1;
  let resetAt: Date | null = null;

  if (!isUnlimited(config)) {
    subRemaining = Math.max(0, config.limit - usageCount);
    const now = new Date();
    resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  return {
    limit: config.limit,
    remaining: subRemaining, // This is just Subscription remaining
    resetAt,
    ticketCount: billing.ticketCount
  };
}

/**
 * Check Plan Storage Limit
 */
export async function checkPlanStorageLimit(): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const supabase = await createClient();
  const billing = await checkBillingAccess();

  // Use config to get limit
  // We need to import PLAN_STORAGE_LIMITS at the top or here
  const { PLAN_STORAGE_LIMITS } = await import('@/lib/limits/config');
  const limitConfig = PLAN_STORAGE_LIMITS[billing.userType];

  if (limitConfig.limit === -1) {
    return { allowed: true, currentCount: 0, limit: -1 };
  }

  if (!billing.userId) {
    // For anonymous, use client-side logic limit reference
    return { allowed: true, currentCount: 0, limit: limitConfig.limit };
  }

  const { data } = await supabase.rpc('count_user_plans', {
    p_user_id: billing.userId,
  });

  const currentCount = data || 0;

  return {
    allowed: currentCount < limitConfig.limit,
    currentCount,
    limit: limitConfig.limit,
  };
}
