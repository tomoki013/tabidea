"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface StepPaceProps {
  value?: string;
  onChange: (val: string) => void;
  onNext?: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

export default function StepPace({ value, onChange, onNext, canComplete, onComplete }: StepPaceProps) {
  const t = useTranslations("components.features.planner.steps.stepPace");
  const options = [
    {
      id: "relaxed",
      label: t("options.relaxed.label"),
      icon: "☕",
      desc: t("options.relaxed.desc"),
    },
    {
      id: "balanced",
      label: t("options.balanced.label"),
      icon: "⚖️",
      desc: t("options.balanced.desc"),
    },
    {
      id: "active",
      label: t("options.active.label"),
      icon: "👟",
      desc: t("options.active.desc"),
    },
    { id: "packed", label: t("options.packed.label"), icon: "🔥", desc: t("options.packed.desc") },
  ];

  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          {t("title")}
        </h2>
        <p className="text-stone-600 font-hand">
          {t("lead")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto w-full px-4">
        {options.map((opt, i) => {
          const isSelected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onChange(opt.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all duration-300 text-left relative overflow-hidden group
                ${
                  isSelected
                    ? "bg-teal-50 border-teal-500 shadow-md"
                    : "bg-white border-stone-200 hover:bg-stone-50 hover:border-teal-300"
                }
              `}
            >
              <div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-xs shrink-0 z-10 transition-colors
                  ${
                    isSelected
                      ? "bg-teal-500 text-white"
                      : "bg-stone-100 text-stone-600 group-hover:bg-white group-hover:text-teal-500"
                  }
                `}
              >
                {opt.icon}
              </div>
              <div className="flex-1 z-10">
                <h3
                  className={`text-lg font-bold font-serif mb-1 ${
                    isSelected ? "text-teal-700" : "text-stone-800"
                  }`}
                >
                  {opt.label}
                </h3>
                <p className="text-xs text-stone-500 font-medium">{opt.desc}</p>
              </div>

               {isSelected && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Proceed hint when pace is selected */}
      {value && onNext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
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
