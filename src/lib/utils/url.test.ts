import { describe, it, expect } from "vitest";
import { encodePlanData, decodePlanData, encodeInputData, decodeInputData } from "./url";
import { Itinerary, UserInput } from "@/types";
import LZString from "lz-string";
import pako from "pako";

describe("urlUtils", () => {
  const mockInput: UserInput = {
    destinations: ["Tokyo"],
    dates: "2024-01-01",
    companions: "solo",
    theme: ["food", "history"],
    isDestinationDecided: true,
    region: "domestic",
    budget: "standard",
    pace: "standard",
    freeText: "",
    travelVibe: "vibey",
    mustVisitPlaces: ["Place A"],
    hasMustVisitPlaces: true
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

    // Verify Input
    expect(decoded?.input.dates).toBe(mockInput.dates);
    expect(decoded?.input.theme).toEqual(mockInput.theme);
    expect(decoded?.input.destinations[0]).toBe(mockResult.destination); // Inferred from result or input

    // Now these fields should be preserved
    expect(decoded?.input.budget).toBe(mockInput.budget);
    expect(decoded?.input.pace).toBe(mockInput.pace);
    expect(decoded?.input.companions).toBe(mockInput.companions);
    expect(decoded?.input.region).toBe(mockInput.region); // Depending on implementation
    expect(decoded?.input.travelVibe).toBe(mockInput.travelVibe);
    expect(decoded?.input.mustVisitPlaces).toEqual(mockInput.mustVisitPlaces);
    expect(decoded?.input.hasMustVisitPlaces).toBe(mockInput.hasMustVisitPlaces);

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
    const unicodeInput = { ...mockInput, destinations: ["東京"] };
    // result destination must match input destination for consistency in this test logic
    const unicodeResult = { ...mockResult, destination: "東京" };

    const encoded = encodePlanData(unicodeInput, unicodeResult);
    const decoded = decodePlanData(encoded);
    expect(decoded?.input.destinations[0]).toBe("東京");
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

  it("should return null for empty encoded string", () => {
    expect(decodePlanData("")).toBeNull();
  });

  it("should return null for invalid encoded string", () => {
    expect(decodePlanData("invalid-data-string")).toBeNull();
  });

  it("should return null for malformed JSON", () => {
    const encoded = LZString.compressToEncodedURIComponent("{invalid json}");
    expect(decodePlanData(encoded)).toBeNull();
  });

  it("should return null for unknown format", () => {
    const data = JSON.stringify({ unknown: "format" });
    const encoded = LZString.compressToEncodedURIComponent(data);
    expect(decodePlanData(encoded)).toBeNull();
  });

  describe("encodeInputData and decodeInputData", () => {
    it("should correctly encode and decode input data", () => {
      const encoded = encodeInputData(mockInput);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe("string");

      const decoded = decodeInputData(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.destinations[0]).toBe(mockInput.destinations[0]);
      expect(decoded?.dates).toBe(mockInput.dates);
      expect(decoded?.theme).toEqual(mockInput.theme);
      expect(decoded?.companions).toBe(mockInput.companions);
      expect(decoded?.budget).toBe(mockInput.budget);
      expect(decoded?.pace).toBe(mockInput.pace);
      expect(decoded?.travelVibe).toBe(mockInput.travelVibe);
      expect(decoded?.mustVisitPlaces).toEqual(mockInput.mustVisitPlaces);
      expect(decoded?.hasMustVisitPlaces).toBe(mockInput.hasMustVisitPlaces);
      expect(decoded?.isDestinationDecided).toBe(mockInput.isDestinationDecided);
    });

    it("should handle unicode characters in input data", () => {
      const unicodeInput: UserInput = {
        ...mockInput,
        destinations: ["東京"],
        freeText: "日本料理を楽しみたい",
      };

      const encoded = encodeInputData(unicodeInput);
      const decoded = decodeInputData(encoded);
      expect(decoded?.destinations[0]).toBe("東京");
      expect(decoded?.freeText).toBe("日本料理を楽しみたい");
    });

    it("should return null for empty encoded string", () => {
      expect(decodeInputData("")).toBeNull();
    });

    it("should return null for invalid encoded string", () => {
      expect(decodeInputData("invalid-data")).toBeNull();
    });

    it("should handle input with minimal fields", () => {
      const minimalInput: UserInput = {
        destinations: ["Paris"],
        dates: "2024-06-01",
        theme: ["culture"],
        isDestinationDecided: false,
        region: "overseas",
        companions: "any",
        budget: "any",
        pace: "any",
        freeText: "",
        travelVibe: "",
        mustVisitPlaces: [],
        hasMustVisitPlaces: false,
      };

      const encoded = encodeInputData(minimalInput);
      const decoded = decodeInputData(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.destinations[0]).toBe("Paris");
      expect(decoded?.isDestinationDecided).toBe(false);
      expect(decoded?.hasMustVisitPlaces).toBe(false);
    });

    it("should return null for malformed JSON in input data", () => {
      const encoded = LZString.compressToEncodedURIComponent("not valid json");
      expect(decodeInputData(encoded)).toBeNull();
    });

    it("should return null for data without version field", () => {
      const data = JSON.stringify({ in: mockInput }); // Missing 'v' field
      const encoded = LZString.compressToEncodedURIComponent(data);
      expect(decodeInputData(encoded)).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle result without references", () => {
      const resultWithoutRefs: Itinerary = {
        ...mockResult,
        references: undefined,
      };

      const encoded = encodePlanData(mockInput, resultWithoutRefs);
      const decoded = decodePlanData(encoded);
      expect(decoded?.result.references).toEqual([]);
    });

    it("should handle empty days array", () => {
      const resultWithEmptyDays: Itinerary = {
        ...mockResult,
        days: [],
      };

      const encoded = encodePlanData(mockInput, resultWithEmptyDays);
      const decoded = decodePlanData(encoded);
      expect(decoded?.result.days).toEqual([]);
    });

    it("should handle activities with special characters", () => {
      const resultWithSpecialChars: Itinerary = {
        ...mockResult,
        days: [
          {
            day: 1,
            title: "Day 1 & More!",
            activities: [
              {
                time: "10:00",
                activity: "Visit <Tokyo Tower>",
                description: "See the \"view\" & enjoy",
              },
            ],
          },
        ],
      };

      const encoded = encodePlanData(mockInput, resultWithSpecialChars);
      const decoded = decodePlanData(encoded);
      expect(decoded?.result.days[0].title).toBe("Day 1 & More!");
      expect(decoded?.result.days[0].activities[0].activity).toBe("Visit <Tokyo Tower>");
    });
  });
});
