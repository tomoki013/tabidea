"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMapMarkerAlt,
  FaClock,
  FaCalendarAlt,
  FaPlane,
  FaTrain,
  FaBus,
  FaShip,
  FaCar,
  FaQuestion,
  FaLock,
} from "react-icons/fa";
import type { GenerationState, UserInput, DayPlan, Itinerary } from "@/types";
import DayPlaceholder from "./DayPlaceholder";
import GeneratingOverlay from "./GeneratingOverlay";
import TransitCard from "./TransitCard";
import ShareButtons from "@/components/ShareButtons";
import PDFDownloadButton from "./PDFDownloadButton";

interface StreamingResultViewProps {
  generationState: GenerationState;
  input: UserInput;
  onRetryChunk?: (dayStart: number, dayEnd: number) => void;
}

export default function StreamingResultView({
  generationState,
  input,
  onRetryChunk,
}: StreamingResultViewProps) {
  const [showOverlay, setShowOverlay] = useState(true);

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
        // Retry a single day chunk
        onRetryChunk(day, day);
      }
    },
    [onRetryChunk]
  );

  if (!outline) {
    return null;
  }

  // Transit icons mapping
  const transitIcons = {
    flight: FaPlane,
    train: FaTrain,
    bus: FaBus,
    ship: FaShip,
    car: FaCar,
    other: FaQuestion,
  };

  const transitColors = {
    flight: "bg-blue-500",
    train: "bg-green-600",
    bus: "bg-orange-500",
    ship: "bg-cyan-600",
    car: "bg-slate-600",
    other: "bg-stone-500",
  };

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

            // If day is completed, render actual content
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

                    {/* Activities */}
                    <div className={`
                      ${completedDay.ui_type === 'compact' ? 'border-l border-stone-200 ml-4 space-y-4 pb-4' :
                        completedDay.ui_type === 'narrative' ? 'ml-0 space-y-8 pb-8' :
                        'border-l-2 border-stone-200 ml-8 space-y-8 pb-8'}
                      relative transition-all
                    `}>
                      {/* Generative UI Label */}
                      {completedDay.ui_type && completedDay.ui_type !== 'default' && (
                        <div className="absolute right-0 -top-12 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary/10 to-transparent rounded-full text-xs font-mono text-primary/70 pointer-events-none">
                          <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"></span>
                          {completedDay.ui_type === 'compact' ? 'Compact View' : 'Narrative View'}
                        </div>
                      )}

                      {/* Transit Card */}
                      {completedDay.transit && (() => {
                        const TransitIcon =
                          transitIcons[completedDay.transit.type] || FaQuestion;
                        const iconColor =
                          transitColors[completedDay.transit.type] || "bg-stone-500";

                        return (
                          <div className={`relative ${completedDay.ui_type === 'compact' ? 'pl-6' : completedDay.ui_type === 'narrative' ? 'pl-0 max-w-2xl mx-auto' : 'pl-4 sm:pl-10'} mb-8`}>
                            {/* Enhanced Transit Icon on timeline - Hide in Narrative */}
                            {completedDay.ui_type !== 'narrative' && (
                              <div className={`absolute ${completedDay.ui_type === 'compact' ? 'left-[-9px]' : 'left-[-13px]'} top-1/2 -translate-y-1/2 ${completedDay.ui_type === 'compact' ? 'w-4 h-4 text-[10px]' : 'w-6 h-6 text-xs'} rounded-full ${iconColor} border-2 border-white shadow-lg z-20 flex items-center justify-center`}>
                                <TransitIcon className="text-white text-xs" />
                              </div>
                            )}
                            <TransitCard transit={completedDay.transit} isEditing={false} />
                          </div>
                        );
                      })()}

                      {completedDay.activities.map((act, actIndex) => (
                        <div key={actIndex}
                          className={`
                            relative group
                            ${completedDay.ui_type === 'compact' ? 'pl-6' :
                              completedDay.ui_type === 'narrative' ? 'pl-0 max-w-2xl mx-auto' :
                              'pl-10'}
                          `}
                        >
                          {/* Dot on timeline */}
                          {completedDay.ui_type !== 'narrative' && (
                            <div className={`absolute ${completedDay.ui_type === 'compact' ? 'left-[-5px] top-4 w-2.5 h-2.5' : 'left-[-9px] top-6 w-4 h-4'} rounded-full bg-white border-4 border-primary shadow-sm z-10`}></div>
                          )}

                          {/* Activity Card */}
                          <div
                            className={`
                              bg-white rounded-xl shadow-sm transition-all duration-300 relative overflow-hidden
                              ${completedDay.ui_type === 'compact' ? "border border-stone-100 p-3 hover:bg-stone-50 flex items-center gap-4" :
                                completedDay.ui_type === 'narrative' ? "border-none shadow-none bg-transparent p-0 hover:bg-transparent" :
                                "border border-stone-100 p-6 hover:bg-stone-50 hover:shadow-md group-hover:-translate-y-1"}
                            `}
                          >
                            {/* Decorative stripe - Only Default */}
                            {completedDay.ui_type !== 'narrative' && completedDay.ui_type !== 'compact' && (
                              <div className="absolute top-0 left-0 w-1 h-full bg-stone-200 group-hover:bg-primary transition-colors"></div>
                            )}

                            {/* View Content Switch */}
                            {completedDay.ui_type === 'narrative' ? (
                              <div className="relative border-l-4 border-primary/20 pl-6 py-1">
                                <div className="flex items-baseline gap-3 mb-2">
                                  <span className="text-primary font-serif font-bold text-lg">{act.time}</span>
                                  <h4 className="text-2xl font-serif font-bold text-stone-800">
                                    {act.activity}
                                  </h4>
                                </div>
                                <p className="text-stone-600 leading-relaxed text-lg font-serif">
                                  {act.description}
                                </p>
                                {act.isLocked && (
                                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                    <FaLock size={10} />
                                    <span>固定</span>
                                  </div>
                                )}
                              </div>
                            ) : completedDay.ui_type === 'compact' ? (
                              <>
                                <div className="flex-shrink-0 w-16 text-stone-500 text-xs font-mono font-bold text-right">
                                  {act.time}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-stone-800 truncate">
                                      {act.activity}
                                    </h4>
                                    {act.isLocked && (
                                      <FaLock size={10} className="text-amber-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-stone-500 text-xs truncate">
                                    {act.description}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="text-stone-500 text-sm font-mono bg-stone-100 px-2 py-1 rounded-md flex items-center gap-2">
                                    <FaClock className="text-primary/70" />
                                    {act.time}
                                  </div>
                                  {act.isLocked && (
                                    <div className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                      <FaLock size={10} />
                                      <span>固定</span>
                                    </div>
                                  )}
                                </div>

                                <h4 className="text-xl font-bold text-stone-800 mb-2 font-serif">
                                  {act.activity}
                                </h4>
                                <p className="text-stone-600 leading-relaxed text-sm">
                                  {act.description}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
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
