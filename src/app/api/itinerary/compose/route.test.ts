import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runComposePipeline: vi.fn(),
}));

vi.mock("@/lib/services/itinerary/pipeline-orchestrator", () => ({
  runComposePipeline: mocks.runComposePipeline,
}));

vi.mock("@/lib/services/analytics/event-logger", () => ({
  EventLogger: class {
    async logGeneration() {}
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { POST } from "./route";

const makeRequest = () =>
  new Request("http://localhost/api/itinerary/compose", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
  });

const successResult = {
  success: true,
  itinerary: {
    destination: "東京",
    days: [{ day: 1 }],
  },
  warnings: [],
  metadata: {
    pipelineVersion: "v3" as const,
    candidateCount: 2,
    resolvedCount: 0,
    filteredCount: 2,
    placeResolveEnabled: false,
    stepTimings: {},
    modelName: "gemini-2.5-flash",
    modelTier: "flash" as const,
  },
};

describe("POST /api/itinerary/compose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("streams ack, complete, and done events", async () => {
    mocks.runComposePipeline.mockResolvedValue(successResult);

    const response = await POST(makeRequest());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(body).toContain('"type":"ack"');
    expect(body).toContain('"type":"complete"');
    expect(body).toContain('"type":"done"');
  });

  it("emits heartbeat events while the pipeline is still running", async () => {
    vi.useFakeTimers();
    mocks.runComposePipeline.mockImplementation(
      async () =>
        await new Promise((resolve) => {
          setTimeout(() => resolve(successResult), 4_500);
        })
    );

    const response = await POST(makeRequest());
    const bodyPromise = response.text();

    await vi.advanceTimersByTimeAsync(4_500);

    const body = await bodyPromise;
    expect(body).toContain('"type":"heartbeat"');
  });
});
