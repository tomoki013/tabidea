"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stamp } from "@/components/ui/journal";
import type { GenerationStep } from "@/lib/hooks/useGenerationProgress";

// Fallback steps for when no real progress is provided
const fallbackSteps = [
  { icon: "🗺️", text: "目的地を分析中...", subText: "Analyzing destinations" },
  { icon: "📝", text: "旅のコンセプトを考え中...", subText: "Crafting your concept" },
  { icon: "🎯", text: "ベストなルートを探索中...", subText: "Finding optimal routes" },
  { icon: "✨", text: "もうすぐ完成！", subText: "Almost ready!" },
];

// Icons for each real step
const stepIcons: Record<string, string> = {
  usage_check: "🔑",
  cache_check: "📦",
  rag_search: "🔍",
  prompt_build: "📝",
  ai_generation: "🤖",
  hero_image: "📸",
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
  // Use real progress if steps are provided
  const hasRealProgress = steps && steps.length > 0;

  if (hasRealProgress) {
    return <RealProgressView className={className} steps={steps} currentStep={currentStep} />;
  }

  return <FallbackAnimation className={className} />;
}

// ============================================================================
// Real Progress View
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
  const activeIcon = activeStep ? stepIcons[activeStep.id] || "⏳" : "✈️";
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      className={`w-full max-w-4xl mx-auto mt-8 min-h-[600px] relative rounded-sm overflow-hidden shadow-2xl bg-[#fcfbf9] border border-stone-200 flex flex-col items-center justify-center ${className}`}
    >
      {/* Paper Overlay Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />

      {/* Dotted line background pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#44403c_1px,transparent_1px)] bg-[size:20px_20px]" />

      <div className="relative z-10 flex flex-col items-center gap-8 p-8 text-center w-full max-w-md">
        {/* Animated Stamp */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 w-32 h-32 border-4 border-dashed border-primary/30 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          <Stamp color="red" size="lg" className="w-32 h-32 border-4 animate-pulse">
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
          </Stamp>

          {/* Floating icons */}
          <motion.span
            className="absolute -top-3 -right-3 text-2xl transform rotate-12"
            animate={{ y: [0, -8, 0], rotate: [12, 24, 12] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            ✈️
          </motion.span>
          <motion.span
            className="absolute -bottom-3 -left-3 text-2xl transform -rotate-12"
            animate={{ y: [0, 8, 0], rotate: [-12, -24, -12] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >
            🧳
          </motion.span>
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
            <p className="text-xl font-hand font-bold text-stone-800 leading-tight min-h-12">
              {activeStep?.message || "準備中..."}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step Progress List */}
        <div className="w-full space-y-2 text-left">
          {steps.map((step) => (
            <motion.div
              key={step.id}
              className="flex items-center gap-3 text-sm"
              initial={{ opacity: 0.5 }}
              animate={{
                opacity: step.status === "pending" ? 0.4 : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {step.status === "completed" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-600 text-sm font-bold"
                  >
                    ✓
                  </motion.span>
                )}
                {step.status === "active" && (
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                )}
                {step.status === "pending" && (
                  <div className="w-3 h-3 rounded-full border-2 border-stone-300" />
                )}
              </div>

              {/* Step icon + message */}
              <span className="text-base">
                {stepIcons[step.id] || "⏳"}
              </span>
              <span
                className={`font-hand ${
                  step.status === "completed"
                    ? "text-stone-500 line-through"
                    : step.status === "active"
                      ? "text-stone-800 font-bold"
                      : "text-stone-400"
                }`}
              >
                {step.message}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="w-full h-2 border-2 border-stone-300 rounded-full overflow-hidden bg-white transform -rotate-0.5">
            <motion.div
              className="h-full bg-primary/70 rounded-full"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1 font-mono">
            {completedCount}/{steps.length} steps
          </p>
        </div>

        {/* Footer */}
        <motion.p
          className="text-sm font-hand text-stone-500"
          animate={{ rotate: [-1, 1, -1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          旅の計画を練っています...
        </motion.p>
      </div>
    </div>
  );
}

// ============================================================================
// Fallback Animation (original)
// ============================================================================

function FallbackAnimation({ className }: { className: string }) {
  const [step, setStep] = useState(0);
  const [showDots, setShowDots] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev + 1) % fallbackSteps.length);
    }, 3000);

    const dotInterval = setInterval(() => {
      setShowDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => {
      clearInterval(stepInterval);
      clearInterval(dotInterval);
    };
  }, []);

  const currentStep = fallbackSteps[step];
  const dots = ".".repeat(showDots);

  return (
    <div
      className={`w-full max-w-4xl mx-auto mt-8 h-[600px] relative rounded-sm overflow-hidden shadow-2xl bg-[#fcfbf9] border border-stone-200 flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#44403c_1px,transparent_1px)] bg-[size:20px_20px]" />

      <div className="relative z-10 flex flex-col items-center gap-10 p-10 text-center max-w-md">
        <div className="relative">
          <motion.div
            className="absolute inset-0 w-40 h-40 border-4 border-dashed border-primary/30 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          <Stamp color="red" size="lg" className="w-40 h-40 border-4 animate-pulse">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-6xl"
              >
                {currentStep.icon}
              </motion.div>
            </AnimatePresence>
          </Stamp>

          <motion.span
            className="absolute -top-4 -right-4 text-3xl transform rotate-12"
            animate={{ y: [0, -10, 0], rotate: [12, 24, 12] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            ✈️
          </motion.span>
          <motion.span
            className="absolute -bottom-4 -left-4 text-3xl transform -rotate-12"
            animate={{ y: [0, 10, 0], rotate: [-12, -24, -12] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >
            🧳
          </motion.span>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-2xl font-hand font-bold text-stone-800 leading-tight min-h-16">
                {currentStep.text.replace("...", dots.padEnd(3, " "))}
              </p>
              <p className="text-xs text-stone-400 font-mono uppercase tracking-widest mt-2">
                {currentStep.subText}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="w-48 h-2 border-2 border-stone-300 rounded-full overflow-hidden bg-white mx-auto transform -rotate-1">
            <motion.div
              className="h-full bg-primary/70 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        <motion.p
          className="text-sm font-hand text-stone-500"
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          旅の計画を練っています...
        </motion.p>
      </div>
    </div>
  );
}
