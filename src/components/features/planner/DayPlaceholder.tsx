"use client";

import { motion } from "framer-motion";
import { FaRedo, FaExclamationTriangle } from "react-icons/fa";
import type { DayGenerationStatus } from "@/types";

interface DayPlaceholderProps {
  day: number;
  title?: string;
  highlightAreas?: string[];
  status: DayGenerationStatus;
  onRetry?: () => void;
}

export default function DayPlaceholder({
  day,
  title,
  highlightAreas,
  status,
  onRetry,
}: DayPlaceholderProps) {
  // Pending state - Dim placeholder
  if (status === "pending") {
    return (
      <div className="space-y-4 opacity-50">
        {/* Day Header - Pending */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-4 bg-stone-100 py-3 px-6 rounded-r-full border border-stone-200 border-l-4 border-l-stone-300">
            <span className="text-4xl font-serif text-stone-400">{day}</span>
            <div className="flex flex-col">
              <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
                Day
              </span>
              {title && (
                <span className="text-stone-500 font-serif italic text-lg leading-none">
                  {title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Highlight Areas Preview */}
        {highlightAreas && highlightAreas.length > 0 && (
          <div className="ml-8 pl-10 flex flex-wrap gap-2">
            {highlightAreas.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-stone-100 text-stone-400 text-sm rounded-full border border-stone-200"
              >
                {area}
              </span>
            ))}
          </div>
        )}

        {/* Placeholder Content */}
        <div className="border-l-2 border-stone-200 ml-8 space-y-6 pb-4">
          <div className="pl-10 text-stone-400 text-sm italic py-4">
            詳細を待機中...
          </div>
        </div>
      </div>
    );
  }

  // Generating state - Skeleton loading
  if (status === "generating") {
    return (
      <div className="space-y-4">
        {/* Day Header - Generating */}
        <div className="flex items-center gap-4">
          <motion.div
            className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-r-full shadow-md border border-primary/30 border-l-4 border-l-primary"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-4xl font-serif text-primary">{day}</span>
            <div className="flex flex-col">
              <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
                Day
              </span>
              {title && (
                <span className="text-stone-600 font-serif italic text-lg leading-none">
                  {title}
                </span>
              )}
            </div>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            className="flex items-center gap-2 text-primary text-sm font-medium"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <motion.div
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span>生成中...</span>
          </motion.div>
        </div>

        {/* Highlight Areas */}
        {highlightAreas && highlightAreas.length > 0 && (
          <div className="ml-8 pl-10 flex flex-wrap gap-2">
            {highlightAreas.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/20"
              >
                {area}
              </span>
            ))}
          </div>
        )}

        {/* Skeleton Activities */}
        <div className="border-l-2 border-primary/30 ml-8 space-y-6 pb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative pl-10">
              {/* Dot on timeline */}
              <motion.div
                className="absolute left-[-9px] top-6 w-4 h-4 rounded-full bg-white border-4 border-primary/30"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              />

              {/* Skeleton Card */}
              <motion.div
                className="bg-white border border-stone-100 rounded-xl p-6 shadow-sm"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              >
                {/* Skeleton Content */}
                <div className="animate-pulse space-y-3">
                  {/* Time skeleton */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-stone-200 rounded-md" />
                  </div>
                  {/* Title skeleton */}
                  <div className="h-5 w-3/4 bg-stone-200 rounded" />
                  {/* Description skeleton */}
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-stone-100 rounded" />
                    <div className="h-3 w-5/6 bg-stone-100 rounded" />
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="space-y-4">
        {/* Day Header - Error */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-4 bg-red-50 py-3 px-6 rounded-r-full border border-red-200 border-l-4 border-l-red-500">
            <span className="text-4xl font-serif text-red-400">{day}</span>
            <div className="flex flex-col">
              <span className="text-xs text-red-400 uppercase tracking-widest font-bold">
                Day
              </span>
              {title && (
                <span className="text-red-500 font-serif italic text-lg leading-none">
                  {title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="border-l-2 border-red-200 ml-8 pb-4">
          <div className="pl-10 py-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <FaExclamationTriangle className="text-red-500 text-3xl mx-auto mb-3" />
              <p className="text-red-700 font-medium mb-2">
                詳細の生成に失敗しました
              </p>
              <p className="text-red-500 text-sm mb-4">
                もう一度お試しください
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium text-sm"
                >
                  <FaRedo className="text-xs" />
                  再試行
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Should not reach here - completed days are rendered normally
  return null;
}
