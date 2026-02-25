/**
 * Plan Display Components
 *
 * Components for displaying and interacting with generated travel plans:
 * - GeneratingOverlay: Progress indicator for streaming generation
 * - DayPlaceholder: Skeleton loading for days being generated
 * - Card components: SpotCard, TransitCard, AccommodationCard
 */

export { default as GeneratingOverlay } from "./GeneratingOverlay";
export type {
  GeneratingOverlayProps,
  DayGenerationState,
  DayGenerationStatus,
} from "./GeneratingOverlay";

export { default as DayPlaceholder } from "./DayPlaceholder";
export type { DayPlaceholderProps } from "./DayPlaceholder";

// Re-export card components
export * from "./cards";

// Re-export map components
export { MapRenderer, StaticMapView } from "./map";
export type { MapRendererProps, MapViewProps, MapMarker } from "./map";

// Re-export itinerary map components
export { ItineraryMapRenderer, StaticItineraryMap } from "./itinerary-map";
export type {
  ItineraryMapRendererProps,
  ItineraryMapBaseProps,
} from "./itinerary-map";
