// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiService } from "./gemini";

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

describe("GeminiService - modifyItinerary", () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiService("fake-api-key");
  });

  it("includes full conversation history in the prompt", async () => {
    const mockPlan = {
      id: "test-id",
      destination: "Tokyo",
      days: [],
    };

    const mockResponse = {
      text: JSON.stringify({
        ...mockPlan,
        description: "Updated description",
      }),
    };
    mockGenerateText.mockResolvedValue(mockResponse);

    const chatHistory = [
      { role: "user", text: "Please change dinner." },
      { role: "assistant", text: "I suggest Sushi." },
      { role: "user", text: "Okay, let's do that." },
    ];

    await service.modifyItinerary(mockPlan as any, chatHistory);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const callArgs = mockGenerateText.mock.calls[0][0];
    const prompt = callArgs.prompt;

    // Check if the prompt contains the conversation history correctly formatted
    expect(prompt).toContain("USER: Please change dinner.");
    expect(prompt).toContain("AI (Assistant): I suggest Sushi.");
    expect(prompt).toContain("USER: Okay, let's do that.");
  });
});
