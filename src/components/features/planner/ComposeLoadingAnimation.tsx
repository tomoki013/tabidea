"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ComposeStep } from "@/lib/hooks/useComposeGeneration";
import ComposeLoadingTips from "./ComposeLoadingTips";

// ============================================
// Component
// ============================================

interface ComposeLoadingAnimationProps {
  className?: string;
  steps: ComposeStep[];
  currentStep: string | null;
}

export default function ComposeLoadingAnimation({
  className = "",
  steps,
  currentStep,
}: ComposeLoadingAnimationProps) {
  const t = useTranslations(
    "components.features.planner.composeLoadingAnimation"
  );

  const activeStep =
    steps.find((s) => s.id === currentStep) ||
    steps.find((s) => s.status === "active");
  const completedCount = steps.filter(
    (s) => s.status === "completed"
  ).length;
  const progressPercent =
    steps.length > 0
      ? Math.round((completedCount / steps.length) * 100)
      : 0;

  return (
    <div className="flex flex-col items-center gap-0 px-4 sm:px-0">
      {/* Tips section - above the loading card */}
      <ComposeLoadingTips className="max-w-2xl w-full mb-6 mt-8" />

      {/* Main loading card */}
      <div
        className={`w-full max-w-2xl mx-auto relative rounded-2xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 shadow-sm ${className}`}
      >
        <div className="flex flex-col items-center gap-5 p-6 sm:p-8 text-center w-full">
          {/* Orbit animation */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-stone-200 dark:border-stone-700"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            {/* Traveling dot */}
            <motion.div
              className="absolute w-2.5 h-2.5 rounded-full bg-primary"
              animate={{
                rotate: 360,
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{ top: -1, left: "calc(50% - 5px)", transformOrigin: "5px 41px" }}
            />
            {/* Inner pulsing circle */}
            <motion.div
              className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                className="w-3 h-3 rounded-full bg-primary/60"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Current step message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={activeStep?.id || "waiting"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-base sm:text-lg font-medium text-stone-700 dark:text-stone-200 leading-snug min-h-7"
            >
              {activeStep?.message || t("waiting")}
            </motion.p>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-full max-w-sm">
            <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 font-mono text-center">
              {t("stepsProgress", {
                completed: completedCount,
                total: steps.length,
              })}
            </p>
          </div>

          {/* Step indicators - minimal dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((step) => (
              <motion.div
                key={step.id}
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  step.status === "completed"
                    ? "bg-primary w-1.5"
                    : step.status === "active"
                      ? "bg-primary/60 w-3"
                      : "bg-stone-200 dark:bg-stone-700 w-1.5"
                }`}
                animate={
                  step.status === "active"
                    ? { opacity: [0.5, 1, 0.5] }
                    : { opacity: 1 }
                }
                transition={
                  step.status === "active"
                    ? { duration: 1.2, repeat: Infinity }
                    : {}
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
