// Shared runtime budget for itinerary generation pipelines.
// Note: Next.js segment config exports like `maxDuration` must remain literals in
// route files, so this module is for application-side deadline math only.
//
// The public route cap is 25s, but AI-heavy phases should not spend that full
// window on compute. Netlify / serverless platforms still need tail time for
// log flush, JSON serialization, and the actual response write; when we consumed
// ~24.5s in-app, the platform could terminate the request before the fallback
// response reached the client.

export const ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS = 25;
export const ITINERARY_SPLIT_ROUTE_MAX_DURATION_MS =
  ITINERARY_SPLIT_ROUTE_MAX_DURATION_SECONDS * 1_000;

// Keep a few seconds of platform headroom so timeout fallbacks can still be
// returned reliably instead of being killed at the transport layer.
export const ITINERARY_SPLIT_PLATFORM_HEADROOM_MS = 4_000;

export const ITINERARY_SPLIT_APP_DEADLINE_MS =
  ITINERARY_SPLIT_ROUTE_MAX_DURATION_MS - ITINERARY_SPLIT_PLATFORM_HEADROOM_MS;

export const SEED_RESPONSE_RESERVE_MS = 400;
export const SPOTS_RESPONSE_RESERVE_MS = 700;
