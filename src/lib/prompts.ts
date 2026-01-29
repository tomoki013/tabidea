import { TransitInfo } from "@/types";

/**
 * Builds a strict constraint prompt based on booked transits.
 * This ensures the AI respects geographic anchors and continuity.
 */
export function buildConstraintsPrompt(transits?: Record<number, TransitInfo>): string {
  if (!transits || Object.keys(transits).length === 0) {
    return "";
  }

  const bookedTransits = Object.entries(transits)
    .filter(([_, t]) => t.isBooked !== false) // Default to true if undefined
    .map(([day, t]) => ({ day: Number(day), ...t }));

  if (bookedTransits.length === 0) {
    return "";
  }

  let constraints = `
    === GEOGRAPHIC ANCHORS & LOGISTICS (MUST FOLLOW) ===
    The user has FIXED/BOOKED travel arrangements. You MUST build the plan around these anchors.
  `;

  // 1. Geographic Anchors
  bookedTransits.forEach((t) => {
    constraints += `
    - Day ${t.day}:
      - STARTING LOCATION: Must be consistent with Day ${t.day - 1}'s overnight location (or ${t.departure.place}).
      - TRANSIT: User travels from ${t.departure.place} to ${t.arrival.place}.
      - OVERNIGHT LOCATION: MUST be in or near ${t.arrival.place}.
    `;
  });

  // 2. Travel Buffers & Reality Check
  constraints += `
    \n    === TRAVEL BUFFERS ===
    For every booked transit, reserve time for check-in and travel:
  `;
  bookedTransits.forEach((t) => {
    const depTime = t.departure.time || "the departure time";
    const arrTime = t.arrival.time || "the arrival time";
    constraints += `
    - Day ${t.day} (${t.type}):
      - NO activities 2 hours before ${depTime} (Travel/Check-in).
      - NO activities 1 hour after ${arrTime} (Immigration/Travel to city).
    `;
  });

  // 3. Continuity
  constraints += `
    \n    === GEOGRAPHIC CONTINUITY ===
    - DO NOT TELEPORT.
    - The starting location of Day N MUST match the overnight location of Day N-1.
    - If Day 1 ends in Sapporo, Day 2 starts in Sapporo.
  `;

  return constraints;
}

/**
 * Builds a formatted schedule of transits, distinguishing between booked (FIXED) and unbooked (SUGGESTED).
 */
export function buildTransitSchedulePrompt(transits?: Record<number, TransitInfo>): string {
  if (!transits || Object.keys(transits).length === 0) {
    return "No fixed transit schedule.";
  }

  let schedule = "\n=== TRANSIT SCHEDULE ===\n";

  Object.entries(transits).forEach(([day, info]) => {
    const isBooked = info.isBooked !== false; // Default to true
    const status = isBooked ? "[FIXED/BOOKED - DO NOT CHANGE]" : "[PREFERENCE/SUGGESTED]";

    schedule += `- Day ${day}: ${status}\n`;
    schedule += `  Type: ${info.type}\n`;
    schedule += `  Route: ${info.departure.place} (${info.departure.time || "?"}) -> ${info.arrival.place} (${info.arrival.time || "?"})\n`;

    if (!isBooked) {
      schedule += `  Instruction: This is a user preference. If a better route/time exists for the overall flow, you may suggest alternatives, but try to respect the timing (e.g. morning/evening).\n`;
    } else {
      schedule += `  Instruction: This is IMMUTABLE. You must plan activities AROUND this transit.\n`;
    }

    if (info.memo) {
      schedule += `  Memo: ${info.memo}\n`;
    }
  });

  return schedule;
}
