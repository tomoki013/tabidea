"use client";

import { useState, useCallback } from "react";
import type { UserInput } from "@/types";
import type { UserType } from "@/lib/limits/config";

// ============================================================================
// Types
// ============================================================================

export interface LoginPromptState {
  isOpen: boolean;
  userInput?: UserInput;
  currentStep?: number;
  isInModal?: boolean;
}

export interface LimitExceededState {
  isOpen: boolean;
  resetAt: Date | null;
  actionType: "plan_generation" | "chat" | "regenerate";
}

export interface UseLimitModalsReturn {
  /** Login prompt modal state */
  loginPrompt: LoginPromptState;
  /** Limit exceeded modal state */
  limitExceeded: LimitExceededState;
  /** Show login prompt modal */
  showLoginPrompt: (options?: {
    userInput?: UserInput;
    currentStep?: number;
    isInModal?: boolean;
  }) => void;
  /** Hide login prompt modal */
  hideLoginPrompt: () => void;
  /** Show limit exceeded modal */
  showLimitExceeded: (options: {
    resetAt: Date | null;
    actionType?: "plan_generation" | "chat" | "regenerate";
  }) => void;
  /** Hide limit exceeded modal */
  hideLimitExceeded: () => void;
  /** Handle limit exceeded based on user type */
  handleLimitExceeded: (
    userType: UserType,
    resetAt: Date | null,
    options?: {
      userInput?: UserInput;
      currentStep?: number;
      isInModal?: boolean;
    }
  ) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useLimitModals(): UseLimitModalsReturn {
  // Login prompt state
  const [loginPrompt, setLoginPrompt] = useState<LoginPromptState>({
    isOpen: false,
  });

  // Limit exceeded state
  const [limitExceeded, setLimitExceeded] = useState<LimitExceededState>({
    isOpen: false,
    resetAt: null,
    actionType: "plan_generation",
  });

  // ========================================
  // Login Prompt Handlers
  // ========================================

  const showLoginPrompt = useCallback(
    (options?: {
      userInput?: UserInput;
      currentStep?: number;
      isInModal?: boolean;
    }) => {
      setLoginPrompt({
        isOpen: true,
        userInput: options?.userInput,
        currentStep: options?.currentStep,
        isInModal: options?.isInModal,
      });
    },
    []
  );

  const hideLoginPrompt = useCallback(() => {
    setLoginPrompt((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // ========================================
  // Limit Exceeded Handlers
  // ========================================

  const showLimitExceeded = useCallback(
    (options: {
      resetAt: Date | null;
      actionType?: "plan_generation" | "chat" | "regenerate";
    }) => {
      setLimitExceeded({
        isOpen: true,
        resetAt: options.resetAt,
        actionType: options.actionType || "plan_generation",
      });
    },
    []
  );

  const hideLimitExceeded = useCallback(() => {
    setLimitExceeded((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // ========================================
  // Combined Handler
  // ========================================

  /**
   * Handle limit exceeded based on user type
   * - anonymous: show login prompt
   * - authenticated: show limit exceeded modal
   */
  const handleLimitExceeded = useCallback(
    (
      userType: UserType,
      resetAt: Date | null,
      options?: {
        userInput?: UserInput;
        currentStep?: number;
        isInModal?: boolean;
      }
    ) => {
      if (userType === "anonymous") {
        // For anonymous users, show login prompt
        showLoginPrompt({
          userInput: options?.userInput,
          currentStep: options?.currentStep,
          isInModal: options?.isInModal,
        });
      } else {
        // For authenticated users, show limit exceeded modal
        showLimitExceeded({
          resetAt,
          actionType: "plan_generation",
        });
      }
    },
    [showLoginPrompt, showLimitExceeded]
  );

  return {
    loginPrompt,
    limitExceeded,
    showLoginPrompt,
    hideLoginPrompt,
    showLimitExceeded,
    hideLimitExceeded,
    handleLimitExceeded,
  };
}

export default useLimitModals;
