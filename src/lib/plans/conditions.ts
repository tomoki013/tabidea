import type { UserInput } from '@/types/user-input';
import type { PublicConditionsSnapshot } from '@/types/plans';

/**
 * Builds a safe conditions snapshot from UserInput.
 * Excludes freeText and fixedSchedule for privacy.
 */
export function buildConditionsSnapshot(
  input: UserInput,
  durationDays?: number | null,
): PublicConditionsSnapshot {
  return {
    destinations: input.destinations,
    region: input.region,
    dates: input.dates,
    companions: input.companions,
    theme: input.theme,
    budget: input.budget,
    pace: input.pace,
    travelVibe: input.travelVibe,
    mustVisitPlaces: input.mustVisitPlaces,
    durationDays: durationDays ?? null,
  };
}

/**
 * Converts a conditions snapshot back to a partial UserInput
 * for pre-filling TravelPlannerSimplified.
 */
export function conditionsSnapshotToUserInput(
  snapshot: PublicConditionsSnapshot,
): Partial<UserInput> {
  return {
    destinations: snapshot.destinations,
    region: snapshot.region,
    dates: snapshot.dates,
    companions: snapshot.companions,
    theme: snapshot.theme,
    budget: snapshot.budget,
    pace: snapshot.pace,
    travelVibe: snapshot.travelVibe,
    mustVisitPlaces: snapshot.mustVisitPlaces,
  };
}
