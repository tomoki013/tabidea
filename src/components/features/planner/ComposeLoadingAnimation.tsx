"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ComposeStep } from "@/lib/hooks/useComposeGeneration";
import ComposeLoadingTips from "./ComposeLoadingTips";

// ============================================
// Constants
// ============================================

// Steps visible on the route line (exclude hero_image which is silent)
const ROUTE_STEP_IDS = [
  "usage_check",
  "normalize",
  "semantic_plan",
  "place_resolve",
  "route_optimize",
  "narrative_render",
] as const;

// ============================================
// Component
// ============================================

interface ComposeLoadingAnimationProps {
  className?: string;
  steps: ComposeStep[];
  currentStep: string | null;
  previewDestination?: string;
  totalDays?: number;
}

export default function ComposeLoadingAnimation({
  className = "",
  steps,
  currentStep,
  previewDestination = "",
  totalDays = 0,
}: ComposeLoadingAnimationProps) {
  const t = useTranslations(
    "components.features.planner.composeLoadingAnimation"
  );

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercent =
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const activeStep = steps.find((s) => s.status === "active");
  const isPhase2 =
    currentStep === "narrative_render" || currentStep === "hero_image";

  const phaseLabel = isPhase2
    ? t("phase2Label")
    : activeStep
      ? t("phase1Label")
      : t("waiting");

  // Checkpoint status for route visualization
  const routeCheckpoints = ROUTE_STEP_IDS.map((id) => {
    const step = steps.find((s) => s.id === id);
    return { id, status: step?.status ?? "pending" };
  });

  const checkpointsDone = routeCheckpoints.filter((c) => c.status === "completed").length;
  const routeProgress = routeCheckpoints.length > 0
    ? checkpointsDone / routeCheckpoints.length
    : 0;

  return (
    <div className="flex flex-col items-center gap-0 px-4 sm:px-0">
      {/* Tips section */}
      <ComposeLoadingTips className="max-w-2xl w-full mb-6 mt-8" />

      {/* Main card */}
      <div
        className={`w-full max-w-2xl mx-auto relative rounded-2xl overflow-hidden
          bg-white dark:bg-stone-900
          border border-stone-200/80 dark:border-stone-700/60
          shadow-sm ${className}`}
      >
        <div className="flex flex-col items-center gap-6 p-7 sm:p-9 w-full">

          {/* Destination reveal */}
          <div className="text-center min-h-[3.5rem] flex flex-col items-center justify-center gap-1">
            <AnimatePresence mode="wait">
              {previewDestination ? (
                <motion.div
                  key={previewDestination}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
                    {previewDestination}
                  </span>
                  {totalDays > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className="text-sm text-stone-400 dark:text-stone-500 font-medium tracking-wide"
                    >
                      {t("daysCount", { days: totalDays })}
                    </motion.span>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-2"
                >
                  {/* Skeleton shimmer for destination */}
                  <div className="h-7 w-32 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <motion.div
                      className="h-full w-1/2 bg-stone-200/70 dark:bg-stone-700/70 rounded-lg"
                      animate={{ x: ["−100%", "200%"] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Route line with checkpoints */}
          <div className="w-full max-w-sm relative">
            {/* Background track */}
            <div className="relative h-0.5 bg-stone-100 dark:bg-stone-800 rounded-full mx-4">
              {/* Animated fill */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                animate={{ width: `${routeProgress * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>

            {/* Checkpoints along the route */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-2">
              {/* Start dot */}
              <motion.div
                className="w-3 h-3 rounded-full border-2 border-primary bg-white dark:bg-stone-900 z-10 shrink-0"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Intermediate checkpoints */}
              {routeCheckpoints.slice(1, -1).map((cp, i) => (
                <CheckpointDot key={cp.id} status={cp.status} delay={i * 0.05} />
              ))}

              {/* End flag */}
              <div className="w-3 h-3 rounded-full border-2 z-10 shrink-0 flex items-center justify-center
                border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900">
                <motion.div
                  className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600"
                  animate={routeProgress >= 0.95 ? { scale: [1, 1.4, 1], backgroundColor: "var(--color-primary)" } : {}}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          {/* Phase label + step message */}
          <div className="text-center flex flex-col items-center gap-1.5">
            <motion.p
              key={phaseLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-semibold uppercase tracking-widest text-primary/70 dark:text-primary/60"
            >
              {phaseLabel}
            </motion.p>
            <AnimatePresence mode="wait">
              <motion.p
                key={activeStep?.id ?? "waiting"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22 }}
                className="text-sm text-stone-500 dark:text-stone-400 leading-snug min-h-5"
              >
                {activeStep?.message ?? ""}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="w-full h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-600 mt-1.5 text-center tabular-nums">
              {t("stepsProgress", { completed: completedCount, total: steps.length })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Checkpoint Dot
// ============================================

interface CheckpointDotProps {
  status: "pending" | "active" | "completed";
  delay?: number;
}

function CheckpointDot({ status, delay = 0 }: CheckpointDotProps) {
  return (
    <motion.div
      className="relative z-10 shrink-0"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      {status === "completed" ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-2.5 h-2.5 rounded-full bg-primary flex items-center justify-center"
        >
          {/* Checkmark tick */}
          <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
            <path d="M1 2.5L2.5 4L5 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      ) : status === "active" ? (
        <motion.div
          className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-white dark:bg-stone-900"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <div className="w-2.5 h-2.5 rounded-full border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900" />
      )}
    </motion.div>
  );
}
