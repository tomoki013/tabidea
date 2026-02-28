import type { Itinerary, UserInput } from "@/types";
import type {
  TripPlan,
  TravelerState,
  TripContext,
  PlanSlot,
  ReplanTriggerType,
} from "@/types/replan";

/**
 * Convert an Itinerary + UserInput into a TripPlan for the replan engine.
 */
export function buildTripPlan(itinerary: Itinerary, input: UserInput): TripPlan {
  const slots: PlanSlot[] = [];

  for (const day of itinerary.days) {
    for (let i = 0; i < day.activities.length; i++) {
      const activity = day.activities[i];
      slots.push({
        id: `day${day.day}-slot${i}`,
        dayNumber: day.day,
        slotIndex: i,
        activity,
        startTime: activity.time || undefined,
        bufferMinutes: 15,
        isSkippable: true,
        priority: "should",
        constraints: [],
      });
    }
  }

  return {
    itinerary,
    slots,
    constraints: [],
    metadata: {
      city: itinerary.destination,
      totalDays: itinerary.days.length,
      companionType: input.companions || "",
      budget: input.budget || "",
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Build a default TravelerState based on the trigger type.
 */
export function buildDefaultTravelerState(
  triggerType: ReplanTriggerType
): TravelerState {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const defaults: Record<ReplanTriggerType, Partial<TravelerState>> = {
    rain: {
      estimatedFatigue: 0.3,
      walkingDistanceKm: 2,
      delayMinutes: 0,
    },
    fatigue: {
      estimatedFatigue: 0.7,
      walkingDistanceKm: 8,
      delayMinutes: 0,
    },
    delay: {
      estimatedFatigue: 0.4,
      walkingDistanceKm: 3,
      delayMinutes: 30,
    },
  };

  return {
    estimatedFatigue: 0.3,
    walkingDistanceKm: 2,
    delayMinutes: 0,
    currentTime,
    triggerType,
    ...defaults[triggerType],
  };
}

/**
 * Build a TripContext from an Itinerary + UserInput.
 */
export function buildTripContext(
  itinerary: Itinerary,
  input: UserInput
): TripContext {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return {
    city: itinerary.destination,
    currentTime,
    bookings: [],
    companionType: input.companions || "",
    budget: input.budget || "",
  };
}
