"use client";

/**
 * TravelPlanner - Main Entry Point
 *
 * This module exports the TravelPlanner component with a simplified 3-phase input flow
 * and streaming generation.
 *
 * Features:
 * - 3-phase input flow (Essential, Details, Additional)
 * - Streaming generation with outline-first display
 * - Card-based UI for activities, transit, and accommodation
 * - Rate limit handling with appropriate modals
 * - State restoration for pending input
 *
 * @see TravelPlannerSimplified for the main implementation
 * @see SimplifiedInputFlow for the 3-phase input UI
 * @see StreamingResultView for the result display with cards
 */

import TravelPlannerSimplified from "./TravelPlannerSimplified";
import type { UserInput } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface TravelPlannerProps {
  /** Initial input values (for editing existing plans) */
  initialInput?: UserInput | null;
  /** Deprecated compatibility prop. Ignored by the v4 planner. */
  initialStep?: number;
  /** Callback when planner is closed/completed */
  onClose?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TravelPlanner Component
 *
 * The main travel planner that uses a simplified 3-phase input flow
 * with streaming generation and card-based UI.
 *
 * Phase 1 (Essential): Destination, dates, companions
 * Phase 2 (Details): Theme, budget, pace
 * Phase 3 (Additional): Must-visit places, free text
 */
export default function TravelPlanner({
  initialInput,
  onClose,
}: TravelPlannerProps) {
  return (
    <TravelPlannerSimplified
      initialInput={initialInput}
      onClose={onClose}
    />
  );
}

// ============================================================================
// Named Exports
// ============================================================================

// Re-export the simplified planner for explicit imports
export { default as TravelPlannerSimplified } from "./TravelPlannerSimplified";

// Re-export input flow component
export { default as SimplifiedInputFlow } from "./SimplifiedInputFlow";

// Re-export streaming result view
export { default as StreamingResultView } from "./StreamingResultView";

// Re-export day placeholder
export { default as DayPlaceholder } from "./DayPlaceholder";
