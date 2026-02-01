"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface DayPlaceholderProps {
  /** Day number */
  day: number;
  /** Day title (from outline) */
  title?: string;
  /** Highlight areas (from outline) */
  highlightAreas?: string[];
  /** Whether currently generating (vs pending) */
  isGenerating?: boolean;
  /** Error message if failed */
  error?: string;
  /** Callback to retry on error */
  onRetry?: () => void;
}

// ============================================================================
// Skeleton Card Component
// ============================================================================

function SkeletonCard() {
  return (
    <div className="rounded-xl border-2 border-stone-200 bg-white p-3 animate-pulse">
      <div className="flex items-center gap-3">
        {/* Icon skeleton */}
        <div className="w-10 h-10 rounded-lg bg-stone-200 shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 rounded w-3/4" />
          <div className="h-3 bg-stone-100 rounded w-1/2" />
        </div>

        {/* Time skeleton */}
        <div className="w-12 h-6 rounded-lg bg-stone-100 shrink-0" />
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function DayPlaceholder({
  day,
  title,
  highlightAreas,
  isGenerating = false,
  error,
  onRetry,
}: DayPlaceholderProps) {
  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl border-2 border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <span className="text-2xl">❌</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-800 text-lg mb-1">
              Day {day} の生成に失敗しました
            </h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                再試行
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-50 rounded-2xl border-2 border-stone-200 p-6"
    >
      {/* Day Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center shrink-0
            ${isGenerating ? "bg-primary/10" : "bg-stone-200"}
          `}
        >
          {isGenerating ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <span className="text-xl font-bold text-stone-400">{day}</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-stone-800 text-lg">
            {title || `Day ${day}`}
          </h3>
          {highlightAreas && highlightAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {highlightAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white border border-stone-200 text-stone-600 px-2 py-1 rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-center gap-2 mb-6 py-3 bg-white rounded-lg border border-stone-200">
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-primary font-medium">
              詳細を生成中...
            </span>
          </>
        ) : (
          <span className="text-sm text-stone-400">生成待機中</span>
        )}
      </div>

      {/* Skeleton Activities */}
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        {isGenerating && <SkeletonCard />}
      </div>
    </motion.div>
  );
}
