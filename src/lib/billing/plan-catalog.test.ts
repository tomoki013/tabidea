import { describe, it, expect, beforeEach } from "vitest";
import {
  canAccess,
  isCheckoutPlanType,
  isSubscriptionPlanType,
  isTicketPlanType,
  resolvePlanDisplayName,
  resolveSubscriptionPlanByPriceId,
} from "./plan-catalog";

describe("plan-catalog", () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY = "price_premium_monthly";
  });

  describe("canAccess", () => {
    it("free/anonymous cannot access paid capabilities", () => {
      expect(canAccess("free", "travel_style")).toBe(false);
      expect(canAccess("anonymous", "packing_list")).toBe(false);
      expect(canAccess("free", "multi_ai_provider")).toBe(false);
    });

    it("pro can access pro capabilities but not premium-only", () => {
      expect(canAccess("pro", "travel_style")).toBe(true);
      expect(canAccess("pro", "packing_list")).toBe(true);
      expect(canAccess("pro", "multi_ai_provider")).toBe(false);
    });

    it("premium/admin can access all configured capabilities", () => {
      expect(canAccess("premium", "travel_style")).toBe(true);
      expect(canAccess("premium", "multi_ai_provider")).toBe(true);
      expect(canAccess("admin", "multi_ai_provider")).toBe(true);
    });
  });

  describe("plan type guards", () => {
    it("supports only pro_monthly/premium_monthly as subscription plans", () => {
      expect(isSubscriptionPlanType("pro_monthly")).toBe(true);
      expect(isSubscriptionPlanType("premium_monthly")).toBe(true);
      expect(isSubscriptionPlanType("premium_yearly")).toBe(false);
    });

    it("supports ticket plan codes", () => {
      expect(isTicketPlanType("ticket_1")).toBe(true);
      expect(isTicketPlanType("ticket_5")).toBe(true);
      expect(isTicketPlanType("ticket_10")).toBe(true);
    });

    it("isCheckoutPlanType returns true for known plan/ticket codes only", () => {
      expect(isCheckoutPlanType("pro_monthly")).toBe(true);
      expect(isCheckoutPlanType("ticket_5")).toBe(true);
      expect(isCheckoutPlanType("premium_yearly")).toBe(false);
      expect(isCheckoutPlanType("unknown_plan")).toBe(false);
    });
  });

  describe("resolveSubscriptionPlanByPriceId", () => {
    it("maps Stripe price IDs to subscription plans", () => {
      expect(resolveSubscriptionPlanByPriceId("price_pro_monthly")).toBe("pro_monthly");
      expect(resolveSubscriptionPlanByPriceId("price_premium_monthly")).toBe("premium_monthly");
    });

    it("returns null for unknown or missing price IDs", () => {
      expect(resolveSubscriptionPlanByPriceId("price_unknown")).toBeNull();
      expect(resolveSubscriptionPlanByPriceId(undefined)).toBeNull();
    });
  });

  describe("resolvePlanDisplayName", () => {
    it("shows admin label for admin users", () => {
      expect(
        resolvePlanDisplayName({
          planType: "admin",
          isSubscribed: false,
          isAdmin: true,
        })
      ).toBe("管理者");
    });

    it("shows Free for non-subscribed users", () => {
      expect(
        resolvePlanDisplayName({
          planType: "free",
          isSubscribed: false,
          isAdmin: false,
        })
      ).toBe("Free");
    });

    it("shows paid plan names for subscribed users", () => {
      expect(
        resolvePlanDisplayName({
          planType: "pro_monthly",
          isSubscribed: true,
          isAdmin: false,
        })
      ).toBe("Tabidea Pro");

      expect(
        resolvePlanDisplayName({
          planType: "premium_monthly",
          isSubscribed: true,
          isAdmin: false,
        })
      ).toBe("Tabidea Premium");
    });
  });
});
