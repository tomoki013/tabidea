/**
 * Card Components for Plan Display
 *
 * A set of expandable card components for displaying itinerary items:
 * - SpotCard: For tourist spots, restaurants, activities
 * - TransitCard: For transportation (flight, train, bus, etc.)
 * - AccommodationCard: For hotels and lodging
 * - TrustBadge: For indicating verification status
 */

export { default as BaseCard } from "./BaseCard";
export type { BaseCardProps, CardState } from "./BaseCard";

export { default as SpotCard } from "./SpotCard";
export type { SpotCardProps } from "./SpotCard";

export { default as TransitCard } from "./TransitCard";
export type { TransitCardProps } from "./TransitCard";

export { default as AccommodationCard } from "./AccommodationCard";
export type { AccommodationCardProps, AccommodationData } from "./AccommodationCard";

export { default as TrustBadge } from "./TrustBadge";
export type { TrustBadgeProps, TrustLevel } from "./TrustBadge";
