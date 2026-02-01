"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      className={`w-full max-w-4xl mx-auto mt-8 h-[600px] relative rounded-3xl overflow-hidden shadow-2xl bg-[#fcfbf9] border-8 border-white flex items-center justify-center ${className}`}
    >
      {/* Paper Overlay Texture */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />

      {/* Dotted line background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="dotted-pattern"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="currentColor" className="text-stone-600" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotted-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 p-10 text-center max-w-md">
        {/* Animated Travel Icon */}
        <div className="relative">
          {/* Rotating dashed border */}
          <motion.div
            className="absolute inset-0 w-32 h-32 border-4 border-dashed border-primary/30 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Pulsing background ring */}
          <motion.div
            className="absolute inset-2 w-28 h-28 rounded-full bg-primary/5"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.3, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Main Icon Container */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="text-6xl"
              >
                {currentStep.icon}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating travel icons */}
          <motion.span
            className="absolute -top-2 -right-2 text-2xl"
            animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            ✈️
          </motion.span>
          <motion.span
            className="absolute -bottom-2 -left-2 text-2xl"
            animate={{ y: [0, 5, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >
            🧳
          </motion.span>
          <motion.span
            className="absolute top-1/2 -right-4 text-lg"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            📍
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
              <p className="text-2xl font-serif text-foreground leading-tight min-h-16">
                {currentStep.text.replace("...", dots.padEnd(3, " "))}
              </p>
              <p className="text-xs text-stone-400 uppercase tracking-widest mt-2">
                {currentStep.subText}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress Bar */}
          <div className="w-32 h-1.5 bg-primary/10 mx-auto rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
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

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {loadingSteps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index === step ? "bg-primary" : "bg-stone-200"
              }`}
              animate={index === step ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>

        {/* Footer Text */}
        <motion.p
          className="text-sm font-hand text-muted-foreground"
          animate={{ rotate: [-2, 0, -2] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          旅の計画を練っています
        </motion.p>
      </div>
    </div>
  );
}
