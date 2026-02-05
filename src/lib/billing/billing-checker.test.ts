/**
 * Tests for BillingChecker service
 *
 * These tests verify the unified billing check functionality and consumption priority
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  checkAndConsumeQuota,
  checkBillingAccess,
} from './billing-checker';

describe('BillingChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_EMAILS;
  });

  describe('checkAndConsumeQuota Priority Logic', () => {
    const userId = 'user-123';
    const now = new Date();

    // Helpers to mock DB state
    const mockUser = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, email: 'user@example.com' } },
        error: null,
      });
    };

    const mockSubscription = (active: boolean, periodEnd?: Date) => {
      // Chain for subscription query
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: active ? {
            id: 'sub-1',
            status: 'active',
            current_period_end: periodEnd?.toISOString(),
            plan_code: 'pro_monthly'
          } : null,
          error: active ? null : { code: 'PGRST116' }
        })
      };
      // Manually bind 'this' for mockReturnThis to work if needed,
      // but simpler to just return chain explicitly if we construct it carefully.
      // Actually, mockReturnThis() expects the function to be called on the object.
      // So chain.select.mockReturnThis() works if we call chain.select().
      return chain;
    };

    const mockTickets = (tickets: any[]) => {
      // Chain for tickets query
      // Needs to support multiple .eq, .gt calls
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.gt = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: any) => resolve({ data: tickets, error: null });
      return chain;
    };

    const mockUsage = (count: number) => {
      // Chain for usage query
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain); // .or() is called, then we await
      // Wait, .or() returns the builder.
      // The await happens on the result of .or().
      chain.then = (resolve: any) => resolve({ count, error: null });

      // Also need insert for consumption
      chain.insert = vi.fn().mockResolvedValue({ error: null });

      return chain;
    };

    it('should prioritize Ticket when it expires sooner than Subscription', async () => {
      mockUser();

      const subExpires = new Date(now);
      subExpires.setDate(now.getDate() + 20);

      const ticketExpires = new Date(now);
      ticketExpires.setDate(now.getDate() + 5);

      // Setup mocks
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'subscriptions') return mockSubscription(true, subExpires);
        if (table === 'entitlement_grants') {
           return mockTickets([{
             id: 'ticket-1',
             remaining_count: 5,
             valid_until: ticketExpires.toISOString()
           }]);
        }
        if (table === 'usage_logs') {
           return mockUsage(10); // Used 10/30
        }
        return { select: vi.fn() };
      });

      // Mock RPC
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await checkAndConsumeQuota('plan_generation');

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('ticket');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('decrement_ticket', { p_grant_id: 'ticket-1' });
    });

    it('should prioritize Subscription when it expires sooner than Ticket', async () => {
      mockUser();

      const subExpires = new Date(now);
      subExpires.setDate(now.getDate() + 30); // Approx valid for month

      const ticketExpires = new Date(now);
      ticketExpires.setDate(now.getDate() + 90);

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'subscriptions') return mockSubscription(true, subExpires);
        if (table === 'entitlement_grants') {
           return mockTickets([{
             id: 'ticket-1',
             remaining_count: 5,
             valid_until: ticketExpires.toISOString()
           }]);
        }
        if (table === 'usage_logs') {
           return mockUsage(5); // Used 5/30
        }
      });

      const result = await checkAndConsumeQuota('plan_generation');

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('subscription');
    });

    it('should fall back to Ticket if Subscription is exhausted', async () => {
      mockUser();
      const subExpires = new Date(now);
      subExpires.setDate(now.getDate() + 10);

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'subscriptions') return mockSubscription(true, subExpires);
        if (table === 'entitlement_grants') {
           return mockTickets([{
             id: 'ticket-1',
             remaining_count: 5,
             valid_until: subExpires.toISOString() // Date shouldn't matter if sub full
           }]);
        }
        if (table === 'usage_logs') {
           return mockUsage(30); // Exhausted (30/30)
        }
      });

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await checkAndConsumeQuota('plan_generation');

      expect(result.allowed).toBe(true);
      expect(result.source).toBe('ticket');
    });
  });
});
