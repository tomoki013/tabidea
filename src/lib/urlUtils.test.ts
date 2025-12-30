import { describe, it, expect } from "vitest";
import { encodePlanData, decodePlanData } from "./urlUtils";
import { Itinerary, UserInput } from "./types";

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

  it("should correctly encode and decode plan data (compressed)", () => {
    const encoded = encodePlanData(mockInput, mockResult);
    expect(encoded).toBeTruthy();

    const decoded = decodePlanData(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.input).toEqual(mockInput);
    expect(decoded?.result).toEqual(mockResult);
  });

  it("should handle unicode characters", () => {
    const unicodeInput = { ...mockInput, destination: "東京" };
    const encoded = encodePlanData(unicodeInput, mockResult);
    const decoded = decodePlanData(encoded);
    expect(decoded?.input.destination).toBe("東京");
  });

  it("should return null for invalid base64", () => {
    const decoded = decodePlanData("invalid-base64");
    expect(decoded).toBeNull();
  });

  it("should decode legacy format correctly", () => {
    // This is a legacy encoded string (uncompressed Base64 of JSON)
    // Corresponds to mockInput and mockResult above
    const legacyJson = JSON.stringify({ i: mockInput, r: mockResult });
    const legacyEncoded = btoa(encodeURIComponent(legacyJson).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const decoded = decodePlanData(legacyEncoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.input).toEqual(mockInput);
    expect(decoded?.result).toEqual(mockResult);
  });
});
