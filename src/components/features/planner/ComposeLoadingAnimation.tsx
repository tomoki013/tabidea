"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ComposeStep } from "@/lib/hooks/useComposeGeneration";
import ComposeLoadingTips from "./ComposeLoadingTips";

// ============================================
// Step icons
// ============================================

const stepIcons: Record<string, string> = {
  usage_check: "\u{1F511}",
  normalize: "\u{1F4CB}",
  semantic_plan: "\u{1F5FA}\uFE0F",
  place_resolve: "\u{1F4CD}",
  feasibility_score: "\u2705",
  route_optimize: "\u{1F6B6}",
  timeline_build: "\u23F0",
  narrative_render: "\u270D\uFE0F",
  hero_image: "\u{1F4F8}",
};

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

  const activeStep = steps.find((s) => s.id === currentStep) || steps.find((s) => s.status === "active");
  const activeIcon = activeStep ? stepIcons[activeStep.id] || "\u23F3" : "\u2708\uFE0F";
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercent = steps.length > 0
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center gap-0">
      <div
        className={`w-full max-w-2xl mx-auto mt-8 min-h-[420px] relative rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center ${className}`}
      >
        {/* Dot pattern background */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] bg-[radial-gradient(#44403c_1px,transparent_1px)] dark:bg-[radial-gradient(#a8a29e_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex flex-col items-center gap-6 p-8 text-center w-full max-w-md">
          {/* Animated Icon */}
          <motion.div
            className="w-24 h-24 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center border-2 border-primary/20 dark:border-primary/30"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep?.id || "default"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-4xl"
              >
                {activeIcon}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Current Step Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep?.id || "waiting"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xl font-bold text-stone-800 dark:text-stone-200 leading-tight min-h-8">
                {activeStep?.message || t("waiting")}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Timeline Step List */}
          <div className="w-full space-y-0 text-left">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-stretch gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  <div className="flex items-center justify-center w-6 h-6 shrink-0">
                    {step.status === "completed" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <span className="text-white text-xs font-bold">
                          ✓
                        </span>
                      </motion.div>
                    )}
                    {step.status === "active" && (
                      <div className="w-5 h-5 relative">
                        <motion.div
                          className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </div>
                    )}
                    {step.status === "pending" && (
                      <div className="w-3 h-3 rounded-full bg-stone-200 dark:bg-stone-600" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 min-h-4 ${
                        step.status === "completed"
                          ? "bg-green-300 dark:bg-green-600"
                          : "bg-stone-200 dark:bg-stone-600"
                      }`}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex items-center gap-2 pb-3 min-h-10">
                  <span className="text-base shrink-0">
                    {stepIcons[step.id] || "\u23F3"}
                  </span>
                  <span
                    className={`text-sm ${
                      step.status === "completed"
                        ? "text-stone-400 dark:text-stone-500 line-through"
                        : step.status === "active"
                          ? "text-stone-800 dark:text-stone-200 font-bold"
                          : "text-stone-400 dark:text-stone-500"
                    }`}
                  >
                    {step.message}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="w-full h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
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

          <p className="text-sm text-stone-400 dark:text-stone-500 font-hand">
            {t("footer")}
          </p>
        </div>
      </div>

      {/* Loading Tips below the main animation */}
      <ComposeLoadingTips />
    </div>
  );
}
