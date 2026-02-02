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
import TravelPlannerLegacy from "./TravelPlannerLegacy";
import type { UserInput } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface TravelPlannerProps {
  /** Initial input values (for editing existing plans) */
  initialInput?: UserInput | null;
  /** Initial step (for legacy wizard mode - if provided, uses legacy 10-step wizard) */
  initialStep?: number;
  /** Callback when planner is closed/completed */
  onClose?: () => void;
  /** Show outline review step before generating details */
  showOutlineReview?: boolean;
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
 * If `initialStep` is provided, it falls back to the legacy 10-step wizard
 * for backward compatibility.
 *
 * Phase 1 (Essential): Destination, dates, companions
 * Phase 2 (Details): Theme, budget, pace
 * Phase 3 (Additional): Must-visit places, free text
 */
export default function TravelPlanner({
  initialInput,
  initialStep,
  onClose,
  showOutlineReview = false,
}: TravelPlannerProps) {
  // Use legacy wizard if initialStep is explicitly provided (for backward compatibility)
  if (initialStep !== undefined) {
    return (
      <TravelPlannerLegacy
        initialInput={initialInput}
        initialStep={initialStep}
        onClose={onClose}
      />
    );
  }

  return (
    <TravelPlannerSimplified
      initialInput={initialInput}
      onClose={onClose}
      showOutlineReview={showOutlineReview}
    />
  );
}

// ============================================================================
// Named Exports
// ============================================================================

// Re-export the simplified planner for explicit imports
export { default as TravelPlannerSimplified } from "./TravelPlannerSimplified";

// Re-export the legacy wizard for backward compatibility
export { default as TravelPlannerLegacy } from "./TravelPlannerLegacy";

// Re-export input flow component
export { default as SimplifiedInputFlow } from "./SimplifiedInputFlow";

// Re-export streaming result view
export { default as StreamingResultView } from "./StreamingResultView";

// Re-export loading animations
export { default as OutlineLoadingAnimation } from "./OutlineLoadingAnimation";
export { default as LoadingView } from "./LoadingView";

// Re-export outline review
export { default as OutlineReview } from "./OutlineReview";

// Re-export day placeholder
export { default as DayPlaceholder } from "./DayPlaceholder";

// Re-export generating overlay
export { default as GeneratingOverlay } from "./GeneratingOverlay";
