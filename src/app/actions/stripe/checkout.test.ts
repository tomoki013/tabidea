/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  // checkout.ts reads these at module load time
  setupEnv: (() => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY = "price_premium_monthly";
    process.env.STRIPE_PRICE_TICKET_1 = "price_ticket_1";
    process.env.STRIPE_PRICE_TICKET_5 = "price_ticket_5";
    process.env.STRIPE_PRICE_TICKET_10 = "price_ticket_10";
    return true;
  })(),
  mockHasActiveSubscription: vi.fn(),
  mockSupabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
  mockAdminClient: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/billing/billing-checker", () => ({
  hasActiveSubscription: mocks.mockHasActiveSubscription,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mocks.mockSupabase),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => mocks.mockAdminClient),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    customers: {
      retrieve: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
    },
    subscriptions: {
      list: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

import { stripe } from "@/lib/stripe/client";
import { createCheckoutSession } from "./checkout";

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns already_subscribed with resolved plan from DB subscription", async () => {
    mocks.mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "pro@test.com" } },
    });
    mocks.mockHasActiveSubscription.mockResolvedValue({
      hasActive: true,
      subscription: {
        externalSubscriptionId: "sub-db-1",
        planCode: "pro_monthly",
      },
    });

    const result = await createCheckoutSession("pro_monthly");

    expect(result.success).toBe(false);
    expect(result.error).toBe("already_subscribed");
    expect(result.resolvedPlanType).toBe("pro_monthly");
    expect(result.resolvedPlanName).toBeTruthy();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it("syncs Stripe active subscription and returns already_subscribed with resolved plan", async () => {
    const now = Math.floor(Date.now() / 1000);
    const upsert = vi.fn().mockResolvedValue({ error: null });

    mocks.mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-2", email: "premium@test.com" } },
    });
    mocks.mockHasActiveSubscription.mockResolvedValue({
      hasActive: false,
      subscription: null,
    });
    mocks.mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { stripe_customer_id: "cus_123" },
            error: null,
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    mocks.mockAdminClient.from.mockReturnValue({ upsert });
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({ id: "cus_123" } as any);
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [
        {
          id: "sub_active_123",
          status: "active",
          cancel_at_period_end: false,
          items: {
            data: [
              {
                current_period_start: now,
                current_period_end: now + 30 * 24 * 60 * 60,
                price: { id: "price_premium_monthly" },
              },
            ],
          },
        },
      ],
    } as any);

    const result = await createCheckoutSession("pro_monthly");

    expect(result.success).toBe(false);
    expect(result.error).toBe("already_subscribed");
    expect(result.resolvedPlanType).toBe("premium_monthly");
    expect(result.resolvedPlanName).toBeTruthy();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
