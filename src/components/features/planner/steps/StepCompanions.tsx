"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface StepCompanionsProps {
  value: string;
  onChange: (value: string) => void;
  onNext?: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

export default function StepCompanions({
  value,
  onChange,
  onNext,
  canComplete,
  onComplete,
}: StepCompanionsProps) {
  const t = useTranslations("components.features.planner.steps.stepCompanions");
  const options = [
    { id: "solo", label: t("options.solo.label"), icon: "👤", desc: t("options.solo.desc") },
    {
      id: "couple",
      label: t("options.couple.label"),
      icon: "💑",
      desc: t("options.couple.desc"),
    },
    { id: "family", label: t("options.family.label"), icon: "👨‍👩‍👧‍👦", desc: t("options.family.desc") },
    { id: "friends", label: t("options.friends.label"), icon: "👯", desc: t("options.friends.desc") },
    { id: "male_trip", label: t("options.male_trip.label"), icon: "🍻", desc: t("options.male_trip.desc") },
    { id: "female_trip", label: t("options.female_trip.label"), icon: "💅", desc: t("options.female_trip.desc") },
    { id: "backpacker", label: t("options.backpacker.label"), icon: "🎒", desc: t("options.backpacker.desc") },
    { id: "business", label: t("options.business.label"), icon: "💼", desc: t("options.business.desc") },
    { id: "pet", label: t("options.pet.label"), icon: "🐕", desc: t("options.pet.desc") },
  ];

  return (
    <div className="flex flex-col space-y-8 pt-4 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          {t("title")}
        </h2>
        <p className="font-hand text-muted-foreground">
          {t("lead")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 px-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all duration-300 group overflow-hidden
              ${
                value === opt.id
                  ? "bg-white border-primary shadow-[4px_4px_0px_0px_var(--color-primary)] translate-x-[-2px] translate-y-[-2px] z-10"
                  : "bg-white border-stone-200 hover:border-primary/50 hover:shadow-md hover:bg-stone-50"
              }
            `}
          >
            <div className="flex flex-col h-full justify-between">
              <span className="text-4xl mb-2 block transform group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                {opt.icon}
              </span>
              <div>
                <span className={`text-lg font-bold block font-serif leading-tight ${value === opt.id ? 'text-primary' : 'text-foreground'}`}>
                  {opt.label}
                </span>
                <span className="text-xs text-stone-500 font-hand mt-1 block">
                  {opt.desc}
                </span>
              </div>
            </div>

            {/* Selection indicator (Stamp mark) */}
            {value === opt.id && (
              <div className="absolute top-2 right-2 text-primary opacity-20 transform rotate-12">
                <span className="text-4xl">●</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Proceed hint when companion is selected */}
      {value && onNext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center space-y-4"
        >
          <button
            onClick={onNext}
            className="text-primary font-medium hover:underline font-hand text-lg"
          >
            {t("next")}
          </button>

          {/* Skip & Create Plan Button */}
          {canComplete && onComplete && (
              <div className="pt-2">
                <button
                  onClick={onComplete}
                  className="text-stone-400 hover:text-stone-600 text-xs sm:text-sm font-medium hover:underline transition-colors"
                >
                  {t("skipAndCreate")}
                </button>
              </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
