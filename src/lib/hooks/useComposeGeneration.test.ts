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

const MOCK_SEED_DATA = {
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
  seed: {
    destination: "東京",
    description: "週末の東京旅行",
    dayStructure: [
      { day: 1, title: "浅草散策", mainArea: "浅草", overnightLocation: "上野", summary: "下町文化を楽しむ日" },
      { day: 2, title: "渋谷散策", mainArea: "渋谷", overnightLocation: "上野", summary: "都会の最新スポットを巡る日" },
    ],
  },
  warnings: [],
  metadata: {
    modelName: "gemini-2.5-flash",
    narrativeModelName: "gemini-2.5-flash",
    modelTier: "flash",
    provider: "gemini",
  },
};

// Seed now returns SSE streaming instead of JSON — use a factory since ReadableStream is consumed once
const createMockSeedSuccess = () => ({
  ok: true,
  status: 200,
  body: createSseBody([
    { type: "progress", step: "normalize", message: "旅の条件を整理中..." },
    { type: "normalized", normalizedRequest: MOCK_SEED_DATA.normalizedRequest, metadata: MOCK_SEED_DATA.metadata },
    { type: "complete", ok: true, ...MOCK_SEED_DATA },
    { type: "done" },
  ]),
});

const MOCK_SPOTS_SUCCESS = (day: number) => ({
  ok: true,
  status: 200,
  json: async () => ({
    ok: true,
    candidates: [
      {
        name: `Spot ${day}`,
        role: "recommended",
        priority: 8,
        dayHint: day,
        timeSlotHint: "morning",
        stayDurationMinutes: 90,
        searchQuery: `Spot ${day}`,
        semanticId: `semantic-${day}`,
      },
    ],
    warnings: [],
  }),
});

const MOCK_ASSEMBLE_SUCCESS = {
  ok: true,
  status: 200,
  json: async () => ({
    ok: true,
    timeline: [{ day: 1, title: "浅草散策", nodes: [], legs: [], overnightLocation: "", startTime: "09:00" }],
    destination: "東京",
    description: "週末の東京旅行",
    heroImage: null,
    warnings: [],
    metadata: {
      candidateCount: 2,
      resolvedCount: 2,
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

const createMockNarrateSuccess = () => ({
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
});

const createLegacyComposeSuccess = () => ({
  ok: true,
  status: 200,
  body: createSseBody([
    { type: "ack" },
    {
      type: "progress",
      step: "semantic_plan",
      message: "旅の骨格を設計中...",
      totalDays: 2,
      destination: "東京",
      description: "週末の東京旅行",
    },
    {
      type: "complete",
      result: {
        itinerary: {
          id: "itin-legacy-1",
          destination: "東京",
          description: "週末の東京旅行",
          days: [{ day: 1, title: "浅草散策", activities: [] }],
        },
        warnings: [],
      },
    },
    { type: "done" },
  ]),
});

const MOCK_PREFLIGHT_SUCCESS = {
  ok: true,
  status: 200,
  json: async () => ({
    ok: true,
    allowed: true,
    userType: "free",
    remaining: 2,
    resetAt: null,
    metadata: {
      modelName: "gemini-2.5-flash",
      narrativeModelName: "gemini-2.5-flash",
      modelTier: "flash",
      provider: "gemini",
    },
  }),
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
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce(createMockSeedSuccess())
      .mockResolvedValueOnce(MOCK_SPOTS_SUCCESS(1))
      .mockResolvedValueOnce(MOCK_SPOTS_SUCCESS(2))
      .mockResolvedValueOnce(MOCK_ASSEMBLE_SUCCESS)
      .mockResolvedValueOnce(createMockNarrateSuccess());

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(mockSaveLocalPlan).toHaveBeenCalledTimes(1);
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/itinerary/plan/preflight",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/itinerary/plan/seed",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "/api/itinerary/plan/spots",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      "/api/itinerary/plan/spots",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      5,
      "/api/itinerary/plan/assemble",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      6,
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

  it("surfaces limit exceeded payload from preflight phase", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        limitExceeded: true,
        userType: "free",
        resetAt: "2026-03-20T00:00:00.000Z",
        remaining: 0,
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
    expect(mockFetch).toHaveBeenCalledTimes(1); // only preflight, no further calls
  });

  it("surfaces step failure error from structure phase", async () => {
    mockFetch
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: createSseBody([
          { type: "error", ok: false, error: "semantic planner timed out", failedStep: "semantic_plan" },
          { type: "done" },
        ]),
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


  it("surfaces non-JSON split-route errors instead of collapsing into a network failure", async () => {
    const nonJsonSpotsError = {
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
      text: async () => "spots_pipeline_failed",
    };

    mockFetch
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce(createMockSeedSuccess())
      .mockResolvedValueOnce(nonJsonSpotsError)   // day 1
      .mockResolvedValueOnce(nonJsonSpotsError);   // day 2

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    // All spots failed → error is surfaced
    expect(result.current.errorMessage).not.toBe("");
    expect(result.current.isCompleted).toBe(false);
  });

  it("falls back to the legacy compose SSE route when seed stream has no complete event", async () => {
    // Empty SSE body — no terminal event seen, triggers legacy fallback
    mockFetch
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: createSseBody([]),
      })
      .mockResolvedValueOnce(createLegacyComposeSuccess());

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(mockSaveLocalPlan).toHaveBeenCalledTimes(1);
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/itinerary/plan/preflight",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/itinerary/plan/seed",
      expect.objectContaining({ method: "POST" })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "/api/itinerary/compose",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.errorMessage).toBe("");
  });

  it("falls back to the legacy compose SSE route when all spot routes fail", async () => {
    // With parallel spots, both days fail simultaneously → all_spots_failed → legacy fallback
    const failedSpotsResponse = {
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: "spots_pipeline_failed", failedStep: "semantic_plan" }),
    };

    mockFetch
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce(createMockSeedSuccess())
      .mockResolvedValueOnce(failedSpotsResponse)  // day 1
      .mockResolvedValueOnce(failedSpotsResponse)  // day 2
      .mockResolvedValueOnce(createLegacyComposeSuccess());

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(mockSaveLocalPlan).toHaveBeenCalledTimes(1);
    });

    expect(result.current.isCompleted).toBe(true);
    expect(result.current.errorMessage).toBe("");
  });

  it("uses SSE error payload messages when narrate request fails before streaming starts", async () => {
    mockFetch
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce(createMockSeedSuccess())
      .mockResolvedValueOnce(MOCK_SPOTS_SUCCESS(1))
      .mockResolvedValueOnce(MOCK_SPOTS_SUCCESS(2))
      .mockResolvedValueOnce(MOCK_ASSEMBLE_SUCCESS)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        body: null,
        json: async () => ({ ok: false, error: "narrate_pipeline_failed", failedStep: "narrative_render" }),
      });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate(DEFAULT_INPUT);
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(result.current.errorMessage).toBe("errors.stepFailed.narrative_render");
  });

  it("maps network error to localized message", async () => {
    // All fetch calls fail with network error (preflight, seed, legacy compose)
    mockFetch.mockRejectedValue(new Error("Failed to fetch"));

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
      .mockResolvedValueOnce(MOCK_PREFLIGHT_SUCCESS)
      .mockResolvedValueOnce(createMockSeedSuccess())
      .mockResolvedValueOnce(MOCK_SPOTS_SUCCESS(1))
      .mockResolvedValueOnce(MOCK_SPOTS_SUCCESS(2))
      .mockResolvedValueOnce(MOCK_ASSEMBLE_SUCCESS)
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
