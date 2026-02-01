// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "./gemini";

const { mockGenerateObject } = vi.hoisted(() => {
  return { mockGenerateObject: vi.fn() };
});

vi.mock("ai", () => {
  return {
    generateObject: mockGenerateObject,
  };
});

vi.mock("@ai-sdk/google", () => {
  return {
    createGoogleGenerativeAI: () => () => "mock-model",
  };
});

describe("GeminiService", () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiService("fake-api-key");
  });

  it("generates a valid itinerary from generateObject response", async () => {
    const mockObject = {
      id: "test-trip",
      destination: "Kyoto",
      heroImage: "http://example.com/img.jpg",
      description: "A trip to Kyoto",
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            { time: "10:00", activity: "Visit Temple", description: "Explore the temple" }
          ]
        }
      ],
      reference_indices: [],
    };
    mockGenerateObject.mockResolvedValue({ object: mockObject });

    const result = await service.generateItinerary("Kyoto trip", []);

    expect(result.destination).toBe("Kyoto");
    expect(result.heroImage).toBe("http://example.com/img.jpg");
    expect(mockGenerateObject).toHaveBeenCalled();
  });

  it("uses structured output with Zod schema", async () => {
    const mockObject = {
      id: "test-trip",
      destination: "Kyoto",
      heroImage: null,
      description: "A trip to Kyoto",
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            { time: "10:00", activity: "Visit Temple", description: "Explore the temple" }
          ]
        }
      ],
      reference_indices: [],
    };
    mockGenerateObject.mockResolvedValue({ object: mockObject });

    const result = await service.generateItinerary("Kyoto trip", []);
    expect(result.destination).toBe("Kyoto");

    // Verify that generateObject was called with a schema
    const callArgs = mockGenerateObject.mock.calls[0][0];
    expect(callArgs.schema).toBeDefined();
    expect(callArgs.model).toBe("mock-model");
  });

  it("handles null heroImage correctly", async () => {
    const mockObject = {
      id: "test-trip",
      destination: "Kyoto",
      heroImage: null,
      description: "A trip to Kyoto",
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            { time: "10:00", activity: "Visit Temple", description: "Explore the temple" }
          ]
        }
      ],
    };
    mockGenerateObject.mockResolvedValue({ object: mockObject });

    const result = await service.generateItinerary("Kyoto trip", []);
    expect(result.heroImage).toBeUndefined();
  });

  it("throws error when generateObject fails", async () => {
    mockGenerateObject.mockRejectedValue(new Error("AI service error"));

    await expect(service.generateItinerary("Kyoto trip", [])).rejects.toThrow(
      "旅程の生成に失敗しました"
    );
  });

  it("processes reference_indices correctly", async () => {
    const mockObject = {
      id: "test-trip",
      destination: "Kyoto",
      heroImage: null,
      description: "A trip to Kyoto",
      days: [
        {
          day: 1,
          title: "Day 1",
          activities: [
            { time: "10:00", activity: "Visit Temple", description: "Explore the temple" }
          ]
        }
      ],
      reference_indices: [0, 1],
    };
    mockGenerateObject.mockResolvedValue({ object: mockObject });

    const context = [
      { title: "Blog 1", url: "http://blog1.com", content: "Content 1", snippet: "Snippet 1" },
      { title: "Blog 2", url: "http://blog2.com", content: "Content 2", snippet: "Snippet 2" },
    ];

    const result = await service.generateItinerary("Kyoto trip", context);
    expect(result.references).toHaveLength(2);
    expect(result.references![0].title).toBe("Blog 1");
    expect(result.references![1].title).toBe("Blog 2");
  });
});
