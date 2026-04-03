"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ComposeStep } from "@/lib/plan-generation/client-contract";
import ComposeLoadingAnimation from "./ComposeLoadingAnimation";

// ============================================================================
// Types
// ============================================================================

export type OverlayPhase =
  | "generating"
  | "regenerating"
  | "success"
  | "updating"
  | null;

interface FullScreenGenerationOverlayProps {
  phase: OverlayPhase;
  steps?: ComposeStep[];
  currentStep?: string | null;
  previewDestination?: string;
  previewDescription?: string;
  totalDays?: number;
  pauseStatusText?: string;
  onSuccessComplete?: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

function RegeneratingPhase({
  previewDestination,
}: {
  previewDestination?: string;
}) {
  const t = useTranslations(
    "components.features.planner.fullScreenOverlay"
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="relative p-8 sm:p-12 rounded-3xl bg-white/90 dark:bg-stone-900/90 shadow-2xl border border-stone-200 dark:border-stone-700 text-center max-w-md w-full backdrop-blur-sm">
        <div className="flex flex-col items-center gap-6">
          {/* Animated pencil */}
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-4 border-dashed border-primary/30 dark:border-primary/40 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
              ✏️
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 tracking-wide">
              {t("regenerating.title")}
            </h2>
            {previewDestination && (
              <p className="text-stone-600 dark:text-stone-400 text-sm">
                {previewDestination}
              </p>
            )}
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              {t("regenerating.subtitle")}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-32 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-indeterminate rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessPhase({
  previewDestination,
}: {
  previewDestination?: string;
}) {
  const t = useTranslations(
    "components.features.planner.fullScreenOverlay"
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <motion.div
        className="flex flex-col items-center gap-6 text-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Animated checkmark */}
        <div className="relative w-28 h-28">
          <svg
            viewBox="0 0 52 52"
            className="w-full h-full"
          >
            <motion.circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            <motion.path
              d="M15 27l6 6 16-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.4, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Success text */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <h2 className="text-3xl font-serif font-bold text-stone-800 dark:text-stone-100">
            {t("success.title")}
          </h2>
          {previewDestination && (
            <p className="text-lg text-stone-600 dark:text-stone-300">
              {previewDestination}
            </p>
          )}
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {t("success.subtitle")}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function UpdatingPhase() {
  const t = useTranslations(
    "components.features.planner.fullScreenOverlay"
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-5">
      <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      <div className="text-center space-y-1">
        <h2 className="text-xl font-serif font-bold text-stone-800 dark:text-stone-100">
          {t("updating.title")}
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          {t("updating.subtitle")}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function FullScreenGenerationOverlay({
  phase,
  steps,
  currentStep,
  previewDestination,
  previewDescription,
  totalDays,
  pauseStatusText,
  onSuccessComplete,
}: FullScreenGenerationOverlayProps) {
  // SSR-safe: useSyncExternalStore returns false on server, true on client
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Scroll lock when overlay is visible
  useEffect(() => {
    if (!phase) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [phase]);

  // Auto-transition from success to updating
  useEffect(() => {
    if (phase !== "success" || !onSuccessComplete) return;

    const timer = setTimeout(() => {
      onSuccessComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [phase, onSuccessComplete]);

  const renderContent = useCallback(() => {
    switch (phase) {
      case "generating":
        return (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-background"
          >
            <ComposeLoadingAnimation
              steps={steps ?? []}
              currentStep={currentStep ?? null}
              previewDestination={previewDestination}
              previewDescription={previewDescription}
              totalDays={totalDays}
              pauseStatusText={pauseStatusText}
            />
          </motion.div>
        );

      case "regenerating":
        return (
          <motion.div
            key="regenerating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-background/95 dark:bg-background/95 backdrop-blur-lg"
          >
            <RegeneratingPhase previewDestination={previewDestination} />
          </motion.div>
        );

      case "success":
        return (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-background/95 dark:bg-background/95 backdrop-blur-lg"
          >
            <SuccessPhase previewDestination={previewDestination} />
          </motion.div>
        );

      case "updating":
        return (
          <motion.div
            key="updating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-background/95 dark:bg-background/95 backdrop-blur-lg"
          >
            <UpdatingPhase />
          </motion.div>
        );

      default:
        return null;
    }
  }, [phase, steps, currentStep, previewDestination, previewDescription, totalDays, pauseStatusText]);

  if (!mounted || !phase) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {renderContent()}
    </AnimatePresence>,
    document.body
  );
}
