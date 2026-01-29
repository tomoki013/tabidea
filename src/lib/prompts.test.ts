import { buildConstraintsPrompt, buildTransitSchedulePrompt } from "./prompts";
import { TransitInfo } from "@/types";

describe("Prompts Utility", () => {
  describe("buildConstraintsPrompt", () => {
    it("should return empty string if no transits", () => {
      expect(buildConstraintsPrompt({})).toBe("");
      expect(buildConstraintsPrompt(undefined)).toBe("");
    });

    it("should generate constraints for booked transits", () => {
      const transits: Record<number, TransitInfo> = {
        1: {
          type: "flight",
          departure: { place: "Tokyo", time: "10:00" },
          arrival: { place: "Sapporo", time: "12:00" },
          isBooked: true,
        },
      };
      const result = buildConstraintsPrompt(transits);
      expect(result).toContain("Day 1");
      expect(result).toContain("STARTING LOCATION: Must be consistent with Day 0's overnight location (or Tokyo)");
      expect(result).toContain("OVERNIGHT LOCATION: MUST be in or near Sapporo");
      expect(result).toContain("NO activities 2 hours before 10:00");
      expect(result).toContain("NO activities 1 hour after 12:00");
    });

    it("should ignore unbooked transits in constraints", () => {
      const transits: Record<number, TransitInfo> = {
        1: {
          type: "flight",
          departure: { place: "Tokyo" },
          arrival: { place: "Sapporo" },
          isBooked: false,
        },
      };
      const result = buildConstraintsPrompt(transits);
      expect(result).toBe("");
    });

    it("should handle default isBooked=true", () => {
        const transits: Record<number, TransitInfo> = {
            1: {
              type: "flight",
              departure: { place: "Tokyo" },
              arrival: { place: "Sapporo" },
              // isBooked is undefined
            },
          };
          const result = buildConstraintsPrompt(transits);
          expect(result).toContain("OVERNIGHT LOCATION: MUST be in or near Sapporo");
    });
  });

  describe("buildTransitSchedulePrompt", () => {
    it("should generate schedule for both booked and unbooked", () => {
      const transits: Record<number, TransitInfo> = {
        1: {
          type: "flight",
          departure: { place: "Tokyo" },
          arrival: { place: "Sapporo" },
          isBooked: true,
        },
        3: {
            type: "train",
            departure: { place: "Sapporo" },
            arrival: { place: "Otaru" },
            isBooked: false,
        }
      };
      const result = buildTransitSchedulePrompt(transits);

      expect(result).toContain("Day 1: [FIXED/BOOKED - DO NOT CHANGE]");
      expect(result).toContain("This is IMMUTABLE");

      expect(result).toContain("Day 3: [PREFERENCE/SUGGESTED]");
      expect(result).toContain("This is a user preference");
    });
  });
});
