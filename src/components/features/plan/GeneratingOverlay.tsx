"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import ModelBadge from "@/components/ui/ModelBadge";

// ============================================================================
// Types
// ============================================================================

export type DayGenerationStatus = "pending" | "generating" | "completed" | "error";

export interface DayGenerationState {
  day: number;
  status: DayGenerationStatus;
  error?: string;
}

export interface GeneratingOverlayProps {
  /** Total number of days being generated */
  totalDays: number;
  /** Current status of each day */
  dayStates: DayGenerationState[];
  /** Whether generation is complete */
  isComplete: boolean;
  /** Whether overlay is visible */
  isVisible: boolean;
  /** Callback to hide overlay (minimze, not cancel) */
  onHide: () => void;
  /** Callback to retry a failed day */
  onRetry?: (day: number) => void;
  /** AI model name being used */
  modelName?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function GeneratingOverlay({
  totalDays,
  dayStates,
  isComplete,
  isVisible,
  onHide,
  onRetry,
  modelName,
}: GeneratingOverlayProps) {
  // Calculate progress
  const completedCount = dayStates.filter((d) => d.status === "completed").length;
  const generatingDay = dayStates.find((d) => d.status === "generating")?.day;
  const progressPercent = (completedCount / totalDays) * 100;

  // Current status message
  const getStatusMessage = () => {
    if (isComplete) {
      return "プラン完成！";
    }
    if (generatingDay) {
      return `Day ${generatingDay}/${totalDays} の詳細を生成中...`;
    }
    const pendingCount = dayStates.filter((d) => d.status === "pending").length;
    if (pendingCount === totalDays) {
      return "生成を準備中...";
    }
    return "詳細を生成中...";
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-md"
        >
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Status */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Icon */}
                {isComplete ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-lg">✅</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                )}

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-stone-800 truncate">
                    {getStatusMessage()}
                  </div>
                  {!isComplete && (
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span>スクロールしてプランを確認できます</span>
                      {modelName && <ModelBadge modelName={modelName} />}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-stone-500 font-medium">
                  {completedCount}/{totalDays}
                </span>
              </div>

              {/* Hide Button */}
              <button
                onClick={onHide}
                className="p-2 rounded-full hover:bg-stone-100 transition-colors shrink-0"
                aria-label="閉じる"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>

            {/* Day Status Indicators (Mobile) */}
            <div className="flex items-center gap-1 mt-2 sm:hidden">
              {dayStates.map((dayState) => (
                <div
                  key={dayState.day}
                  className={`
                    flex-1 h-1.5 rounded-full transition-colors
                    ${dayState.status === "completed" ? "bg-green-500" : ""}
                    ${dayState.status === "generating" ? "bg-primary animate-pulse" : ""}
                    ${dayState.status === "pending" ? "bg-stone-200" : ""}
                    ${dayState.status === "error" ? "bg-red-500" : ""}
                  `}
                />
              ))}
            </div>

            {/* Error State with Retry */}
            {dayStates.some((d) => d.status === "error") && onRetry && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-red-600">一部の日程で生成に失敗しました</span>
                {dayStates
                  .filter((d) => d.status === "error")
                  .map((d) => (
                    <button
                      key={d.day}
                      onClick={() => onRetry(d.day)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Day {d.day} を再試行
                    </button>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
