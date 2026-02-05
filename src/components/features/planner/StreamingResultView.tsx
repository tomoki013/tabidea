"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
} from "react-icons/fa";
import type { GenerationState, UserInput, DayPlan, Itinerary } from "@/types";
import DayPlaceholder from "./DayPlaceholder";
import GeneratingOverlay from "./GeneratingOverlay";
import ShareButtons from "@/components/ShareButtons";
import PDFDownloadButton from "./PDFDownloadButton";
import { SpotCard, TransitCard as CardTransitCard, AccommodationCard } from "@/components/features/plan/cards";
import type { CardState } from "@/components/features/plan/cards";

// ============================================================================
// Types
// ============================================================================

interface StreamingResultViewProps {
  generationState: GenerationState;
  input: UserInput;
  onRetryChunk?: (dayStart: number, dayEnd: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export default function StreamingResultView({
  generationState,
  input,
  onRetryChunk,
}: StreamingResultViewProps) {
  const [showOverlay, setShowOverlay] = useState(true);

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

  // Calculate completed count for overlay
  const completedCount = completedDays.length;

  // Get the current generating day
  const currentGeneratingDay = useMemo(() => {
    for (const [day, status] of dayStatuses.entries()) {
      if (status === "generating") {
        return day;
      }
    }
    return undefined;
  }, [dayStatuses]);

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
      {/* Generating Overlay */}
      {isGenerating && showOverlay && (
        <GeneratingOverlay
          totalDays={totalDays}
          completedDays={completedCount}
          currentGeneratingDay={currentGeneratingDay}
          onDismiss={() => setShowOverlay(false)}
          isCompleted={isCompleted}
        />
      )}

      {/* Completion notification */}
      {isCompleted && showOverlay && (
        <GeneratingOverlay
          totalDays={totalDays}
          completedDays={completedCount}
          onDismiss={() => setShowOverlay(false)}
          isCompleted={true}
        />
      )}

      {/* Journal Header Section */}
      <div className="relative mb-8 overflow-x-hidden">
        {heroImage?.url ? (
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-sm overflow-hidden shadow-xl border-8 border-white bg-white rotate-1">
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
            {/* Tape Effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 -rotate-2 shadow-sm backdrop-blur-sm"></div>
          </div>
        ) : (
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-sm overflow-hidden shadow-xl border-8 border-white bg-stone-100 rotate-1 flex items-center justify-center">
            <div className="text-stone-400 text-center">
              <FaMapMarkerAlt className="text-4xl mx-auto mb-2" />
              <p className="text-sm">画像を読み込み中...</p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center relative z-10">
          <div className="inline-block bg-white/80 backdrop-blur-sm px-8 py-6 rounded-sm shadow-sm border border-stone-100 -rotate-1 relative group max-w-full">
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

            {/* Generation Status Indicator */}
            {isGenerating && (
              <motion.div
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <motion.div
                  className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                詳細プランを生成中...
              </motion.div>
            )}
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
