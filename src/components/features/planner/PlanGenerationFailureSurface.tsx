"use client";

import { useTranslations } from "next-intl";
import type { GenerationFailureUi } from "@/lib/plan-generation/client-contract";

interface PlanGenerationFailureSurfaceProps {
  variant: GenerationFailureUi;
  message: string;
  canRetry: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

export default function PlanGenerationFailureSurface({
  variant,
  message,
  canRetry,
  onPrimaryAction,
  onSecondaryAction,
}: PlanGenerationFailureSurfaceProps) {
  const t = useTranslations("lib.planGeneration.compose.failureSurface");
  const title =
    variant === "modal" ? t("title.modal") : t("title.banner");
  const description =
    variant === "modal" ? t("description.modal") : t("description.banner");
  const primaryLabel = canRetry ? t("actions.resume") : t("actions.adjust");
  const secondaryLabel = t("actions.backToInput");

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/60 px-4 py-8 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-700 dark:bg-stone-900">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {title}
            </p>
            <p className="text-base text-stone-700 dark:text-stone-200">
              {message}
            </p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {description}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-200">
          {title}
        </p>
        <p className="text-sm text-stone-800 dark:text-stone-100">{message}</p>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          {description}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          onClick={onSecondaryAction}
          className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-white/70 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
