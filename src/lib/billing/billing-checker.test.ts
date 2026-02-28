/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for BillingChecker service — 5-tier billing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => '127.0.0.1'),
  })),
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import {
  checkBillingAccess,
  isAdminEmail,
  resolveUserTypeFromPlanCode,
} from './billing-checker';

describe('BillingChecker — 5-tier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_EMAILS;
  });

  // =========================================
  // isAdminEmail
  // =========================================
  describe('isAdminEmail', () => {
    it('returns false when ADMIN_EMAILS is not set', () => {
      expect(isAdminEmail('admin@example.com')).toBe(false);
    });

    it('returns true when email matches', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com,boss@example.com';
      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('Admin@Example.COM')).toBe(true);
    });

    it('returns false for non-matching email', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      expect(isAdminEmail('user@example.com')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isAdminEmail(null)).toBe(false);
      expect(isAdminEmail(undefined)).toBe(false);
    });
  });

  // =========================================
  // checkBillingAccess
  // =========================================
  describe('checkBillingAccess', () => {
    const mockSubscriptionChain = (subscription: any) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: subscription,
          error: subscription ? null : { code: 'PGRST116' },
        }),
      };
      return chain;
    };

    const mockTicketsChain = (tickets: any[]) => {
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.gt = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => resolve({ data: tickets, error: null });
      return chain;
    };

    it('anonymous: no auth → anonymous userType', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'not authenticated' },
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('anonymous');
      expect(result.isAnonymous).toBe(true);
      expect(result.isPro).toBe(false);
      expect(result.isPremium).toBe(false);
      expect(result.isAdmin).toBe(false);
      expect(result.isFree).toBe(false);
      expect(result.planType).toBe('free');
    });

    it('admin: admin email → admin userType', async () => {
      process.env.ADMIN_EMAILS = 'admin@test.com';
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@test.com' } },
        error: null,
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('admin');
      expect(result.isAdmin).toBe(true);
      expect(result.isPremium).toBe(true); // admin has premium access
      expect(result.isPro).toBe(false);
      expect(result.planType).toBe('admin');
    });

    it('free: authenticated, no subscription → free userType', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@test.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') return mockSubscriptionChain(null);
        if (table === 'entitlement_grants') return mockTicketsChain([]);
        return { select: vi.fn() };
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('free');
      expect(result.isFree).toBe(true);
      expect(result.isPro).toBe(false);
      expect(result.isPremium).toBe(false);
      expect(result.isSubscribed).toBe(false);
      expect(result.planType).toBe('free');
    });

    it('pro: pro_monthly subscription → pro userType', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-2', email: 'pro@test.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return mockSubscriptionChain({
            id: 'sub-1',
            external_subscription_id: 'stripe-sub-1',
            status: 'active',
            current_period_end: futureDate.toISOString(),
            plan_code: 'pro_monthly',
          });
        }
        if (table === 'entitlement_grants') return mockTicketsChain([]);
        return { select: vi.fn() };
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('pro');
      expect(result.isPro).toBe(true);
      expect(result.isPremium).toBe(false);
      expect(result.isSubscribed).toBe(true);
      expect(result.planType).toBe('pro_monthly');
    });

    it('premium: premium_monthly subscription → premium userType', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-3', email: 'premium@test.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return mockSubscriptionChain({
            id: 'sub-2',
            external_subscription_id: 'stripe-sub-2',
            status: 'active',
            current_period_end: futureDate.toISOString(),
            plan_code: 'premium_monthly',
          });
        }
        if (table === 'entitlement_grants') return mockTicketsChain([]);
        return { select: vi.fn() };
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('premium');
      expect(result.isPremium).toBe(true);
      expect(result.isPro).toBe(false);
      expect(result.isSubscribed).toBe(true);
      expect(result.planType).toBe('premium_monthly');
    });

    it('premium: premium_yearly subscription → premium userType', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-4', email: 'yearly@test.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return mockSubscriptionChain({
            id: 'sub-3',
            external_subscription_id: 'stripe-sub-3',
            status: 'active',
            current_period_end: futureDate.toISOString(),
            plan_code: 'premium_yearly',
          });
        }
        if (table === 'entitlement_grants') return mockTicketsChain([]);
        return { select: vi.fn() };
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('premium');
      expect(result.isPremium).toBe(true);
      expect(result.planType).toBe('premium_yearly');
    });

    it('expired subscription → free userType', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-5', email: 'expired@test.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return mockSubscriptionChain({
            id: 'sub-4',
            external_subscription_id: 'stripe-sub-4',
            status: 'active',
            current_period_end: pastDate.toISOString(),
            plan_code: 'pro_monthly',
          });
        }
        if (table === 'entitlement_grants') return mockTicketsChain([]);
        return { select: vi.fn() };
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('free');
      expect(result.isFree).toBe(true);
      expect(result.isPro).toBe(false);
      expect(result.isSubscribed).toBe(false);
    });

    it('ticket count is returned for users with valid tickets', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-6', email: 'ticket@test.com' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') return mockSubscriptionChain(null);
        if (table === 'entitlement_grants') {
          return mockTicketsChain([
            { id: 't-1', remaining_count: 3, valid_until: futureDate.toISOString() },
            { id: 't-2', remaining_count: 2, valid_until: futureDate.toISOString() },
          ]);
        }
        return { select: vi.fn() };
      });

      const result = await checkBillingAccess();

      expect(result.userType).toBe('free');
      expect(result.ticketCount).toBe(5);
    });
  });

  // =========================================
  // resolveUserTypeFromPlanCode
  // =========================================
  describe('resolveUserTypeFromPlanCode', () => {
    it('pro_monthly → pro', () => {
      expect(resolveUserTypeFromPlanCode('pro_monthly')).toBe('pro');
    });

    it('premium_monthly → premium', () => {
      expect(resolveUserTypeFromPlanCode('premium_monthly')).toBe('premium');
    });

    it('premium_yearly → premium', () => {
      expect(resolveUserTypeFromPlanCode('premium_yearly')).toBe('premium');
    });

    it('undefined → free (with warning)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(resolveUserTypeFromPlanCode(undefined)).toBe('free');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown plan code')
      );
      warnSpy.mockRestore();
    });

    it('unknown plan code → free (with warning)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(resolveUserTypeFromPlanCode('some_future_plan' as any)).toBe('free');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
