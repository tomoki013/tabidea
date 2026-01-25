import { render, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import Header from "./Header";
import React from "react";
import { PlanModalProvider } from "@/context/PlanModalContext";
import { AuthProvider } from "@/context/AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Mock PlanModal to avoid deep rendering issues
vi.mock("@/components/common", () => ({
  PlanModal: () => <div data-testid="plan-modal" />,
}));

// Mock Supabase client for AuthProvider
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  }),
}));

describe("Header Performance Benchmark", () => {
  let scrollYSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset scroll position
    // @ts-expect-error - scrollY is read-only but we need to set it for testing
    window.scrollY = 0;

    // Spy on window.scrollY getter
    // Note: In JSDOM window.scrollY is a getter on window
    scrollYSpy = vi.spyOn(window, 'scrollY', 'get');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("measures window.scrollY accesses during scroll events", () => {
    render(
      <AuthProvider>
        <PlanModalProvider>
          <Header forceShow={true} />
        </PlanModalProvider>
      </AuthProvider>
    );

    // Initial check consumes 1 access
    expect(scrollYSpy).toHaveBeenCalled();
    const initialCalls = scrollYSpy.mock.calls.length;

    // Trigger scroll events
    const eventCount = 50;

    act(() => {
      for (let i = 0; i < eventCount; i++) {
        window.dispatchEvent(new Event("scroll"));
      }
    });

    const totalCalls = scrollYSpy.mock.calls.length;
    const callsDuringScroll = totalCalls - initialCalls;

    console.log(`Scroll events: ${eventCount}`);
    console.log(`window.scrollY accesses: ${callsDuringScroll}`);

    // Optimized: Should be significantly less than eventCount due to throttling
    // With 100ms throttle and synchronous loop, it should be 1 (immediate call)
    // plus potentially 0 if loop finishes fast.
    expect(callsDuringScroll).toBeLessThan(5);
  });
});
