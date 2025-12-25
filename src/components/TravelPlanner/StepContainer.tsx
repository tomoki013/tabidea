"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface StepContainerProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  isNextDisabled?: boolean;
  errorMessage?: string;
  children: ReactNode;
}

// Background images for each step
const stepImages = [
  "/images/eiffel-tower-and-sunset.jpg", // Destination
  "/images/kiyomizu-temple-autumn-leaves-lightup.jpg", // Dates
  "/images/balloons-in-cappadocia.jpg", // Companions
  "/images/tajmahal.jpg", // Themes
  "/images/eiffel-tower-and-sunset.jpg", // FreeText
];

export default function StepContainer({
  step,
  totalSteps,
  onBack,
  onNext,
  onComplete,
  isNextDisabled = false,
  errorMessage,
  children,
}: StepContainerProps) {
  const isLastStep = step === totalSteps - 1;

  // Progress Bar Calculation
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="w-full max-w-lg mx-auto h-[90vh] sm:h-[800px] relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-black">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={stepImages[step % stepImages.length]}
              alt="Background"
              fill
              className="object-cover opacity-60"
              priority
            />
            <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black/80" />

            {/* Particles or overlay effects can go here */}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Header / Progress */}
      <div className="relative z-10 px-6 pt-8 pb-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onBack}
            disabled={step === 0}
            className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white transition-all ${
              step === 0 ? "opacity-0 cursor-default" : "hover:bg-white/20"
            }`}
          >
            ←
          </button>
          <span className="text-white/80 font-mono text-xs tracking-widest">
            STEP {step + 1}/{totalSteps}
          </span>
          <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-teal-400 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 px-6 py-4 overflow-y-auto noscrollbar">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
            {errorMessage}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer / Action Button */}
      <div className="relative z-10 p-6 pt-4 bg-linear-to-t from-black via-black/80 to-transparent">
        <button
          onClick={isLastStep ? onComplete : onNext}
          disabled={isNextDisabled}
          className={`w-full py-4 rounded-full font-bold text-lg tracking-wide shadow-lg transition-all transform active:scale-95 bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLastStep ? "プランを作成する ✨" : "次へ"}
        </button>
      </div>
    </div>
  );
}
