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
  const remainingCount = Math.max(steps.length - completedCount - activeCount, 0);

  const stageCards = STAGE_GROUPS.map((group) => {
    const groupSteps = group.stepIds
      .map((id) => steps.find((step) => step.id === id))
      .filter((step): step is ComposeStep => Boolean(step));

    const isCompleted = groupSteps.length > 0 && groupSteps.every((step) => step.status === "completed");
    const isActive = groupSteps.some((step) => step.id === currentStep || step.status === "active");
    const completedSteps = groupSteps.filter((step) => step.status === "completed").length;

    return {
      id: group.id,
      isCompleted,
      isActive,
      steps: groupSteps,
      completedSteps,
      totalSteps: groupSteps.length,
    };
  });

  const nextSteps = steps.filter((step) => step.status === "pending").slice(0, 3);

  return (
    <div className="flex flex-col items-center px-4 sm:px-0">
      <div
        className={`relative mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(248,250,252,0.97),rgba(255,247,237,0.96))] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(12,18,30,0.98),rgba(28,25,23,0.96),rgba(17,24,39,0.98))] ${className}`}
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
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
            <section className="rounded-[28px] border border-stone-200/70 bg-white/70 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-white/5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                  {t("eyebrow")}
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary dark:border-primary/30 dark:bg-primary/15">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  {t("statusLive")}
                </div>
              </div>

              <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.9fr)] lg:items-start">
                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {previewDestination ? (
                      <motion.div
                        key={previewDestination}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-3"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
                            {previewDestination}
                          </h2>
                          {totalDays > 0 ? (
                            <span className="rounded-full border border-stone-200/80 bg-white/75 px-3 py-1 text-xs font-medium text-stone-600 backdrop-blur dark:border-stone-700/70 dark:bg-white/5 dark:text-stone-300">
                              {t("daysCount", { days: totalDays })}
                            </span>
                          ) : null}
                        </div>
                        <p className="max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-300">
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
                        <p className="text-sm text-stone-500 dark:text-stone-400">{t("noDestinationYet")}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-stone-200/70 bg-white/80 px-4 py-3 dark:border-stone-700/60 dark:bg-black/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                        {t("progressLabel")}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-50">{progressPercent}%</p>
                    </div>
                    <div className="rounded-[22px] border border-stone-200/70 bg-white/80 px-4 py-3 dark:border-stone-700/60 dark:bg-black/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                        {t("currentStepLabel")}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6 text-stone-700 dark:text-stone-200">
                        {activeStep?.message ?? t("waiting")}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-stone-200/70 bg-white/80 px-4 py-3 dark:border-stone-700/60 dark:bg-black/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
                        {t("upcomingLabel")}
                      </p>
                      <p className="mt-2 text-sm font-medium text-stone-700 dark:text-stone-200">
                        {remainingCount > 0 ? t("remainingSteps", { count: remainingCount }) : t("allStepsReady")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-stone-200/70 bg-white/75 p-4 backdrop-blur dark:border-stone-700/60 dark:bg-black/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                      {t("snapshotLabel")}
                    </p>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {t("stepsProgress", { completed: completedCount, total: steps.length })}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200/80 dark:bg-stone-800">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),#f59e0b)]"
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {stageCards.map((stage, index) => (
                      <div key={stage.id} className="flex items-start gap-3">
                        <div className="flex min-w-[28px] flex-col items-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                              stage.isCompleted
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : stage.isActive
                                  ? "bg-primary/15 text-primary dark:bg-primary/20"
                                  : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                          {index < stageCards.length - 1 ? (
                            <span className="mt-2 h-10 w-px bg-stone-200 dark:bg-stone-700" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 rounded-2xl bg-stone-100/70 px-3 py-2 dark:bg-white/5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                              {t(`stages.${stage.id}.title`)}
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400">
                              {stage.completedSteps}/{stage.totalSteps}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
                            {t(`stages.${stage.id}.description`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-[28px] border border-stone-200/70 bg-white/70 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-white/5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                {t("routePlanLabel")}
              </p>
              <div className="mt-4 space-y-3">
                {stageCards.map((stage) => (
                  <div
                    key={stage.id}
                    className={`rounded-[24px] border px-4 py-4 ${
                      stage.isActive
                        ? "border-primary/35 bg-primary/10 dark:border-primary/40 dark:bg-primary/10"
                        : stage.isCompleted
                          ? "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                          : "border-stone-200/70 bg-white/65 dark:border-stone-700/60 dark:bg-black/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {t(`stages.${stage.id}.title`)}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          stage.isCompleted
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : stage.isActive
                              ? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"
                              : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
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
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
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
                {totalDays > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-600 dark:border-stone-700/70 dark:bg-white/5 dark:text-stone-300">
                    <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    {t("dayPill", { days: totalDays })}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] border border-stone-200/70 bg-white/65 p-5 backdrop-blur dark:border-stone-700/60 dark:bg-white/5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
                {t("upcomingLabel")}
              </p>
              <div className="mt-4 space-y-2">
                {nextSteps.length > 0 ? (
                  nextSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-3 py-2.5 dark:border-stone-700/60 dark:bg-black/10"
                    >
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-stone-300 dark:bg-stone-600" />
                      <span className="text-sm text-stone-700 dark:text-stone-200">{step.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-3 py-3 text-sm text-stone-600 dark:border-stone-700/60 dark:bg-black/10 dark:text-stone-300">
                    {t("allStepsReady")}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <ComposeLoadingTips className="mt-6 w-full max-w-3xl" />
    </div>
  );
}
