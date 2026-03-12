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

describe("useComposeGeneration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch as typeof fetch;
    mockSaveLocalPlan.mockResolvedValue({ id: "local-plan-1" });
  });

  function createSseBody(events: unknown[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const payload = events
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join("");

    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(payload));
        controller.close();
      },
    });
  }

  it("polls compose jobs until completion and navigates with the saved local plan", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          jobId: "job-1",
          accessToken: "token-1",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobId: "job-1",
          status: "running",
          currentStep: "semantic_plan",
          currentMessage: "候補スポットを選定中...",
          progress: {
            totalDays: 2,
            destination: "東京",
            description: "週末の東京旅行",
            partialDays: {
              "1": {
                day: 1,
                title: "浅草散策",
                activities: [],
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobId: "job-1",
          status: "completed",
          currentStep: null,
          currentMessage: null,
          progress: {
            totalDays: 2,
            destination: "東京",
            description: "週末の東京旅行",
          },
          result: {
            itinerary: {
              id: "itin-1",
              destination: "東京",
              description: "週末の東京旅行",
              days: [
                {
                  day: 1,
                  title: "浅草散策",
                  activities: [],
                },
              ],
            },
            warnings: [],
            metadata: {
              pipelineVersion: "v3",
              candidateCount: 5,
              resolvedCount: 0,
              filteredCount: 5,
              placeResolveEnabled: false,
              stepTimings: {},
              modelName: "gemini-2.5-flash",
              modelTier: "flash",
            },
          },
        }),
      });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate({
        destinations: ["東京"],
        region: "domestic",
        dates: "2日間",
        companions: "友達",
        theme: ["グルメ"],
        budget: "standard",
        pace: "balanced",
        freeText: "",
      });
    });

    await waitFor(() => {
      expect(mockSaveLocalPlan).toHaveBeenCalledTimes(1);
    });

    expect(result.current.totalDays).toBe(2);
    expect(result.current.previewDestination).toBe("東京");
    expect(result.current.previewDescription).toBe("週末の東京旅行");
    expect(result.current.currentStep).toBeNull();
    expect(result.current.isCompleted).toBe(true);
    expect(mockNotifyPlanChange).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/plan/local/local-plan-1");
  });

  it("surfaces limit exceeded payloads from a failed compose job", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          jobId: "job-limit",
          accessToken: "token-limit",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobId: "job-limit",
          status: "failed",
          currentStep: null,
          currentMessage: null,
          progress: {},
          error: {
            message: "Usage limit exceeded",
            limitExceeded: true,
            userType: "free",
            resetAt: "2026-03-12T00:00:00.000Z",
            remaining: 0,
          },
        }),
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
      expect(result.current.limitExceeded?.remaining).toBe(0);
    });

    expect(result.current.errorMessage).toBe("");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("falls back to legacy compose when the async job backend is unavailable", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Compose job backend is unavailable",
          code: "compose_job_backend_unavailable",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: createSseBody([
          {
            type: "progress",
            step: "semantic_plan",
            message: "候補スポットを選定中...",
            totalDays: 2,
            destination: "東京",
            description: "週末の東京旅行",
          },
          {
            type: "day_complete",
            step: "narrative_render",
            day: 1,
            dayData: {
              day: 1,
              title: "浅草散策",
              activities: [],
            },
            totalDays: 2,
            destination: "東京",
            description: "週末の東京旅行",
          },
          {
            type: "complete",
            result: {
              itinerary: {
                id: "itin-legacy",
                destination: "東京",
                description: "週末の東京旅行",
                days: [
                  {
                    day: 1,
                    title: "浅草散策",
                    activities: [],
                  },
                ],
              },
              warnings: [],
            },
          },
          {
            type: "done",
          },
        ]),
      });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate({
        destinations: ["東京"],
        region: "domestic",
        dates: "2日間",
        companions: "友達",
        theme: ["グルメ"],
        budget: "standard",
        pace: "balanced",
        freeText: "",
      });
    });

    await waitFor(() => {
      expect(mockSaveLocalPlan).toHaveBeenCalledTimes(1);
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/itinerary/compose",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.errorMessage).toBe("");
  });

  it("maps polling fetch failures to a localized network error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          jobId: "job-1",
          accessToken: "token-1",
        }),
      })
      .mockRejectedValueOnce(new Error("Failed to fetch"));

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate({
        destinations: ["東京"],
        region: "domestic",
        dates: "2日間",
        companions: "友達",
        theme: ["グルメ"],
        budget: "standard",
        pace: "balanced",
        freeText: "",
      });
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("Network request failed");
    });
  });

  it("clears partial days when legacy SSE stream ends without a terminal event", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Compose job backend is unavailable",
          code: "compose_job_backend_unavailable",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: createSseBody([
          {
            type: "progress",
            step: "narrative_render",
            message: "旅程を仕上げ中...",
          },
          {
            type: "day_complete",
            step: "narrative_render",
            day: 1,
            dayData: {
              day: 1,
              title: "浅草散策",
              activities: [],
            },
          },
        ]),
      });

    const { result } = renderHook(() => useComposeGeneration());

    await act(async () => {
      await result.current.generate({
        destinations: ["東京"],
        region: "domestic",
        dates: "2日間",
        companions: "友達",
        theme: ["グルメ"],
        budget: "standard",
        pace: "balanced",
        freeText: "",
      });
    });

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("errors.streamUnexpectedEnd");
    });

    expect(result.current.partialDays.size).toBe(0);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.isCompleted).toBe(false);
  });
});
