// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "../gemini";

const { mockGenerateText } = vi.hoisted(() => {
  return { mockGenerateText: vi.fn() };
});

vi.mock("ai", () => {
  return {
    generateText: mockGenerateText,
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

  it("generates a valid itinerary from valid JSON response", async () => {
    const mockResponse = {
      text: JSON.stringify({
        id: "test-trip",
        destination: "Kyoto",
        heroImage: "http://example.com/img.jpg",
        description: "A trip to Kyoto",
        days: [],
        references: [],
      }),
    };
    mockGenerateText.mockResolvedValue(mockResponse);

    const result = await service.generateItinerary("Kyoto trip", []);

    expect(result.destination).toBe("Kyoto");
    expect(mockGenerateText).toHaveBeenCalled();
  });

  it("handles markdown code blocks in JSON response", async () => {
    const jsonStr = JSON.stringify({
      id: "test-trip",
      destination: "Kyoto",
    });
    const mockResponse = {
      text: "```json\n" + jsonStr + "\n```",
    };
    mockGenerateText.mockResolvedValue(mockResponse);

    const result = await service.generateItinerary("Kyoto trip", []);
    expect(result.destination).toBe("Kyoto");
  });

  it("throws error on invalid JSON", async () => {
    const mockResponse = {
      text: "Not JSON",
    };
    mockGenerateText.mockResolvedValue(mockResponse);

    await expect(service.generateItinerary("Kyoto trip", [])).rejects.toThrow();
  });
});
