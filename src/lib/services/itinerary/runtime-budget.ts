// Shared runtime budget for itinerary generation pipelines.
// Note: Next.js segment config exports like `maxDuration` must remain literals in
// route files, so this module is for application-side deadline math only.
// We still keep the underlying budget aligned to the same 9s route cap that is
// used in the itinerary APIs for Netlify free-plan safety (10s hard limit).

export const ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS = 25;

export const SEED_RESPONSE_RESERVE_MS = 200;
export const SPOTS_RESPONSE_RESERVE_MS = 500;
