/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.mockPush,
    refresh: mocks.mockRefresh,
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

vi.mock("@/app/actions/stripe/checkout", () => ({
  createCheckoutSession: mocks.mockCreateCheckoutSession,
}));

vi.mock("@/app/actions/stripe/portal", () => ({
  createPortalSession: vi.fn(),
}));

vi.mock("./PricingCard", () => ({
  PricingCard: ({ plan, onPurchase }: any) =>
    plan.id === "pro_monthly" ? (
      <button onClick={() => onPurchase("pro_monthly")}>buy-pro</button>
    ) : (
      <div />
    ),
}));

vi.mock("./TierComparisonTable", () => ({
  TierComparisonTable: () => <div data-testid="tier-comparison-table" />,
}));

vi.mock("@/components/features/landing", () => ({
  FAQSection: () => <div data-testid="faq-section" />,
}));

import { PricingPageClient } from "./PricingPageClient";

describe("PricingPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows resolved paid plan name when checkout returns already_subscribed", async () => {
    mocks.mockCreateCheckoutSession.mockResolvedValue({
      success: false,
      error: "already_subscribed",
      resolvedPlanType: "pro_monthly",
      resolvedPlanName: "Pro",
    });

    render(
      <PricingPageClient
        isLoggedIn={true}
        billingStatus={{
          userId: "user-1",
          email: "user@test.com",
          userType: "free",
          isSubscribed: false,
          planType: "free",
          subscriptionEndsAt: null,
          ticketCount: 0,
          isPro: false,
          isPremium: false,
          isAdmin: false,
          isFree: true,
          isAnonymous: false,
        }}
      />,
    );

    fireEvent.click(screen.getByText("buy-pro"));

    await waitFor(() => {
      expect(
        screen.getByText("既にProプランに加入しています。プラン管理からご確認ください。"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("既にFreeプランに加入しています。プラン管理からご確認ください。"),
    ).not.toBeInTheDocument();
    expect(mocks.mockRefresh).toHaveBeenCalledTimes(1);
  });
});
