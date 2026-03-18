import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useComposeGeneration } from "./useComposeGeneration";

const mockPush = vi.fn();
const mockRefreshPlans = vi.fn();
const mockFetch = vi.fn();
const mockSaveLocalPlan = vi.fn();
const mockNotifyPlanChange = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === "errors.requestFailed") {
      return `HTTP ${values?.status}: request failed`;
    }
    if (key === "errors.network") {
      return "Network request failed";
    }
    return key;
  },
}));

vi.mock("@/lib/plans/save-plan-client", () => ({
  savePlanViaApi: vi.fn(),
}));

vi.mock("@/lib/local-storage/plans", () => ({
  saveLocalPlan: (...args: unknown[]) => mockSaveLocalPlan(...args),
  notifyPlanChange: () => mockNotifyPlanChange(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/context/UserPlansContext", () => ({
  useUserPlans: () => ({ refreshPlans: mockRefreshPlans }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_STRUCTURE_SUCCESS = {
  ok: true,
  status: 200,
  json: async () => ({
    ok: true,
    timeline: [{ day: 1, title: "浅草散策", nodes: [], legs: [], overnightLocation: "", startTime: "09:00" }],
    normalizedRequest: {
      destinations: ["東京"],
      durationDays: 2,
      companions: "友達",
      themes: ["グルメ"],
      budgetLevel: "standard",
      pace: "balanced",
      freeText: "",
      mustVisitPlaces: [],
      fixedSchedule: [],
      preferredTransport: [],
      isDestinationDecided: true,
      region: "domestic",
      outputLanguage: "ja",
      originalInput: {},
      hardConstraints: { destinations: [], dateConstraints: [], mustVisitPlaces: [], fixedTransports: [], fixedHotels: [], freeTextDirectives: [], summaryLines: [] },
      softPreferences: { themes: [], rankedRequests: [], suppressedCount: 0 },
      compaction: { applied: false, hardConstraintCount: 0, softPreferenceCount: 0, suppressedSoftPreferenceCount: 0, longInputDetected: false },
    },
    destination: "東京",
    description: "週末の東京旅行",
    heroImage: null,
    warnings: [],
    metadata: {
      candidateCount: 8,
      resolvedCount: 6,
      modelName: "gemini-2.5-flash",
      narrativeModelName: "gemini-2.5-flash",
      modelTier: "flash",
      provider: "gemini",
      timeoutMitigationUsed: false,
    },
  }),
};

function createSseBody(events: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const payload = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });
}

const MOCK_NARRATE_SUCCESS = {
  ok: true,
  status: 200,
  body: createSseBody([
    {
      type: "day_complete",
      step: "narrative_render",
      day: 1,
      dayData: { day: 1, title: "浅草散策", activities: [] },
      isComplete: true,
      totalDays: 2,
      destination: "東京",
      description: "週末の東京旅行",
    },
    {
      type: "complete",
      result: {
        itinerary: {
          id: "itin-1",
          destination: "東京",
          description: "週末の東京旅行",
          days: [{ day: 1, title: "浅草散策", activities: [] }],
        },
        warnings: [],
      },
    },
    { type: "done" },
  ]),
};

const DEFAULT_INPUT = {
  destinations: ["東京"],
  region: "domestic",
  dates: "2日間",
  companions: "友達",
  theme: ["グルメ"],
  budget: "standard",
  pace: "balanced",
  freeText: "",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useComposeGeneration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch as typeof fetch;
    mockSaveLocalPlan.mockResolvedValue({ id: "local-plan-1" });
  });

  it("completes two-phase generation and navigates to saved local plan", async () => {
    mockFetch
      .mockResolvedValueOnce(MOCK_STRUCTURE_SUCCESS)
      .mockResolvedValueOnce(MOCK_NARRATE_SUCCESS);

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(mockSaveLocalPlan).toHaveBeenCalledTimes(1);
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/itinerary/plan/structure",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/itinerary/plan/narrate",
      expect.objectContaining({ method: "POST" })
    );

    expect(result.current.previewDestination).toBe("東京");
    expect(result.current.previewDescription).toBe("週末の東京旅行");
    expect(result.current.totalDays).toBeGreaterThanOrEqual(1);
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.errorMessage).toBe("");
    expect(mockNotifyPlanChange).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/plan/local/local-plan-1");
  });

  it("surfaces limit exceeded payload from structure phase", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        limitExceeded: true,
        userType: "free",
        resetAt: "2026-03-20T00:00:00.000Z",
        remaining: 0,
        error: "Usage limit exceeded",
      }),
    });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(result.current.limitExceeded?.remaining).toBe(0);
    });

    expect(result.current.errorMessage).toBe("");
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1); // only structure, no narrate
  });

  it("surfaces step failure error from structure phase", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        ok: false,
        error: "semantic planner timed out",
        failedStep: "semantic_plan",
      }),
    });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(result.current.errorMessage).not.toBe("");
    expect(result.current.isCompleted).toBe(false);
  });

  it("maps network error to localized message", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("Network request failed");
    });
  });

  it("clears partial days when narrate SSE stream ends without a terminal event", async () => {
    mockFetch
      .mockResolvedValueOnce(MOCK_STRUCTURE_SUCCESS)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: createSseBody([
          {
            type: "day_complete",
            step: "narrative_render",
            day: 1,
            dayData: { day: 1, title: "浅草散策", activities: [] },
          },
          // No 'done' event — stream ends abruptly
        ]),
      });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("errors.streamUnexpectedEnd");
    });

    expect(result.current.partialDays.size).toBe(0);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isCompleted).toBe(false);
  });
});
