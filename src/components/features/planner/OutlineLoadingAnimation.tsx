"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stamp } from "@/components/ui/journal";

const loadingSteps = [
  { icon: "🗺️", text: "目的地を分析中...", subText: "Analyzing destinations" },
  { icon: "📝", text: "旅のコンセプトを考え中...", subText: "Crafting your concept" },
  { icon: "🎯", text: "ベストなルートを探索中...", subText: "Finding optimal routes" },
  { icon: "✨", text: "もうすぐ完成！", subText: "Almost ready!" },
];

interface OutlineLoadingAnimationProps {
  className?: string;
}

export default function OutlineLoadingAnimation({
  className = "",
}: OutlineLoadingAnimationProps) {
  const [step, setStep] = useState(0);
  const [showDots, setShowDots] = useState(0);

  useEffect(() => {
    // Rotate through steps
    const stepInterval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingSteps.length);
    }, 3000);

    // Animate dots
    const dotInterval = setInterval(() => {
      setShowDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => {
      clearInterval(stepInterval);
      clearInterval(dotInterval);
    };
  }, []);

  const currentStep = loadingSteps[step];
  const dots = ".".repeat(showDots);

  return (
    <div
      className={`w-full max-w-4xl mx-auto mt-8 h-[600px] relative rounded-sm overflow-hidden shadow-2xl bg-[#fcfbf9] border border-stone-200 flex items-center justify-center ${className}`}
    >
      {/* Paper Overlay Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />

      {/* Dotted line background pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#44403c_1px,transparent_1px)] bg-[size:20px_20px]" />

      <div className="relative z-10 flex flex-col items-center gap-10 p-10 text-center max-w-md">

        {/* Animated Stamp Container */}
        <div className="relative">
          {/* Rotating dashed border */}
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

          {/* Floating travel icons */}
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

        {/* Text Content */}
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

          {/* Progress Bar (Hand-drawn style) */}
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

        {/* Footer Text */}
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
