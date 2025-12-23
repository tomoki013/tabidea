// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "../gemini";

// Mock response helpers
const mockText = (text: string) => ({ text: () => text });

const { mockGenerateContent } = vi.hoisted(() => {
  return { mockGenerateContent: vi.fn() };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      constructor(apiKey: string) {}
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
          startChat: vi.fn(() => ({
            sendMessage: vi.fn(async () => ({
              response: mockText("Chat response"),
            })),
          })),
        };
      }
    },
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
      response: mockText(
        JSON.stringify({
          id: "test-trip",
          destination: "Kyoto",
          heroImage: "http://example.com/img.jpg",
          description: "A trip to Kyoto",
          days: [],
          references: [],
        })
      ),
    };
    mockGenerateContent.mockResolvedValue(mockResponse);

    const result = await service.generateItinerary("Kyoto trip", []);

    expect(result.destination).toBe("Kyoto");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("handles markdown code blocks in JSON response", async () => {
    const jsonStr = JSON.stringify({
      id: "test-trip",
      destination: "Kyoto",
    });
    const mockResponse = {
      response: mockText("```json\n" + jsonStr + "\n```"),
    };
    mockGenerateContent.mockResolvedValue(mockResponse);

    const result = await service.generateItinerary("Kyoto trip", []);
    expect(result.destination).toBe("Kyoto");
  });

  it("throws error on invalid JSON", async () => {
    const mockResponse = {
      response: mockText("Not JSON"),
    };
    mockGenerateContent.mockResolvedValue(mockResponse);

    await expect(service.generateItinerary("Kyoto trip", [])).rejects.toThrow();
  });
});
