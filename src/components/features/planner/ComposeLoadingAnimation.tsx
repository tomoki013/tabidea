"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  totalDays?: number;
}

export default function ComposeLoadingAnimation({
  className = "",
  steps,
  currentStep,
  previewDestination = "",
  totalDays = 0,
}: ComposeLoadingAnimationProps) {
  const t = useTranslations("components.features.planner.composeLoadingAnimation");

  const completedCount = steps.filter((step) => step.status === "completed").length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
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
    <div className="flex flex-col items-center gap-0 px-4 sm:px-0">
      <ComposeLoadingTips className="mb-6 mt-8 w-full max-w-3xl" />

      <div
        className={`relative mx-auto w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.96),rgba(255,250,240,0.96))] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(17,24,39,0.96),rgba(28,25,23,0.96),rgba(30,41,59,0.96))] ${className}`}
      >
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

        <div className="relative flex flex-col gap-8 p-6 sm:p-8 md:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                {t("eyebrow")}
              </p>
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
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
                        {previewDestination}
                      </h2>
                      {totalDays > 0 ? (
                        <span className="rounded-full border border-stone-200/80 bg-white/70 px-3 py-1 text-xs font-medium text-stone-600 backdrop-blur dark:border-stone-700/70 dark:bg-white/5 dark:text-stone-300">
                          {t("daysCount", { days: totalDays })}
                        </span>
                      ) : null}
                    </div>
                    <p className="max-w-xl text-sm leading-7 text-stone-600 dark:text-stone-300">
                      {t("leadReady")}
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
                    <div className="h-10 w-44 overflow-hidden rounded-2xl bg-stone-200/70 dark:bg-stone-800/80">
                      <motion.div
                        className="h-full w-1/2 rounded-2xl bg-white/70 dark:bg-white/10"
                        animate={{ x: ["-100%", "220%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="h-4 w-60 overflow-hidden rounded-full bg-stone-200/60 dark:bg-stone-800/70">
                      <motion.div
                        className="h-full w-1/3 rounded-full bg-white/70 dark:bg-white/10"
                        animate={{ x: ["-100%", "250%"] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="min-w-[180px] rounded-[24px] border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                {t("progressLabel")}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-800">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),#f59e0b)]"
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{progressPercent}%</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {t("stepsProgress", { completed: completedCount, total: steps.length })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {stageCards.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`rounded-[24px] border p-4 backdrop-blur ${
                  stage.isActive
                    ? "border-primary/35 bg-primary/10 dark:border-primary/40 dark:bg-primary/10"
                    : stage.isCompleted
                      ? "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                      : "border-stone-200/70 bg-white/60 dark:border-stone-700/60 dark:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    {t(`stages.${stage.id}.title`)}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    stage.isCompleted
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : stage.isActive
                        ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"
                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                  }`}>
                    {stage.isCompleted
                      ? t("stageDone")
                      : stage.isActive
                        ? t("stageActive")
                        : t("stagePending")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                  {t(`stages.${stage.id}.description`)}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-[28px] border border-stone-200/70 bg-white/60 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-black/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                  {t("currentStepLabel")}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeStep?.message ?? "waiting"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-2 text-lg font-medium text-stone-900 dark:text-stone-50"
                  >
                    {activeStep?.message ?? t("waiting")}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                {t("statusLive")}
              </div>
            </div>

            <div className="relative mt-6 overflow-hidden rounded-full bg-stone-200/70 p-1 dark:bg-stone-800/80">
              <div className="flex items-center justify-between gap-2">
                {steps.slice(0, 8).map((step) => (
                  <div key={step.id} className="relative flex flex-1 items-center justify-center">
                    <motion.div
                      className={`h-3 w-3 rounded-full ${
                        step.status === "completed"
                          ? "bg-emerald-500"
                          : step.status === "active"
                            ? "bg-primary"
                            : "bg-white/80 dark:bg-stone-700"
                      }`}
                      animate={step.status === "active" ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 1.2, repeat: step.status === "active" ? Infinity : 0, ease: "easeInOut" }}
                    />
                    {step.id !== steps[Math.min(7, steps.length - 1)]?.id ? (
                      <div className="absolute left-1/2 top-1/2 h-[2px] w-full -translate-y-1/2 bg-stone-300/80 dark:bg-stone-700" />
                    ) : null}
                  </div>
                ))}
              </div>
              <motion.div
                className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)] dark:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]"
                animate={{ x: ["-30%", "120%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
