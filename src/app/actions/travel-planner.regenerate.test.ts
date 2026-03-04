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
  destination: "東京",
  description: "初期プラン",
  days: [
    {
      day: 1,
      title: "Day 1",
      activities: [
        {
          time: "10:00",
          activity: "浅草観光",
          description: "散策",
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
      description: "更新後プラン",
    });

    const response = await regeneratePlan(basePlan, [{ role: "user", text: "カフェ追加" }]);

    expect(response.success).toBe(true);
    expect(response.data?.description).toBe("更新後プラン");
    expect(mockModifyItinerary).toHaveBeenCalledTimes(1);
  });

  it("retries once when first regenerated plan is unchanged", async () => {
    mockModifyItinerary
      .mockResolvedValueOnce({ ...basePlan })
      .mockResolvedValueOnce({
        ...basePlan,
        description: "2回目で変更",
      });

    const response = await regeneratePlan(basePlan, [{ role: "user", text: "昼食を安くして" }]);

    expect(response.success).toBe(true);
    expect(response.data?.description).toBe("2回目で変更");
    expect(mockModifyItinerary).toHaveBeenCalledTimes(2);

    const secondHistory = mockModifyItinerary.mock.calls[1][1];
    expect(secondHistory[secondHistory.length - 1].text).toContain("前回の出力は元プランと同一でした");
  });

  it("returns failure when plan remains unchanged after retry", async () => {
    mockModifyItinerary
      .mockResolvedValueOnce({ ...basePlan })
      .mockResolvedValueOnce({ ...basePlan });

    const response = await regeneratePlan(basePlan, [{ role: "user", text: "夜をゆったりに" }]);

    expect(response.success).toBe(false);
    expect(response.message).toContain("変更を作成できませんでした");
    expect(mockModifyItinerary).toHaveBeenCalledTimes(2);
  });
});
