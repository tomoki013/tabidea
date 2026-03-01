"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
} from "react-icons/fa";
import type { GenerationState, UserInput, DayPlan, Itinerary } from "@/types";
import type { ReplanTrigger } from "@/types/replan";
import DayPlaceholder from "./DayPlaceholder";
import ShareButtons from "@/components/ShareButtons";
import PDFDownloadButton from "./PDFDownloadButton";
import { SpotCard, TransitCard as CardTransitCard, AccommodationCard } from "@/components/features/plan/cards";
import type { CardState } from "@/components/features/plan/cards";
import { ReplanTriggerPanel } from "@/components/features/replan";

// ============================================================================
// Types
// ============================================================================

interface StreamingResultViewProps {
  generationState: GenerationState;
  input: UserInput;
  onRetryChunk?: (dayStart: number, dayEnd: number) => void;
  /** リプラントリガーを表示するか（旅行中モード） */
  showReplanTriggers?: boolean;
  /** リプラントリガー発火コールバック */
  onReplanTrigger?: (trigger: ReplanTrigger) => void;
  /** リプラン処理中か */
  isReplanning?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function StreamingResultView({
  generationState,
  input,
  onRetryChunk,
  showReplanTriggers = false,
  onReplanTrigger,
  isReplanning = false,
}: StreamingResultViewProps) {
  // Card expansion state: track which cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const { outline, heroImage, dayStatuses, completedDays, totalDays, phase } =
    generationState;

  const isCompleted = phase === "completed";
  const isGenerating = phase === "generating_details" || phase === "outline_ready";

  // Build a map of day number to completed day plan for quick lookup
  const completedDayMap = useMemo(() => {
    const map = new Map<number, DayPlan>();
    completedDays.forEach((day) => {
      map.set(day.day, day);
    });
    return map;
  }, [completedDays]);

  // Calculate completed count
  const completedCount = completedDays.length;

  // Helper to parse date string
  const formatTravelDates = (dateStr: string) => {
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})から(\d+)日間/);
    if (match) {
      const startDate = new Date(match[1]);
      const duration = parseInt(match[2], 10);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + duration - 1);

      const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    // If no specific date but has duration
    const durationMatch = dateStr.match(/(\d+)日間/);
    if (durationMatch) {
      return `${durationMatch[1]} Days Trip`;
    }
    return dateStr;
  };

  const travelDates = formatTravelDates(input.dates);

  // Calculate duration string
  const numberOfNights = Math.max(0, totalDays - 1);
  const durationString = `${numberOfNights}泊${totalDays}日`;

  // Construct a partial itinerary for sharing/PDF (when complete)
  const partialItinerary: Itinerary | null = useMemo(() => {
    if (!outline) return null;

    const sortedDays = [...completedDays].sort((a, b) => a.day - b.day);

    return {
      id: "",
      destination: outline.destination,
      description: outline.description,
      heroImage: heroImage?.url,
      heroImagePhotographer: heroImage?.photographer,
      heroImagePhotographerUrl: heroImage?.photographerUrl,
      days: sortedDays,
      references: [],
    };
  }, [outline, completedDays, heroImage]);

  const handleRetry = useCallback(
    (day: number) => {
      if (onRetryChunk) {
        onRetryChunk(day, day);
      }
    },
    [onRetryChunk]
  );

  // Handle card state change
  const handleCardStateChange = useCallback((cardId: string, state: CardState) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (state === "expanded") {
        next.add(cardId);
      } else {
        next.delete(cardId);
      }
      return next;
    });
  }, []);

  const getCardState = useCallback(
    (cardId: string): CardState => {
      return expandedCards.has(cardId) ? "expanded" : "collapsed";
    },
    [expandedCards]
  );

  if (!outline) {
    return null;
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 text-left animate-in fade-in duration-700 pb-20 relative overflow-x-clip">
      {/* Journal Header Section */}
      <div className="relative mb-8 overflow-x-hidden">
        {heroImage?.url ? (
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-xl overflow-hidden shadow-xl border-4 border-white bg-white">
            <Image
              src={heroImage.url}
              alt={outline.destination}
              fill
              className="object-cover"
              priority
            />
            {/* Unsplash Credit */}
            {heroImage.photographer && heroImage.photographerUrl && (
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                Photo by{" "}
                <a
                  href={heroImage.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-stone-300 transition-colors"
                >
                  {heroImage.photographer}
                </a>{" "}
                on{" "}
                <a
                  href="https://unsplash.com/?utm_source=Tabidea&utm_medium=referral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-stone-300 transition-colors"
                >
                  Unsplash
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-xl overflow-hidden shadow-xl border-4 border-white bg-stone-100 flex items-center justify-center">
            <div className="text-stone-400 text-center">
              <FaMapMarkerAlt className="text-4xl mx-auto mb-2" />
              <p className="text-sm">画像を読み込み中...</p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center relative z-10">
          <div className="inline-block bg-white/80 backdrop-blur-sm px-8 py-6 rounded-xl shadow-sm border border-stone-100 relative group max-w-full">
            {/* Date Stamp */}
            <div className="absolute -top-6 -right-4 sm:-right-8 bg-white border-2 border-primary/30 text-stone-600 font-mono text-xs font-bold px-3 py-1.5 shadow-sm rotate-12 rounded-sm z-20">
              <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <FaCalendarAlt className="text-primary" />
                  {travelDates}
                </div>
                <span className="text-[10px] text-stone-400 font-sans tracking-widest">
                  {durationString}
                </span>
              </div>
            </div>

            <p className="text-sm font-hand text-stone-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              <FaMapMarkerAlt className="text-primary" />
              Your Destination
            </p>
            <h1 className="text-4xl sm:text-6xl font-serif text-stone-800 mb-4 tracking-tight">
              {outline.destination}
            </h1>
            <p className="text-lg text-stone-600 font-light leading-relaxed max-w-xl mx-auto font-sans">
              {outline.description}
            </p>

          </div>
        </div>

        {/* Share/PDF Buttons - Only active when complete */}
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-8 mt-6">
          {isCompleted && partialItinerary ? (
            <>
              <ShareButtons input={input} result={partialItinerary} />
              <PDFDownloadButton itinerary={partialItinerary} />
            </>
          ) : (
            <div className="flex items-center gap-3 text-stone-400 text-sm">
              <span>シェア・PDF出力は生成完了後に利用可能です</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Generation Progress */}
      {(isGenerating || isCompleted) && totalDays > 0 && (
        <div className="w-full max-w-4xl mx-auto mb-6 px-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-stone-700">
                {isCompleted ? "生成完了" : "詳細プランを生成中..."}
              </span>
              <span className="text-sm text-stone-500 font-mono">
                {completedCount}/{totalDays} 日
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${totalDays > 0 ? (completedCount / totalDays) * 100 : 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {/* Day Pills */}
            <div className="flex flex-wrap gap-2">
              {outline.days.map((outlineDay) => {
                const status = dayStatuses.get(outlineDay.day) || "pending";
                return (
                  <div
                    key={outlineDay.day}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${status === "completed" ? "bg-primary/15 text-primary border border-primary/30" : ""}
                      ${status === "generating" ? "bg-primary/10 text-primary border border-primary/20 animate-pulse" : ""}
                      ${status === "pending" ? "bg-stone-100 text-stone-400 border border-stone-200" : ""}
                      ${status === "error" ? "bg-red-50 text-red-500 border border-red-200" : ""}
                    `}
                  >
                    Day {outlineDay.day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Disclaimer Notice */}
      <div className="w-full max-w-4xl mx-auto mt-0 mb-8 px-4">
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-2 text-lg">
                AI生成プランに関する重要なお知らせ
              </h3>
              <div className="text-amber-800 text-sm leading-relaxed space-y-2">
                <p>
                  このプランはAIによって自動生成されています。施設の営業時間、料金、住所などの情報は必ず公式サイトで最新情報をご確認ください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="max-w-4xl mx-auto space-y-16 overflow-x-clip">
        <div className="space-y-16" data-itinerary-section>
          {outline.days.map((outlineDay) => {
            const dayStatus = dayStatuses.get(outlineDay.day) || "pending";
            const completedDay = completedDayMap.get(outlineDay.day);

            // If day is completed, render actual content with card components
            if (dayStatus === "completed" && completedDay) {
              return (
                <AnimatePresence key={outlineDay.day} mode="wait">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    {/* Day Header */}
                    <div className="sticky top-24 md:top-28 z-30 mb-8 flex items-center gap-4 pointer-events-none">
                      <div className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-r-full shadow-md border border-stone-200 border-l-4 border-l-primary pointer-events-auto">
                        <span className="text-4xl font-serif text-primary">
                          {completedDay.day}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
                            Day
                          </span>
                          <span className="text-stone-600 font-serif italic text-lg leading-none">
                            {completedDay.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Day Content with Cards */}
                    <div className="space-y-4 ml-4 sm:ml-8">
                      {/* Transit Card (if exists) */}
                      {completedDay.transit && (
                        <CardTransitCard
                          transit={completedDay.transit}
                          state={getCardState(`transit-${completedDay.day}`)}
                          onStateChange={(state) =>
                            handleCardStateChange(`transit-${completedDay.day}`, state)
                          }
                          className="mb-6"
                        />
                      )}

                      {/* Activity Cards */}
                      {completedDay.activities.map((activity, actIndex) => (
                        <SpotCard
                          key={`activity-${completedDay.day}-${actIndex}`}
                          activity={activity}
                          destination={outline.destination}
                          state={getCardState(
                            `activity-${completedDay.day}-${actIndex}`
                          )}
                          onStateChange={(state) =>
                            handleCardStateChange(
                              `activity-${completedDay.day}-${actIndex}`,
                              state
                            )
                          }
                        />
                      ))}

                      {/* Replan Trigger Panel (PR-K: 旅中モード) */}
                      {showReplanTriggers && onReplanTrigger && (
                        <div className="pt-4 animate-in fade-in duration-300">
                          <ReplanTriggerPanel
                            slotId={`day-${completedDay.day}-current`}
                            onTrigger={onReplanTrigger}
                            disabled={isReplanning}
                          />
                        </div>
                      )}

                      {/* Accommodation Card (for overnight stay - show on all days except last) */}
                      {completedDay.day < totalDays && outlineDay.overnight_location && (
                        <AccommodationCard
                          accommodation={{
                            name: outlineDay.overnight_location,
                            description: `${completedDay.day}日目の宿泊エリア`,
                          }}
                          dayNumber={completedDay.day}
                          state={getCardState(`accommodation-${completedDay.day}`)}
                          onStateChange={(state) =>
                            handleCardStateChange(
                              `accommodation-${completedDay.day}`,
                              state
                            )
                          }
                          className="mt-6"
                        />
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            }

            // Otherwise, render placeholder
            return (
              <DayPlaceholder
                key={outlineDay.day}
                day={outlineDay.day}
                title={outlineDay.title}
                highlightAreas={outlineDay.highlight_areas}
                status={dayStatus}
                onRetry={() => handleRetry(outlineDay.day)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
