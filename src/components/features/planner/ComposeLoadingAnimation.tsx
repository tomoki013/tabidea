"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FaCompass, FaRoute } from "react-icons/fa";
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
    <div className="flex flex-col items-center gap-0 px-2 sm:px-0">
      <div
        className={`w-full max-w-3xl mx-auto mt-8 min-h-[470px] relative rounded-[2rem] overflow-hidden shadow-2xl bg-white dark:bg-stone-900 border border-primary/15 dark:border-primary/30 flex flex-col items-center justify-center ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,0.18),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(249,115,22,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.98)_100%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.22),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(251,146,60,0.2),transparent_45%),linear-gradient(180deg,rgba(12,10,9,0.95)_0%,rgba(24,24,27,0.98)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#44403c_1px,transparent_1px)] dark:opacity-[0.1] dark:bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] bg-[size:26px_26px]" />

        <motion.div
          className="absolute top-10 right-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/75 text-primary shadow-lg dark:bg-stone-800/70"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          <FaCompass />
        </motion.div>

        <div className="relative z-10 flex flex-col items-center gap-6 p-6 sm:p-8 text-center w-full max-w-2xl">
          {/* Animated Icon */}
          <motion.div
            className="w-28 h-28 rounded-[1.75rem] bg-white/80 dark:bg-stone-800/80 flex items-center justify-center border border-primary/25 dark:border-primary/40 shadow-xl"
            animate={{ y: [0, -6, 0], scale: [1, 1.03, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep?.id || "default"}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-5xl"
              >
                {activeIcon}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/75 px-4 py-1.5 text-xs tracking-[0.2em] uppercase text-stone-500 shadow-sm dark:border-primary/40 dark:bg-stone-800/70 dark:text-stone-300">
            <FaRoute className="text-primary" />
            {t("liveBadge")}
          </div>

          {/* Current Step Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep?.id || "waiting"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-100 leading-tight min-h-8">
                {activeStep?.message || t("waiting")}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Timeline Step List */}
          <div className="w-full space-y-0 text-left rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-stone-700 dark:bg-stone-900/70">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-stretch gap-3">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  <div className="flex items-center justify-center w-6 h-6 shrink-0">
                    {step.status === "completed" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
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
                          ? "bg-emerald-300 dark:bg-emerald-600"
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
                    className={`text-sm leading-6 ${
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
            <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-primary to-orange-400"
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

          <ComposeLoadingTips embedded />
        </div>
      </div>
    </div>
  );
}
