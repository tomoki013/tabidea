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

vi.mock("./model-provider", () => {
  return {
    resolveModel: () => ({ model: "mock-model", modelName: "mock", provider: "gemini" }),
    resolveModelForProvider: () => ({ model: "mock-model", modelName: "mock", provider: "gemini" }),
    resolveProvider: () => "gemini",
    isBothProvidersAvailable: () => false,
    getAlternateProvider: () => "openai",
  };
});

vi.mock("./model-selector", () => {
  return {
    selectModel: () => ({ modelName: "mock-model", tier: "flash", temperature: 0.3 }),
    evaluateComplexity: () => "simple",
  };
});

describe("GeminiService - modifyItinerary", () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiService();
  });

  it("includes full conversation history in the prompt", async () => {
    const mockPlan = {
      id: "test-id",
      destination: "Tokyo",
      description: "Original description",
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

    const mockObject = {
      ...mockPlan,
      description: "Updated description",
    };
    mockGenerateObject.mockResolvedValue({ object: mockObject });

    const chatHistory = [
      { role: "user", text: "Please change dinner." },
      { role: "assistant", text: "I suggest Sushi." },
      { role: "user", text: "Okay, let's do that." },
    ];

    await service.modifyItinerary(mockPlan as any, chatHistory);

    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateObject.mock.calls[0][0];
    const prompt = callArgs.prompt;

    // Check if the prompt contains the conversation history correctly formatted
    expect(prompt).toContain("USER: Please change dinner.");
    expect(prompt).toContain("AI (Assistant): I suggest Sushi.");
    expect(prompt).toContain("USER: Okay, let's do that.");
  });

  it("preserves original heroImage when not in response", async () => {
    const mockPlan = {
      id: "test-id",
      destination: "Tokyo",
      description: "Original description",
      heroImage: "http://original-image.jpg",
      heroImagePhotographer: "Original Photographer",
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

    const mockObject = {
      id: "test-id",
      destination: "Tokyo",
      description: "Updated description",
      heroImage: null,
      days: mockPlan.days,
    };
    mockGenerateObject.mockResolvedValue({ object: mockObject });

    const result = await service.modifyItinerary(mockPlan as any, []);

    expect(result.heroImage).toBe("http://original-image.jpg");
    expect(result.heroImagePhotographer).toBe("Original Photographer");
  });

  it("throws error when modification fails", async () => {
    const mockPlan = {
      id: "test-id",
      destination: "Tokyo",
      days: [],
    };

    mockGenerateObject.mockRejectedValue(new Error("AI service error"));

    await expect(service.modifyItinerary(mockPlan as any, [])).rejects.toThrow(
      "旅程の修正に失敗しました"
    );
  });
});
