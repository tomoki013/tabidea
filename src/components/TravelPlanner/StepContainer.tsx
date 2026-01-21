"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlane, FaListCheck, FaXmark, FaChevronLeft } from "react-icons/fa6";
import { UserInput } from '@/types';
import RequestSummary from "./RequestSummary";

interface StepContainerProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  isNextDisabled?: boolean;
  errorMessage?: string;
  children: ReactNode;
  input: UserInput;
  onJumpToStep?: (step: number) => void;
  widthClass?: string;
  onClose?: () => void;
  canComplete?: boolean;
}

export default function StepContainer({
  step,
  totalSteps,
  onBack,
  onNext,
  onComplete,
  isNextDisabled = false,
  errorMessage,
  children,
  input,
  onJumpToStep,
  widthClass = "max-w-lg",
  onClose,
  canComplete = false,
}: StepContainerProps) {
  const [showSummary, setShowSummary] = useState(false);
  const isLastStep = step === totalSteps - 1;

  // Progress Bar Calculation
  // Safety check for division by zero
  const safeTotal = Math.max(1, totalSteps - 1);
  const progress = (step / safeTotal) * 100;

  return (
    <div className={`w-full ${widthClass} mx-auto h-[90vh] sm:h-[800px] max-h-[90vh] relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-[#fcfbf9] border-8 border-white`}>
      {/* Background Texture */}
      <div
        className="absolute inset-0 z-0 opacity-50 pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url('/images/cream-paper.png')`,
          backgroundSize: 'cover'
        }}
      />

      {/* Header / Progress */}
      <div className="relative z-10 px-6 pt-6 pb-2">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6 h-10">
          {/* Left: Back Button */}
          <button
              onClick={onBack}
              disabled={step <= 0}
              className={`w-10 h-10 flex items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-all hover:bg-stone-100 hover:text-stone-800 active:scale-95 ${
                step <= 0 ? "opacity-0 pointer-events-none" : ""
              }`}
              title="戻る"
            >
              <FaChevronLeft />
          </button>

          {/* Center: Step Indicator */}
          <span className="text-stone-400 font-mono text-xs tracking-widest bg-stone-100/50 px-3 py-1 rounded-full border border-stone-100">
            STEP {step} <span className="text-stone-300">/</span> {safeTotal}
          </span>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
             <button
                onClick={() => setShowSummary(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-all hover:bg-stone-100 hover:text-primary active:scale-95"
                title="選択内容を確認"
              >
                <FaListCheck />
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-stone-500 transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 active:scale-95"
                  title="閉じる"
                >
                  <FaXmark />
                </button>
              )}
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative w-full h-8 flex items-center">
            {/* Track */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-200 rounded-full -translate-y-1/2 overflow-hidden">
                 <motion.div
                    className="h-full bg-primary/50"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            {/* Flying Plane Icon */}
            <motion.div
                className="absolute top-1/2 -translate-y-1/2 text-primary text-xl z-20 drop-shadow-sm"
                initial={{ left: 0 }}
                animate={{ left: `calc(${progress}% - 12px)` }} // Adjust -12px to center the plane on the tip
                transition={{ duration: 0.5 }}
            >
                <FaPlane className="transform -rotate-45" />
            </motion.div>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 px-6 py-4 overflow-y-auto noscrollbar">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
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

      {/* Summary Overlay */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 bg-stone-50/95 backdrop-blur-sm p-6 overflow-y-auto"
          >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-stone-800 font-serif">現在のリクエスト</h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200 text-stone-600 hover:bg-stone-300 transition-colors"
                >
                  <FaXmark />
                </button>
              </div>
              <RequestSummary
                input={input}
                className="mb-0 shadow-none border-stone-200"
                onEdit={(targetStep) => {
                  setShowSummary(false);
                  onJumpToStep?.(targetStep);
                }}
              />
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowSummary(false)}
                  className="px-6 py-2 bg-stone-800 text-white rounded-full text-sm font-bold hover:bg-stone-700 transition-colors"
                >
                  閉じる
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Action Buttons */}
      <div className="relative z-10 p-6 pt-4 bg-linear-to-t from-[#fcfbf9] via-[#fcfbf9]/80 to-transparent">
        {/* Primary action: Next step or Generate (on last step) */}
        <button
          onClick={isLastStep ? onComplete : onNext}
          disabled={isNextDisabled}
          className="w-full py-4 rounded-full font-bold text-lg tracking-wide shadow-lg transition-all transform active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastStep ? "プランを作成する ✨" : "次へ"}
        </button>
        {/* Secondary action: Skip optional steps (shown when all required inputs are complete but not on last step) */}
        {canComplete && !isLastStep && (
          <div className="mt-3 text-center">
            <p className="text-xs text-stone-500 mb-2">
              ※ この先に追加のご希望を入力できる項目があります
            </p>
            <button
              onClick={onComplete}
              className="w-full py-3 rounded-full font-medium text-sm tracking-wide transition-all transform active:scale-95 bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200"
            >
              任意項目をスキップして作成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
