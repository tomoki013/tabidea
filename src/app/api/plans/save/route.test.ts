import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  savePlanOnServer: vi.fn(),
}));

vi.mock("@/lib/plans/save-plan", () => ({
  savePlanOnServer: mocks.savePlanOnServer,
}));

import { POST } from "./route";

describe("POST /api/plans/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid JSON body", async () => {
    const request = new Request("http://localhost/api/plans/save", {
      method: "POST",
      body: "{invalid",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request_body",
    });
  });

  it("returns 400 when required payload fields are missing", async () => {
    const request = new Request("http://localhost/api/plans/save", {
      method: "POST",
      body: JSON.stringify({ input: { destinations: [] } }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_save_plan_payload",
    });
  });

  it("maps authentication failures to 401", async () => {
    mocks.savePlanOnServer.mockResolvedValue({
      success: false,
      error: "authentication_required",
    });

    const request = new Request("http://localhost/api/plans/save", {
      method: "POST",
      body: JSON.stringify({
        input: { destinations: ["Tokyo"] },
        itinerary: { destination: "Tokyo" },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mocks.savePlanOnServer).toHaveBeenCalledWith(
      { destinations: ["Tokyo"] },
      { destination: "Tokyo" },
      false
    );
  });

  it("returns the serialized save result on success", async () => {
    mocks.savePlanOnServer.mockResolvedValue({
      success: true,
      shareCode: "share-123",
      plan: {
        id: "plan-123",
        shareCode: "share-123",
        destination: "Tokyo",
        durationDays: 3,
        thumbnailUrl: null,
        isPublic: false,
        createdAt: "2026-03-11T12:00:00.000Z",
        updatedAt: "2026-03-11T12:30:00.000Z",
      },
    });

    const request = new Request("http://localhost/api/plans/save", {
      method: "POST",
      body: JSON.stringify({
        input: { destinations: ["Tokyo"] },
        itinerary: { destination: "Tokyo" },
        isPublic: true,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      shareCode: "share-123",
      plan: {
        id: "plan-123",
        shareCode: "share-123",
        destination: "Tokyo",
        durationDays: 3,
        thumbnailUrl: null,
        isPublic: false,
        createdAt: "2026-03-11T12:00:00.000Z",
        updatedAt: "2026-03-11T12:30:00.000Z",
      },
    });
    expect(mocks.savePlanOnServer).toHaveBeenCalledWith(
      { destinations: ["Tokyo"] },
      { destination: "Tokyo" },
      true
    );
  });
});
