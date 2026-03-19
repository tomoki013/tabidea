"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plane } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComposeStep } from "@/lib/hooks/useComposeGeneration";
import ComposeLoadingTips from "./ComposeLoadingTips";

const STAGE_GROUPS = [
  {
    id: "concept",
    stepIds: ["usage_check", "normalize"] as const,
  },
  {
    id: "spots",
    stepIds: ["semantic_plan", "place_resolve", "feasibility_score", "route_optimize", "timeline_build"] as const,
  },
  {
    id: "polish",
    stepIds: ["narrative_render", "hero_image"] as const,
  },
] as const;

interface ComposeLoadingAnimationProps {
  className?: string;
  steps: ComposeStep[];
  currentStep: string | null;
  previewDestination?: string;
  previewDescription?: string;
  totalDays?: number;
}

export default function ComposeLoadingAnimation({
  className = "",
  steps,
  currentStep,
  previewDestination = "",
  previewDescription = "",
  totalDays = 0,
}: ComposeLoadingAnimationProps) {
  const t = useTranslations("components.features.planner.composeLoadingAnimation");

  const completedCount = steps.filter((step) => step.status === "completed").length;
  const activeCount = steps.filter((step) => step.status === "active").length;
  const progressPercent =
    steps.length > 0 ? Math.round(((completedCount + activeCount * 0.5) / steps.length) * 100) : 0;
  const activeStep = steps.find((step) => step.status === "active");

  const stageCards = STAGE_GROUPS.map((group) => {
    const groupSteps = group.stepIds
      .map((id) => steps.find((step) => step.id === id))
      .filter((step): step is ComposeStep => Boolean(step));

    const isCompleted = groupSteps.length > 0 && groupSteps.every((step) => step.status === "completed");
    const isActive = groupSteps.some((step) => step.id === currentStep || step.status === "active");

    return {
      id: group.id,
      isCompleted,
      isActive,
    };
  });

  return (
    <div className="flex flex-col items-center px-4 sm:px-0">
      <div
        className={`relative mx-auto mt-8 w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(248,250,252,0.97),rgba(255,247,237,0.96))] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(12,18,30,0.98),rgba(28,25,23,0.96),rgba(17,24,39,0.98))] ${className}`}
      >
        {/* Floating blob background */}
        <div className="absolute inset-0 opacity-70 dark:opacity-50">
          <motion.div
            className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl dark:bg-primary/20"
            animate={{ x: [0, 24, 0], y: [0, 18, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-0 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-400/10"
            animate={{ x: [0, -18, 0], y: [0, -22, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative flex flex-col items-center p-6 sm:p-8 md:p-10">
          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
            {t("eyebrow")}
          </p>

          {/* Destination preview */}
          <div className="mt-5 w-full text-center">
            <AnimatePresence mode="wait">
              {previewDestination ? (
                <motion.div
                  key={previewDestination}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
                      {previewDestination}
                    </h2>
                    {totalDays > 0 ? (
                      <span className="rounded-full border border-stone-200/80 bg-white/75 px-3 py-1 text-xs font-medium text-stone-600 backdrop-blur dark:border-stone-700/70 dark:bg-white/5 dark:text-stone-300">
                        {t("daysCount", { days: totalDays })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mx-auto max-w-md text-sm leading-7 text-stone-600 dark:text-stone-300">
                    {previewDescription || t("leadReady")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="relative mx-auto h-12 w-56 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-200 via-sky-100 to-sky-200 dark:from-sky-900/50 dark:via-sky-800/30 dark:to-sky-900/50">
                    {/* Clouds drifting right to left */}
                    <motion.div
                      className="absolute top-2 h-3 w-8 rounded-full bg-white/60 dark:bg-white/15"
                      animate={{ x: ["110%", "-120%"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      style={{ left: "50%" }}
                    />
                    <motion.div
                      className="absolute top-6 h-2.5 w-6 rounded-full bg-white/50 dark:bg-white/10"
                      animate={{ x: ["120%", "-130%"] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1.5 }}
                      style={{ left: "30%" }}
                    />
                    {/* Airplane flying left to right */}
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2"
                      animate={{
                        x: ["-2rem", "16rem"],
                        y: [0, -3, 0, 2, 0],
                      }}
                      transition={{
                        x: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                        y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                      }}
                    >
                      <Plane className="h-5 w-5 -rotate-12 text-sky-500 dark:text-sky-400" />
                    </motion.div>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{t("noDestinationYet")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-full">
            <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold uppercase tracking-[0.22em]">{t("progressLabel")}</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-800">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),#f59e0b)]"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Stage indicators (compact horizontal) */}
          <div className="mt-6 flex w-full items-center justify-center gap-2 sm:gap-3">
            {stageCards.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 ${
                    stage.isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : stage.isActive
                        ? "bg-primary/15 text-primary dark:bg-primary/20"
                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      stage.isCompleted
                        ? "bg-emerald-500 text-white"
                        : stage.isActive
                          ? "bg-primary text-white"
                          : "bg-stone-300 text-white dark:bg-stone-600"
                    }`}
                  >
                    {stage.isCompleted ? "\u2713" : index + 1}
                  </span>
                  <span className="hidden sm:inline">{t(`stages.${stage.id}.title`)}</span>
                </div>
                {index < stageCards.length - 1 ? (
                  <span className="h-px w-4 bg-stone-300 dark:bg-stone-600 sm:w-6" />
                ) : null}
              </div>
            ))}
          </div>

          {/* Current step label */}
          <div className="mt-6 min-h-[2rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeStep?.message ?? "waiting"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-center text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                {activeStep?.message ?? t("waiting")}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ComposeLoadingTips className="mt-6 w-full max-w-3xl" />
    </div>
  );
}
