import { describe, it, expect } from "vitest";
import { encodePlanData, decodePlanData } from "./urlUtils";
import { Itinerary, UserInput } from "./types";
import LZString from "lz-string";
import pako from "pako";

describe("urlUtils", () => {
  const mockInput: UserInput = {
    destination: "Tokyo",
    dates: "2024-01-01",
    companions: "solo",
    theme: ["food", "history"],
    // Add missing fields to satisfy types (even though test might not enforce strictness)
    isDestinationDecided: true,
    region: "domestic",
    budget: "standard",
    pace: "medium",
    freeText: "",
    travelVibe: ""
  };

  const mockResult: Itinerary = {
    id: "test-id",
    destination: "Tokyo",
    heroImage: "img.jpg",
    description: "A trip to Tokyo",
    reasoning: "AI reasoning", // This should be stripped
    days: [
      {
        day: 1,
        title: "Arrival",
        activities: [
          { time: "10:00", activity: "Airport", description: "Land at Narita" },
        ],
      },
    ],
    references: [
        { title: "Ref1", url: "url1", snippet: "snippet1", image: "img1" } // snippet should be stripped
    ],
    reference_indices: [0] // Should be stripped
  };

  it("should correctly encode and decode plan data using LZString with minification", () => {
    const encoded = encodePlanData(mockInput, mockResult);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe("string");
    const decoded = decodePlanData(encoded);
    expect(decoded).not.toBeNull();

    // Verify Input (Note: defaults will be applied for non-saved fields)
    expect(decoded?.input.dates).toBe(mockInput.dates);
    expect(decoded?.input.theme).toEqual(mockInput.theme);
    expect(decoded?.input.destination).toBe(mockResult.destination); // Inferred from result
    // These fields are reset to defaults during hydration
    expect(decoded?.input.budget).toBe("any");
    expect(decoded?.input.pace).toBe("any");

    // Verify Result
    expect(decoded?.result.destination).toBe(mockResult.destination);
    expect(decoded?.result.description).toBe(mockResult.description);
    expect(decoded?.result.days).toEqual(mockResult.days);

    // Verify Stripped fields
    expect(decoded?.result.reasoning).toBeUndefined();
    expect(decoded?.result.reference_indices).toBeUndefined();
    expect(decoded?.result.references?.[0].snippet).toBeUndefined();
    expect(decoded?.result.references?.[0].title).toBe("Ref1");
  });

  it("should handle unicode characters with LZString", () => {
    const unicodeInput = { ...mockInput, destination: "東京" };
    // result destination must match input destination for consistency in this test logic
    const unicodeResult = { ...mockResult, destination: "東京" };

    const encoded = encodePlanData(unicodeInput, unicodeResult);
    const decoded = decodePlanData(encoded);
    expect(decoded?.input.destination).toBe("東京");
    expect(decoded?.result.destination).toBe("東京");
  });

  it("should decode legacy pako format correctly (fallback)", () => {
    // Replicate legacy creation logic exactly (full object)
    const data = JSON.stringify({ input: mockInput, result: mockResult });
    const compressed = pako.deflate(data);
    const legacyEncoded = Buffer.from(compressed).toString("base64url");

    // Now test the actual function
    const decoded = decodePlanData(legacyEncoded);
    expect(decoded).not.toBeNull();
    // Legacy decode returns full object
    expect(decoded?.input).toEqual(mockInput);
    expect(decoded?.result).toEqual(mockResult);
  });
});
