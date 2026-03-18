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
      steps: groupSteps,
    };
  });

  return (
    <div className="flex flex-col items-center px-4 sm:px-0">
      <div
        className={`relative mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,245,255,0.96),rgba(255,250,240,0.96))] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(17,24,39,0.96),rgba(28,25,23,0.96),rgba(30,41,59,0.96))] ${className}`}
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

        <div className="relative p-6 sm:p-8 md:p-10">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-stone-200/70 bg-white/65 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-white/5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                  {t("eyebrow")}
                </p>
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.9fr)] xl:items-start">
                  <div className="space-y-3">
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
                          <p className="max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300">
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
                          <div className="h-4 w-64 overflow-hidden rounded-full bg-stone-200/60 dark:bg-stone-800/70">
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

                  <div className="rounded-[24px] border border-stone-200/70 bg-white/70 p-4 backdrop-blur dark:border-stone-700/60 dark:bg-black/10">
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
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <span className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{progressPercent}%</span>
                      <span className="text-xs text-right text-stone-500 dark:text-stone-400">
                        {t("stepsProgress", { completed: completedCount, total: steps.length })}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-stone-200/70 bg-white/65 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-white/5 sm:p-6">
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
                        className="mt-2 text-xl font-semibold text-stone-900 dark:text-stone-50 sm:text-2xl"
                      >
                        {activeStep?.message ?? t("waiting")}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary dark:border-primary/30 dark:bg-primary/15">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    {t("statusLive")}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
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
                    <div className="mt-4 space-y-2">
                      {stage.steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300">
                          <span
                            className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${
                              step.status === "completed"
                                ? "bg-emerald-500"
                                : step.status === "active"
                                  ? "bg-primary"
                                  : "bg-stone-300 dark:bg-stone-600"
                            }`}
                          />
                          <span className="leading-5">{step.message}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[28px] border border-stone-200/70 bg-white/65 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-white/5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                  {t("stepListLabel")}
                </p>
                <div className="mt-4 grid gap-2">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`grid grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-2xl border px-3 py-2.5 ${
                        step.status === "completed"
                          ? "border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                          : step.status === "active"
                            ? "border-primary/25 bg-primary/10 dark:border-primary/30 dark:bg-primary/10"
                            : "border-stone-200/70 bg-white/70 dark:border-stone-700/60 dark:bg-black/10"
                      }`}
                    >
                      <span
                        className={`mt-1 inline-flex h-3.5 w-3.5 rounded-full ${
                          step.status === "completed"
                            ? "bg-emerald-500"
                            : step.status === "active"
                              ? "bg-primary"
                              : "bg-stone-300 dark:bg-stone-600"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{step.message}</p>
                        <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                          {step.status === "completed"
                            ? t("stageDone")
                            : step.status === "active"
                              ? t("stageActive")
                              : t("stagePending")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      <ComposeLoadingTips className="mt-6 w-full max-w-3xl" />
    </div>
  );
}
