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
  };

  const mockResult: Itinerary = {
    id: "test-id",
    destination: "Tokyo",
    heroImage: "img.jpg",
    description: "A trip to Tokyo",
    days: [
      {
        day: 1,
        title: "Arrival",
        activities: [
          { time: "10:00", activity: "Airport", description: "Land at Narita" },
        ],
      },
    ],
    references: [],
  };

  it("should correctly encode and decode plan data using LZString", () => {
    const encoded = encodePlanData(mockInput, mockResult);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe("string");
    const decoded = decodePlanData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.input).toEqual(mockInput);
    expect(decoded?.result).toEqual(mockResult);
  });

  it("should handle unicode characters with LZString", () => {
    const unicodeInput = { ...mockInput, destination: "東京" };
    const encoded = encodePlanData(unicodeInput, mockResult);
    const decoded = decodePlanData(encoded);
    expect(decoded?.input.destination).toBe("東京");
  });

  it("should decode legacy pako format correctly (fallback)", () => {
    // Replicate legacy creation logic exactly
    const data = JSON.stringify({ input: mockInput, result: mockResult });
    const compressed = pako.deflate(data);
    const legacyEncoded = Buffer.from(compressed).toString("base64url");

    // Now test the actual function
    const decoded = decodePlanData(legacyEncoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.input).toEqual(mockInput);
    expect(decoded?.result).toEqual(mockResult);
  });
});
