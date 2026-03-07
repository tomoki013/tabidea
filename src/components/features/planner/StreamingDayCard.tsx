"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FaPencilAlt } from "react-icons/fa";
import type { PartialDayData } from "@/types";
import type { PlanOutlineDay } from "@/types";
import DayPlaceholder from "./DayPlaceholder";

// ============================================================================
// Types
// ============================================================================

interface StreamingDayCardProps {
  partial: PartialDayData;
  dayNum: number;
  outline: PlanOutlineDay;
}

// ============================================================================
// Helpers
// ============================================================================

// PlanOutlineDay に pace 情報がないため固定の目安値を使用
const ESTIMATED_ACTIVITY_COUNT = 5;

const TRANSIT_ICONS: Record<string, string> = {
  flight: '✈️',
  train: '🚄',
  bus: '🚌',
  ship: '⛴️',
  car: '🚗',
  other: '🚐',
};

// ============================================================================
// Writing Indicator
// ============================================================================

function WritingIndicator() {
  return (
    <div className="relative pl-10 flex items-center gap-2 text-primary/60 text-sm mt-2">
      <motion.div
        className="absolute left-[-9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-primary/30"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <FaPencilAlt className="text-xs flex-shrink-0" />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/50 inline-block"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function StreamingDayCard({ partial, dayNum, outline }: StreamingDayCardProps) {
  const t = useTranslations("components.features.planner.streamingDayCard");

  // タイトルが未到着の場合は既存の generating placeholder を使用
  if (!partial.title) {
    return (
      <DayPlaceholder
        day={dayNum}
        title={outline.title}
        highlightAreas={outline.highlight_areas}
        status="generating"
      />
    );
  }

  const estimatedTotal = ESTIMATED_ACTIVITY_COUNT;
  const activityCount = partial.activities?.length ?? 0;
  const progress = Math.min(100, (activityCount / estimatedTotal) * 100);

  const transitIcon = partial.transit?.type ? (TRANSIT_ICONS[partial.transit.type] ?? '🚐') : null;

  return (
    <div className="space-y-4">
      {/* Day Header */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
        <div className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-r-full shadow-md border border-primary/30 border-l-4 border-l-primary">
          <span className="text-4xl font-serif text-primary">{dayNum}</span>
          <div className="flex flex-col">
            <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
              {t("dayLabel")}
            </span>
            <span className="text-stone-600 font-serif italic text-lg leading-none">
              {partial.title}
            </span>
          </div>
        </div>

        {/* 生成中インジケーター */}
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
          <span>{t("composing")}</span>
        </motion.div>
      </motion.div>

      {/* 進捗バー */}
      <div className="ml-8 pl-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-stone-400">
            {t("activitiesProgress", { current: activityCount, estimated: estimatedTotal })}
          </span>
        </div>
        <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* 交通手段 */}
      <AnimatePresence>
        {partial.transit && (
          <motion.div
            key="transit"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="ml-8 pl-2"
          >
            <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-sky-800">
              <span className="text-base">{transitIcon}</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {partial.transit.departure?.place} → {partial.transit.arrival?.place}
                </span>
                {partial.transit.duration && (
                  <span className="text-xs text-sky-600">{partial.transit.duration}</span>
                )}
              </div>
              {partial.transit.type && (
                <span className="ml-auto text-xs text-sky-500 font-medium uppercase tracking-wide">
                  {t("transitArrived")}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* アクティビティ一覧 */}
      <div className="border-l-2 border-primary/30 ml-8 space-y-4 pb-4">
        <AnimatePresence>
          {partial.activities?.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="relative pl-10"
            >
              {/* Timeline dot */}
              <div className="absolute left-[-9px] top-5 w-4 h-4 rounded-full bg-white border-2 border-primary/40" />

              {/* Activity Card */}
              <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  {activity.time && (
                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {activity.time}
                    </span>
                  )}
                </div>
                {activity.activity && (
                  <p className="font-medium text-stone-800 text-sm leading-snug">
                    {activity.activity}
                  </p>
                )}
                {activity.description && (
                  <p className="text-stone-500 text-xs mt-1 leading-relaxed line-clamp-2">
                    {activity.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 書き込み中インジケーター */}
        <WritingIndicator />
      </div>
    </div>
  );
}
