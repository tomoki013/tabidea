import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockCreateJob = vi.fn();
const mockVerifyAndGetJob = vi.fn();
const mockProcessComposeJob = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => mockGetUser(),
}));

vi.mock("@/lib/services/itinerary/compose-job-store", () => ({
  ComposeJobStore: class {
    createJob(...args: unknown[]) {
      return mockCreateJob(...args);
    }
    verifyAndGetJob(...args: unknown[]) {
      return mockVerifyAndGetJob(...args);
    }
  },
}));

vi.mock("@/lib/services/itinerary/process-compose-job", () => ({
  processComposeJob: (...args: unknown[]) => mockProcessComposeJob(...args),
}));

describe("POST /api/itinerary/compose-jobs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue(null);
    mockProcessComposeJob.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockRejectedValue(new Error("background unavailable")) as typeof fetch;
  });

  it("creates a compose job and falls back to in-process execution when background trigger fails", async () => {
    mockCreateJob.mockResolvedValue({
      jobId: "job-1",
      accessToken: "token-1",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/itinerary/compose-jobs", {
        method: "POST",
        body: JSON.stringify({
          input: {
            destinations: ["東京"],
            region: "domestic",
            dates: "1日間",
            companions: "友達",
            theme: ["グルメ"],
            budget: "standard",
            pace: "balanced",
            freeText: "",
          },
        }),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      jobId: "job-1",
      accessToken: "token-1",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockProcessComposeJob).toHaveBeenCalledTimes(1);
    expect(mockProcessComposeJob.mock.calls[0][0]).toMatch(
      /^[0-9a-f-]{36}$/i
    );
  });
});

describe("GET /api/itinerary/compose-jobs/[jobId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a persisted compose job when the access token matches", async () => {
    mockVerifyAndGetJob.mockResolvedValue({
      jobId: "job-1",
      status: "running",
      currentStep: "semantic_plan",
      currentMessage: "候補スポットを選定中...",
      progress: {},
    });

    const { GET } = await import("./[jobId]/route");
    const response = await GET(
      new Request("https://example.com/api/itinerary/compose-jobs/job-1?accessToken=token-1"),
      {
        params: Promise.resolve({ jobId: "job-1" }),
      }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("running");
    expect(body.currentStep).toBe("semantic_plan");
  });
});
