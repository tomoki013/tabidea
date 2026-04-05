"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserInput } from "@/types";
import { useLimitModals } from "@/lib/hooks";
import { usePlanGeneration } from "@/lib/hooks/usePlanGeneration";
import SimplifiedInputFlow from "./SimplifiedInputFlow";
import { LoginPromptModal } from "@/components/ui/LoginPromptModal";
import { LimitExceededModal } from "@/components/ui/LimitExceededModal";
import {
  restorePendingState,
  clearPendingState,
} from "@/lib/restore/pending-state";
import PlanGenerationFailureSurface from "./PlanGenerationFailureSurface";

// ============================================================================
// Types
// ============================================================================

interface TravelPlannerSimplifiedProps {
  initialInput?: UserInput | null;
  onClose?: () => void;
  isInModal?: boolean;
}

// ============================================================================
// Default Input
// ============================================================================

const DEFAULT_INPUT: UserInput = {
  destinations: [],
  isDestinationDecided: undefined,
  region: "",
  dates: "",
  companions: "",
  theme: [],
  budget: "",
  pace: "",
  freeText: "",
  travelVibe: "",
  mustVisitPlaces: [],
  hasMustVisitPlaces: undefined,
  preferredTransport: [],
  fixedSchedule: [],
};

// ============================================================================
// Component
// ============================================================================

export default function TravelPlannerSimplified({
  initialInput,
  isInModal = false,
}: TravelPlannerSimplifiedProps) {
  const t = useTranslations("components.features.planner.travelPlannerSimplified");
  const searchParams = useSearchParams();
  const shouldRestore = searchParams.get("restore") === "true";

  // ========================================
  // User Input State
  // ========================================
  const [input, setInput] = useState<UserInput>(() => {
    if (initialInput) {
      const merged = { ...DEFAULT_INPUT, ...initialInput };
      if (
        merged.destinations &&
        merged.destinations.length > 0 &&
        !merged.isDestinationDecided
      ) {
        merged.isDestinationDecided = true;
      }
      if (!merged.dates) {
        merged.dates = t("defaultDates");
      }
      return merged;
    }
    return { ...DEFAULT_INPUT, dates: t("defaultDates") };
  });

  // ========================================
  // Compose Pipeline
  // ========================================
  const compose = usePlanGeneration();

  // ========================================
  // Limit Modals Hook
  // ========================================
  const {
    loginPrompt,
    limitExceeded: limitModal,
    showLoginPrompt,
    hideLoginPrompt,
    showLimitExceeded,
    hideLimitExceeded,
  } = useLimitModals();

  // ========================================
  // Restore State Notifications
  // ========================================
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [showPlannerInput, setShowPlannerInput] = useState(false);
  const plannerInputAnchorId = "planner-input-anchor";

  // ========================================
  // Handle Compose Pipeline Limit Exceeded
  // ========================================
  useEffect(() => {
    if (compose.limitExceeded) {
      if (compose.limitExceeded.userType === "anonymous") {
        showLoginPrompt({
          userInput: input,
          currentStep: 8,
          isInModal: isInModal,
        });
      } else {
        showLimitExceeded({
          resetAt: compose.limitExceeded.resetAt,
          actionType: "plan_generation",
        });
      }
      compose.clearLimitExceeded();
    }
  }, [compose.limitExceeded, input, showLoginPrompt, showLimitExceeded, compose, isInModal]);

  // ========================================
  // Restore Saved State
  // ========================================
  useEffect(() => {
    if (!shouldRestore) return;

    const frameId = requestAnimationFrame(() => {
      const result = restorePendingState();

      if (result.expired) {
        setShowExpiredNotice(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
        return;
      }

      if (
        result.success &&
        result.data &&
        result.data.restoreType === "wizard"
      ) {
        setInput(result.data.userInput);
        setShowRestoredNotice(true);
        clearPendingState();
        const url = new URL(window.location.href);
        url.searchParams.delete("restore");
        window.history.replaceState({}, "", url.toString());
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [shouldRestore]);

  // ========================================
  // Handlers
  // ========================================
  const handleChange = useCallback((update: Partial<UserInput>) => {
    setInput((prev) => ({ ...prev, ...update }));
  }, []);

  const handleGenerate = useCallback(
    async (
      inputOverride?: UserInput,
      options?: {
        isRetry?: boolean;
        originSurface?: "top_page" | "modal";
        keepInputHidden?: boolean;
      },
    ) => {
      setShowPlannerInput(!options?.keepInputHidden);
      window.scrollTo({ top: 0, behavior: "smooth" });
      await compose.generate(inputOverride || input, options);
    },
    [compose, input]
  );

  const effectiveFailureUi =
    compose.errorMessage && compose.originSurface === "top_page" && !isInModal && !compose.canRetry
      ? "modal"
      : compose.failureUi;

  const shouldHidePlannerInputForFailure =
    Boolean(compose.errorMessage)
    && effectiveFailureUi === "modal"
    && !showPlannerInput;

  useEffect(() => {
    if (!shouldHidePlannerInputForFailure) {
      return;
    }

    const anchor = document.getElementById(plannerInputAnchorId);
    if (!anchor) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      if (typeof anchor.scrollIntoView === "function") {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [shouldHidePlannerInputForFailure]);

  const handleReturnToInput = useCallback(() => {
    setShowPlannerInput(true);
    compose.clearFailure();
    if (isInModal) {
      return;
    }
    const anchor = document.getElementById(plannerInputAnchorId);
    if (anchor && typeof anchor.scrollIntoView === "function") {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [compose, isInModal]);

  const handleRetryFromFailure = useCallback(async () => {
    if (compose.canRetry) {
      await handleGenerate(undefined, {
        isRetry: true,
        originSurface: isInModal ? "modal" : "top_page",
        keepInputHidden: !isInModal,
      });
    } else {
      compose.clearFailure();
      await handleGenerate(undefined, {
        isRetry: false,
        originSurface: isInModal ? "modal" : "top_page",
        keepInputHidden: !isInModal,
      });
    }
  }, [compose, handleGenerate, isInModal]);

  // ========================================
  // Render: Input Flow (Default)
  // ========================================
  return (
    <>
      {/* Expired Notice */}
      {showExpiredNotice && (
        <div className="fixed top-4 right-4 z-50 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-amber-800 text-sm font-medium">
                {t("notices.expired")}
              </p>
            </div>
            <button
              onClick={() => setShowExpiredNotice(false)}
              className="text-amber-500 hover:text-amber-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Restored Notice */}
      {showRestoredNotice && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-green-800 text-sm font-medium">
                {t("notices.restored")}
              </p>
            </div>
            <button
              onClick={() => setShowRestoredNotice(false)}
              className="text-green-500 hover:text-green-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div id={plannerInputAnchorId} />

      {compose.errorMessage && effectiveFailureUi === "banner" && (
        <div className="mx-auto mb-4 w-full max-w-5xl px-4">
          <PlanGenerationFailureSurface
            variant="banner"
            message={compose.errorMessage}
            canRetry={compose.canRetry}
            onPrimaryAction={handleRetryFromFailure}
            onSecondaryAction={handleReturnToInput}
          />
        </div>
      )}

      {/* Input Flow */}
      {!shouldHidePlannerInputForFailure && (
        <SimplifiedInputFlow
          input={input}
          onChange={handleChange}
          onGenerate={(nextInput) =>
            handleGenerate(nextInput, {
              originSurface: isInModal ? "modal" : "top_page",
            })
          }
          isGenerating={compose.isGenerating}
          isInModal={isInModal}
        />
      )}

      {compose.errorMessage && effectiveFailureUi === "modal" && (
        <PlanGenerationFailureSurface
          variant="modal"
          message={compose.errorMessage}
          canRetry={compose.canRetry}
          onPrimaryAction={handleRetryFromFailure}
          onSecondaryAction={handleReturnToInput}
        />
      )}

      {/* Rate Limit Modals */}
      <LoginPromptModal
        isOpen={loginPrompt.isOpen}
        onClose={hideLoginPrompt}
        userInput={loginPrompt.userInput}
        currentStep={loginPrompt.currentStep}
        isInModal={loginPrompt.isInModal}
      />
      <LimitExceededModal
        isOpen={limitModal.isOpen}
        onClose={hideLimitExceeded}
        resetAt={limitModal.resetAt}
        actionType={limitModal.actionType}
      />
    </>
  );
}
