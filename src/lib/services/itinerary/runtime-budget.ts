// Shared runtime budget for itinerary generation routes.
// We keep route maxDuration aligned to Netlify free-plan safety (10s hard limit),
// but application-side deadlines should consume almost all of that budget and
// only reserve a small tail for JSON serialization / response flush.

export const ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS = 9;

export const SEED_RESPONSE_RESERVE_MS = 200;
export const SPOTS_RESPONSE_RESERVE_MS = 500;
