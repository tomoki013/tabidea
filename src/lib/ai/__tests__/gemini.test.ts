// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "../gemini";

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: vi.fn(),
        startChat: vi.fn(() => ({
          sendMessage: vi.fn(async () => ({
            response: { text: () => "Chat response" },
          })),
        })),
      })),
    })),
  };
});

describe("GeminiService", () => {
  let service: GeminiService;
  let mockGenerateContent: any;

  beforeEach(() => {
    service = new GeminiService("fake-api-key");
    // Access the spy through the private property 'model'
    mockGenerateContent = (service as any).model.generateContent;
    vi.clearAllMocks();
  });

  it("generates a valid itinerary from valid JSON response", async () => {
    const mockResponse = {
      text: () =>
        JSON.stringify({
          id: "test-trip",
          destination: "Kyoto",
          heroImage: "http://example.com/img.jpg",
          description: "A trip to Kyoto",
          days: [],
          references: [],
        }),
    };
    mockGenerateContent.mockResolvedValue({ response: mockResponse });

    const result = await service.generateItinerary("Kyoto trip", []);

    expect(result.destination).toBe("Kyoto");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("handles markdown code blocks in JSON response", async () => {
    const mockResponse = {
      text: () =>
        "```json\n" +
        JSON.stringify({
          id: "test-trip",
          destination: "Kyoto",
        }) +
        "\n```",
    };
    mockGenerateContent.mockResolvedValue({ response: mockResponse });

    const result = await service.generateItinerary("Kyoto trip", []);
    expect(result.destination).toBe("Kyoto");
  });

  it("throws error on invalid JSON", async () => {
    const mockResponse = {
      text: () => "Not JSON",
    };
    mockGenerateContent.mockResolvedValue({ response: mockResponse });

    await expect(service.generateItinerary("Kyoto trip", [])).rejects.toThrow();
  });
});
