/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { regeneratePlan } from "./travel-planner";

const { mockModifyItinerary, mockGetUserConstraintPrompt } = vi.hoisted(() => ({
  mockModifyItinerary: vi.fn(),
  mockGetUserConstraintPrompt: vi.fn(),
}));

vi.mock("@/lib/services/ai/gemini", () => ({
  GeminiService: class {
    modifyItinerary = mockModifyItinerary;
  },
}));

vi.mock("@/lib/unsplash", () => ({
  getUnsplashImage: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/plan-generation/generate-outline", () => ({
  executeOutlineGeneration: vi.fn(),
  getUserConstraintPrompt: mockGetUserConstraintPrompt,
}));

const basePlan = {
  id: "plan-1",
  destination: "Tokyo",
  description: "Initial plan",
  days: [
    {
      day: 1,
      title: "Day 1",
      activities: [
        {
          time: "10:00",
          activity: "Asakusa sightseeing",
          description: "Walk around",
        },
      ],
    },
  ],
} as any;

describe("regeneratePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserConstraintPrompt.mockResolvedValue("");
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  });

  it("succeeds without retry when first result differs from current plan", async () => {
    mockModifyItinerary.mockResolvedValue({
      ...basePlan,
      description: "Updated plan",
    });

    const response = await regeneratePlan(basePlan, [{ role: "user", text: "Add a cafe stop" }]);

    expect(response.success).toBe(true);
    expect(response.data?.description).toBe("Updated plan");
    expect(mockModifyItinerary).toHaveBeenCalledTimes(1);
  });

  it("retries once when first regenerated plan is unchanged", async () => {
    mockModifyItinerary
      .mockResolvedValueOnce({ ...basePlan })
      .mockResolvedValueOnce({
        ...basePlan,
        description: "Changed on second attempt",
      });

    const response = await regeneratePlan(basePlan, [{ role: "user", text: "Make lunch cheaper" }]);

    expect(response.success).toBe(true);
    expect(response.data?.description).toBe("Changed on second attempt");
    expect(mockModifyItinerary).toHaveBeenCalledTimes(2);

    const secondHistory = mockModifyItinerary.mock.calls[1][1];
    expect(secondHistory[secondHistory.length - 1].text).toContain("The previous output was identical");
  });

  it("returns failure when plan remains unchanged after retry", async () => {
    mockModifyItinerary
      .mockResolvedValueOnce({ ...basePlan })
      .mockResolvedValueOnce({ ...basePlan });

    const response = await regeneratePlan(basePlan, [{ role: "user", text: "Make the evening more relaxed" }]);

    expect(response.success).toBe(false);
    expect(response.message).toBe("regenerate_no_effect");
    expect(mockModifyItinerary).toHaveBeenCalledTimes(2);
  });
});
