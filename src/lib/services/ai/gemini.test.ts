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

  describe("generateDayDetails", () => {
    it("includes Day 1 starting location constraint when startingLocation is provided for day 1", async () => {
      const mockDaysResponse = {
        days: [
          {
            day: 1,
            title: "Day 1 - Arrival",
            activities: [
              { time: "14:00", activity: "Check in", description: "Check in to hotel" },
            ],
          },
        ],
      };
      mockGenerateObject.mockResolvedValue({ object: mockDaysResponse });

      const outlineDays = [
        {
          day: 1,
          title: "Day 1",
          highlight_areas: ["Downtown"],
          overnight_location: "Kyoto Station Area",
        },
      ];

      await service.generateDayDetails(
        "Kyoto trip",
        [],
        1,
        1,
        outlineDays,
        "Kyoto" // startingLocation = destination for day 1
      );

      const callArgs = mockGenerateObject.mock.calls[0][0];
      const prompt = callArgs.prompt;

      // Verify day 1 specific starting location constraint is included
      expect(prompt).toContain("DAY 1");
      expect(prompt).toContain("Kyoto");
    });

    it("includes standard starting location constraint for day 2+", async () => {
      const mockDaysResponse = {
        days: [
          {
            day: 3,
            title: "Day 3 - Exploration",
            activities: [
              { time: "09:00", activity: "Breakfast", description: "Breakfast at hotel" },
            ],
          },
        ],
      };
      mockGenerateObject.mockResolvedValue({ object: mockDaysResponse });

      const outlineDays = [
        {
          day: 3,
          title: "Day 3",
          highlight_areas: ["Nara"],
          overnight_location: "Nara",
        },
      ];

      await service.generateDayDetails(
        "Kyoto trip",
        [],
        3,
        3,
        outlineDays,
        "Kyoto Station Area"
      );

      const callArgs = mockGenerateObject.mock.calls[0][0];
      const prompt = callArgs.prompt;

      // Verify standard constraint references waking up
      expect(prompt).toContain("waking up");
      expect(prompt).toContain("Kyoto Station Area");
    });

    it("returns generated days correctly", async () => {
      const mockDaysResponse = {
        days: [
          {
            day: 1,
            title: "Day 1",
            activities: [
              { time: "10:00", activity: "Visit Temple", description: "Explore" },
            ],
          },
          {
            day: 2,
            title: "Day 2",
            activities: [
              { time: "09:00", activity: "Morning Walk", description: "Walk around" },
            ],
          },
        ],
      };
      mockGenerateObject.mockResolvedValue({ object: mockDaysResponse });

      const outlineDays = [
        { day: 1, title: "Day 1", highlight_areas: ["A"], overnight_location: "X" },
        { day: 2, title: "Day 2", highlight_areas: ["B"], overnight_location: "Y" },
      ];

      const result = await service.generateDayDetails(
        "Test trip", [], 1, 2, outlineDays, "Tokyo"
      );

      expect(result).toHaveLength(2);
      expect(result[0].day).toBe(1);
      expect(result[1].day).toBe(2);
      expect(result[0].activities[0].activity).toBe("Visit Temple");
    });
  });
});
