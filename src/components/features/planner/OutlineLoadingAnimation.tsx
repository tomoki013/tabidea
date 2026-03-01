"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GenerationStep } from "@/lib/hooks/useGenerationProgress";

// Fallback steps for when no real progress is provided
const fallbackSteps = [
  { icon: "\u{1F5FA}\uFE0F", text: "目的地を分析中...", subText: "Analyzing destinations" },
  { icon: "\u{1F4DD}", text: "旅のコンセプトを考え中...", subText: "Crafting your concept" },
  { icon: "\u{1F3AF}", text: "ベストなルートを探索中...", subText: "Finding optimal routes" },
  { icon: "\u2728", text: "もうすぐ完成！", subText: "Almost ready!" },
];

// Icons for each real step
const stepIcons: Record<string, string> = {
  usage_check: "\u{1F511}",
  cache_check: "\u{1F4E6}",
  rag_search: "\u{1F50D}",
  prompt_build: "\u{1F4DD}",
  ai_generation: "\u{1F916}",
  hero_image: "\u{1F4F8}",
};

interface OutlineLoadingAnimationProps {
  className?: string;
  steps?: GenerationStep[];
  currentStep?: string | null;
}

export default function OutlineLoadingAnimation({
  className = "",
  steps,
  currentStep,
}: OutlineLoadingAnimationProps) {
  const hasRealProgress = steps && steps.length > 0;

  if (hasRealProgress) {
    return <RealProgressView className={className} steps={steps} currentStep={currentStep} />;
  }

  return <FallbackAnimation className={className} />;
}

// ============================================================================
// Real Progress View — Clean timeline design
// ============================================================================

function RealProgressView({
  className,
  steps,
  currentStep,
}: {
  className: string;
  steps: GenerationStep[];
  currentStep?: string | null;
}) {
  const activeStep = steps.find((s) => s.id === currentStep) || steps.find((s) => s.status === "active");
  const activeIcon = activeStep ? stepIcons[activeStep.id] || "\u23F3" : "\u2708\uFE0F";
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      className={`w-full max-w-2xl mx-auto mt-8 min-h-[400px] relative rounded-2xl overflow-hidden shadow-lg bg-white border border-stone-200 flex flex-col items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#44403c_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 flex flex-col items-center gap-6 p-8 text-center w-full max-w-md">
        {/* Animated Icon */}
        <motion.div
          className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20"
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
            <p className="text-xl font-bold text-stone-800 leading-tight min-h-8">
              {activeStep?.message || "準備中..."}
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
                      <span className="text-white text-xs font-bold">✓</span>
                    </motion.div>
                  )}
                  {step.status === "active" && (
                    <div className="w-5 h-5 relative">
                      <motion.div
                        className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                  {step.status === "pending" && (
                    <div className="w-3 h-3 rounded-full bg-stone-200" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-4 ${
                    step.status === "completed" ? "bg-green-300" : "bg-stone-200"
                  }`} />
                )}
              </div>

              {/* Step content */}
              <div className="flex items-center gap-2 pb-3 min-h-10">
                <span className="text-base shrink-0">
                  {stepIcons[step.id] || "⏳"}
                </span>
                <span
                  className={`text-sm ${
                    step.status === "completed"
                      ? "text-stone-400 line-through"
                      : step.status === "active"
                        ? "text-stone-800 font-bold"
                        : "text-stone-400"
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
          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-2 font-mono text-center">
            {completedCount}/{steps.length} steps
          </p>
        </div>

        <p className="text-sm text-stone-400 font-hand">
          旅の計画を練っています...
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Fallback Animation
// ============================================================================

function FallbackAnimation({ className }: { className: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev + 1) % fallbackSteps.length);
    }, 3000);
    return () => clearInterval(stepInterval);
  }, []);

  const currentStep = fallbackSteps[step];
  const progressPercent = ((step + 1) / fallbackSteps.length) * 100;

  return (
    <div
      className={`w-full max-w-2xl mx-auto mt-8 min-h-[400px] relative rounded-2xl overflow-hidden shadow-lg bg-white border border-stone-200 flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#44403c_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 flex flex-col items-center gap-8 p-10 text-center max-w-md">
        {/* Animated Icon */}
        <motion.div
          className="w-28 h-28 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl"
            >
              {currentStep.icon}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-2xl font-bold text-stone-800 leading-tight min-h-10">
                {currentStep.text}
              </p>
              <p className="text-xs text-stone-400 font-mono uppercase tracking-widest mt-2">
                {currentStep.subText}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="w-48 mx-auto">
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-stone-400 font-hand">
          旅の計画を練っています...
        </p>
      </div>
    </div>
  );
}
