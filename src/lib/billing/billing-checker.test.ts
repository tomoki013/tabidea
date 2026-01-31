/**
 * Tests for BillingChecker service
 *
 * These tests verify the unified billing check functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import {
  checkBillingAccess,
  checkBillingAccessForUser,
  isAdminEmail,
} from './billing-checker';

describe('BillingChecker', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSupabase: any = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn(),
              })),
            })),
          })),
          gt: vi.fn(),
        })),
      })),
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
    // Reset environment variable
    delete process.env.ADMIN_EMAILS;
  });

  describe('isAdminEmail', () => {
    it('should return false for null email', () => {
      expect(isAdminEmail(null)).toBe(false);
    });

    it('should return false for undefined email', () => {
      expect(isAdminEmail(undefined)).toBe(false);
    });

    it('should return false when ADMIN_EMAILS is not set', () => {
      expect(isAdminEmail('test@example.com')).toBe(false);
    });

    it('should return true for admin email', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com,super@example.com';
      expect(isAdminEmail('admin@example.com')).toBe(true);
    });

    it('should be case-insensitive', () => {
      process.env.ADMIN_EMAILS = 'Admin@Example.com';
      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true);
    });

    it('should handle whitespace in admin email list', () => {
      process.env.ADMIN_EMAILS = 'admin@example.com , super@example.com ';
      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('super@example.com')).toBe(true);
    });
  });

  describe('checkBillingAccess', () => {
    it('should return anonymous billing info when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await checkBillingAccess();

      expect(result.isAnonymous).toBe(true);
      expect(result.userId).toBeNull();
      expect(result.userType).toBe('anonymous');
      expect(result.isPremium).toBe(false);
      expect(result.isAdmin).toBe(false);
      expect(result.isFree).toBe(false);
    });

    it('should return admin billing info for admin email users', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
          },
        },
        error: null,
      });

      // Mock admin check in DB returns false (not needed since email check succeeds)
      const mockSingle = vi.fn().mockResolvedValue({
        data: { },
        error: null,
      });

      const mockEq = vi.fn(() => ({
        single: mockSingle,
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: mockEq,
        })),
      });

      const result = await checkBillingAccess();

      expect(result.isAdmin).toBe(true);
      expect(result.userType).toBe('admin');
      expect(result.isPremium).toBe(true); // Admins have premium access
      expect(result.userId).toBe('admin-123');
    });

    it('should return free billing info for user without subscription', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'free-user-123',
            email: 'free@example.com',
          },
        },
        error: null,
      });

      // Mock admin check (not admin)
      const mockAdminSingle = vi.fn().mockResolvedValue({
        data: { },
        error: null,
      });

      // Mock subscription check (no subscription)
      const mockSubSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock tickets check (no tickets)
      const mockTicketsGt = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockAdminSingle,
              })),
            })),
          };
        } else if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: mockSubSingle,
                    })),
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'entitlement_grants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      gt: mockTicketsGt,
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from;
      });

      const result = await checkBillingAccess();

      expect(result.isFree).toBe(true);
      expect(result.userType).toBe('free');
      expect(result.isPremium).toBe(false);
      expect(result.isSubscribed).toBe(false);
      expect(result.ticketCount).toBe(0);
    });

    it('should return premium billing info for user with active subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'premium-user-123',
            email: 'premium@example.com',
          },
        },
        error: null,
      });

      // Mock admin check (not admin)
      const mockAdminSingle = vi.fn().mockResolvedValue({
        data: { },
        error: null,
      });

      // Mock subscription check (active subscription)
      const mockSubSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'sub-123',
          external_subscription_id: 'stripe_sub_123',
          status: 'active',
          current_period_end: futureDate.toISOString(),
          plan_code: 'pro_monthly',
        },
        error: null,
      });

      // Mock tickets check (some tickets)
      const mockTicketsGt = vi.fn().mockResolvedValue({
        data: [{ remaining_count: 3 }, { remaining_count: 2 }],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockAdminSingle,
              })),
            })),
          };
        } else if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: mockSubSingle,
                    })),
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'entitlement_grants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      gt: mockTicketsGt,
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from;
      });

      const result = await checkBillingAccess();

      expect(result.isPremium).toBe(true);
      expect(result.userType).toBe('premium');
      expect(result.isSubscribed).toBe(true);
      expect(result.planType).toBe('pro_monthly');
      expect(result.ticketCount).toBe(5); // 3 + 2
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.externalSubscriptionId).toBe('stripe_sub_123');
    });

    it('should return free billing info for expired subscription', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day in the past

      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'expired-user-123',
            email: 'expired@example.com',
          },
        },
        error: null,
      });

      // Mock admin check (not admin)
      const mockAdminSingle = vi.fn().mockResolvedValue({
        data: { },
        error: null,
      });

      // Mock subscription check (expired subscription)
      const mockSubSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'sub-123',
          external_subscription_id: 'stripe_sub_123',
          status: 'active',
          current_period_end: pastDate.toISOString(),
          plan_code: 'pro_monthly',
        },
        error: null,
      });

      // Mock tickets check (no tickets)
      const mockTicketsGt = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockAdminSingle,
              })),
            })),
          };
        } else if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: mockSubSingle,
                    })),
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'entitlement_grants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      gt: mockTicketsGt,
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from;
      });

      const result = await checkBillingAccess();

      expect(result.isFree).toBe(true);
      expect(result.userType).toBe('free');
      expect(result.isPremium).toBe(false);
      expect(result.isSubscribed).toBe(false);
    });
  });

  describe('checkBillingAccessForUser', () => {
    it('should return billing info for a specific user', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Mock user data fetch
      const mockUserSingle = vi.fn().mockResolvedValue({
        data: { email: 'specific@example.com' },
        error: null,
      });

      // Mock subscription check
      const mockSubSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'sub-456',
          external_subscription_id: 'stripe_sub_456',
          status: 'active',
          current_period_end: futureDate.toISOString(),
          plan_code: 'pro_monthly',
        },
        error: null,
      });

      // Mock tickets
      const mockTicketsGt = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockUserSingle,
              })),
            })),
          };
        } else if (table === 'subscriptions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: mockSubSingle,
                    })),
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'entitlement_grants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      gt: mockTicketsGt,
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from;
      });

      const result = await checkBillingAccessForUser('specific-user-123');

      expect(result.userId).toBe('specific-user-123');
      expect(result.email).toBe('specific@example.com');
      expect(result.isPremium).toBe(true);
      expect(result.isSubscribed).toBe(true);
    });
  });
});
