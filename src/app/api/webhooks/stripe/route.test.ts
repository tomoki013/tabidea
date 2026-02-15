/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
const mockSupabaseFrom = vi.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === "stripe-signature") return "test-signature";
        return null;
      }),
    })
  ),
}));

import { POST } from "./route";
import { stripe } from "@/lib/stripe/client";
import type Stripe from "stripe";

describe("Stripe Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "grant-123" }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "sub-123" }, error: null }),
        }),
      }),
    });
  });

  describe("POST handler", () => {
    it("should return 400 when signature is missing", async () => {
      // Override headers mock to return null signature
      const { headers } = await import("next/headers");
      vi.mocked(headers).mockResolvedValueOnce({
        get: vi.fn(() => null),
      } as any);

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("Missing stripe-signature header");
    });

    it("should return 400 when signature verification fails", async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe("Invalid signature");
    });

    it("should process checkout.session.completed event for subscription", async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: "cs_test_123",
        customer: "cus_test_123",
        subscription: "sub_test_123",
        payment_intent: null,
        amount_total: 980,
        currency: "jpy",
        metadata: {
          user_id: "user-123",
          plan_type: "pro_monthly",
          ticket_count: "0",
        },
      };

      const mockSubscription: Partial<Stripe.Subscription> = {
        id: "sub_test_123",
        status: "active",
        customer: "cus_test_123",
        cancel_at_period_end: false,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            } as any,
          ],
        } as any,
      };

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: { object: mockSession },
      } as any);

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(
        mockSubscription as any
      );

      // Setup mock for idempotency check
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      // Setup mock for user update
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Setup mock for subscription upsert
      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "sub-db-123" }, error: null }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
        update: updateMock,
        upsert: upsertMock,
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(mockSession),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.success).toBe(true);
    });

    it("should skip already processed transactions (idempotency)", async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: "cs_test_123",
        customer: "cus_test_123",
        subscription: "sub_test_123",
        payment_intent: "pi_test_123",
        amount_total: 980,
        currency: "jpy",
        metadata: {
          user_id: "user-123",
          plan_type: "pro_monthly",
          ticket_count: "0",
        },
      };

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_123",
        type: "checkout.session.completed",
        data: { object: mockSession },
      } as any);

      // Mock that transaction already exists
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "tx-existing" }, error: null }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(mockSession),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("idempotent");
    });

    it("should process checkout.session.completed event for ticket purchase", async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: "cs_test_456",
        customer: "cus_test_456",
        subscription: null,
        payment_intent: "pi_test_456",
        amount_total: 500,
        currency: "jpy",
        metadata: {
          user_id: "user-456",
          plan_type: "ticket_5",
          ticket_count: "5",
        },
      };

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_456",
        type: "checkout.session.completed",
        data: { object: mockSession },
      } as any);

      // Setup mock for idempotency check (not found)
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      // Setup mock for user update
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Setup mock for entitlement grant insert
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: "grant-123" }, error: null }),
        }),
      });

      // Setup mock for transaction upsert
      const upsertMock = vi.fn().mockResolvedValue({ error: null });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
        update: updateMock,
        insert: insertMock,
        upsert: upsertMock,
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(mockSession),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.success).toBe(true);
      expect(json.message).toContain("ticket");
    });

    it("should handle customer.subscription.updated event", async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: "sub_test_789",
        customer: "cus_test_789",
        status: "active",
        cancel_at_period_end: true,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end:
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            } as any,
          ],
        } as any,
      };

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_789",
        type: "customer.subscription.updated",
        data: { object: mockSubscription },
      } as any);

      // Mock finding user by customer_id
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "user-789" }, error: null }),
        }),
      });

      // Mock subscription update
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
        update: updateMock,
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(mockSubscription),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.success).toBe(true);
    });

    it("should return error when user not found for subscription change", async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: "sub_test_unknown",
        customer: "cus_unknown",
        status: "canceled",
        cancel_at_period_end: false,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end:
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            } as any,
          ],
        } as any,
      };

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_unknown",
        type: "customer.subscription.deleted",
        data: { object: mockSubscription },
      } as any);

      // Mock user not found
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(mockSubscription),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("User not found");
    });

    it("should handle invoice.payment_failed event", async () => {
      const mockInvoice = {
        id: "in_test_failed",
        customer: "cus_test_failed",
        amount_due: 980,
        currency: "jpy",
        attempt_count: 2,
        subscription: "sub_test_failed",
      };

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_failed",
        type: "invoice.payment_failed",
        data: { object: mockInvoice },
      } as any);

      // Mock finding user
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: "user-failed" }, error: null }),
        }),
      });

      // Mock transaction upsert
      const upsertMock = vi.fn().mockResolvedValue({ error: null });

      // Mock subscription update
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: selectMock,
        upsert: upsertMock,
        update: updateMock,
      });

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: JSON.stringify(mockInvoice),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.success).toBe(true);
      expect(json.message).toContain("Payment failure recorded");
    });

    it("should handle unhandled event types gracefully", async () => {
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        id: "evt_test_unknown",
        type: "unknown.event.type",
        data: { object: {} },
      } as any);

      const request = new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.received).toBe(true);
      expect(json.success).toBe(true);
      expect(json.message).toContain("Unhandled event type");
    });
  });
});
