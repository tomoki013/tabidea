import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  checkPlanCreationRate: vi.fn(),
  createPlan: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getUser: mocks.getUser,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkPlanCreationRate: mocks.checkPlanCreationRate,
}));

vi.mock("@/lib/plans/service", () => ({
  planService: {
    createPlan: mocks.createPlan,
  },
}));

import { savePlanOnServer } from "./save-plan";

describe("savePlanOnServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns authentication_required when no user is signed in", async () => {
    mocks.getUser.mockResolvedValue(null);

    const result = await savePlanOnServer({ destinations: [] } as never, {} as never);

    expect(result).toEqual({
      success: false,
      error: "authentication_required",
    });
    expect(mocks.checkPlanCreationRate).not.toHaveBeenCalled();
    expect(mocks.createPlan).not.toHaveBeenCalled();
  });

  it("returns the rate-limit message when creation is blocked", async () => {
    mocks.getUser.mockResolvedValue({ id: "user-1" });
    mocks.checkPlanCreationRate.mockResolvedValue({
      success: false,
      message: "rate_limited",
    });

    const result = await savePlanOnServer({ destinations: [] } as never, {} as never);

    expect(result).toEqual({
      success: false,
      error: "rate_limited",
    });
    expect(mocks.createPlan).not.toHaveBeenCalled();
  });

  it("serializes the created plan for API and action callers", async () => {
    const createdAt = new Date("2026-03-11T12:00:00.000Z");
    const updatedAt = new Date("2026-03-11T12:30:00.000Z");

    mocks.getUser.mockResolvedValue({ id: "user-1" });
    mocks.checkPlanCreationRate.mockResolvedValue({ success: true });
    mocks.createPlan.mockResolvedValue({
      success: true,
      shareCode: "share-123",
      plan: {
        id: "plan-123",
        shareCode: "share-123",
        destination: "Tokyo",
        durationDays: 3,
        thumbnailUrl: "https://example.com/thumb.jpg",
        isPublic: false,
        createdAt,
        updatedAt,
      },
    });

    const result = await savePlanOnServer(
      { destinations: ["Tokyo"] } as never,
      { destination: "Tokyo" } as never
    );

    expect(result).toEqual({
      success: true,
      shareCode: "share-123",
      plan: {
        id: "plan-123",
        shareCode: "share-123",
        destination: "Tokyo",
        durationDays: 3,
        thumbnailUrl: "https://example.com/thumb.jpg",
        isPublic: false,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    });
  });
});
