import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useComposeGeneration } from "./useComposeGeneration";

const mockPush = vi.fn();
const mockRefreshPlans = vi.fn();
const mockFetch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "errors.requestFailed") {
      return `HTTP ${values?.status}: request failed`;
    }
    return key;
  },
}));

vi.mock("@/app/actions/travel-planner", () => ({
  savePlan: vi.fn(),
}));

vi.mock("@/lib/local-storage/plans", () => ({
  saveLocalPlan: vi.fn(),
  notifyPlanChange: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/context/UserPlansContext", () => ({
  useUserPlans: () => ({ refreshPlans: mockRefreshPlans }),
}));

describe("useComposeGeneration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch as typeof fetch;
  });

  it("consumes a terminal error event even when it is left in the final buffer", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: "boom" })}`)
        );
        controller.close();
      },
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body,
    });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate({
        destinations: ["東京"],
        region: "domestic",
        dates: "1日間",
        companions: "友達",
        theme: ["グルメ"],
        budget: "standard",
        pace: "balanced",
        freeText: "",
      });
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("boom");
    });

    expect(result.current.errorMessage).not.toBe("errors.streamUnexpectedEnd");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
