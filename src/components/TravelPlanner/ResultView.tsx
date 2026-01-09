"use client";

import { Itinerary, UserInput } from "@/lib/types";
import Image from "next/image";
import TravelPlannerChat from "../TravelPlannerChat";
import ShareButtons from "../ShareButtons";
import RequestSummary from "./RequestSummary";
import {
  FaMapMarkerAlt,
  FaClock,
  FaCalendarAlt,
  FaPen,
  FaTrash,
  FaPlus,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { useState } from "react";

interface ResultViewProps {
  result: Itinerary;
  input: UserInput;
  onRestart: () => void;
  onRegenerate: (
    history: { role: string; text: string }[],
    overridePlan?: Itinerary
  ) => void;
  onResultChange?: (result: Itinerary) => void;
  isUpdating?: boolean;
  onEditRequest?: (stepIndex: number) => void;
}

export default function ResultView({
  result,
  input,
  onRegenerate,
  onResultChange,
  isUpdating = false,
  onEditRequest,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage || "/images/eiffel-tower-and-sunset.jpg";

  const [isEditing, setIsEditing] = useState(false);
  const [editingResult, setEditingResult] = useState<Itinerary | null>(null);

  const startEditing = () => {
    setEditingResult(JSON.parse(JSON.stringify(result))); // Deep clone
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingResult(null);
  };

  const saveChanges = () => {
    if (!editingResult) return;

    // Update parent state if callback is provided
    if (onResultChange) {
      onResultChange(editingResult);
    }

    setIsEditing(false);
  };

  const handleActivityChange = (
    dayIndex: number,
    actIndex: number,
    field: "time" | "activity" | "description",
    value: string
  ) => {
    if (!editingResult) return;
    const newResult = { ...editingResult };
    newResult.days[dayIndex].activities[actIndex] = {
      ...newResult.days[dayIndex].activities[actIndex],
      [field]: value,
    };
    setEditingResult(newResult);
  };

  const handleDeleteActivity = (dayIndex: number, actIndex: number) => {
    if (!editingResult) return;
    const newResult = { ...editingResult };
    newResult.days[dayIndex].activities.splice(actIndex, 1);
    setEditingResult(newResult);
  };

  const handleAddActivity = (dayIndex: number) => {
    if (!editingResult) return;
    const newResult = { ...editingResult };
    newResult.days[dayIndex].activities.push({
      time: "12:00",
      activity: "新しいアクティビティ",
      description: "詳細を入力してください",
    });
    setEditingResult(newResult);
  };

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

  // Calculate duration string (e.g. 2泊3日)
  const numberOfDays = result.days.length;
  const numberOfNights = Math.max(0, numberOfDays - 1);
  const durationString = `${numberOfNights}泊${numberOfDays}日`;

  const displayResult = isEditing && editingResult ? editingResult : result;

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 text-left animate-in fade-in duration-700 pb-20 relative overflow-x-hidden">
      {/* Updating Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-full shadow-xl border-4 border-primary/20 animate-bounce">
            <span className="text-4xl">✏️</span>
          </div>
          <h2 className="mt-6 text-3xl font-hand font-bold text-stone-800 tracking-wide animate-pulse">
            プランを書き直しています...
          </h2>
          <p className="mt-2 text-stone-500 font-sans text-sm">
            Updating your travel plan
          </p>
        </div>
      )}

      {/* Fixed Action Bar (Edit / Save / Cancel) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 w-full max-w-sm px-4 pointer-events-none">
        <div className="pointer-events-auto flex justify-center">
            {isEditing ? (
                <div className="flex items-center gap-3 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-stone-200/50">
                    <button
                        onClick={cancelEditing}
                        className="flex items-center gap-2 bg-white text-stone-600 px-6 py-3 rounded-full shadow-sm border border-stone-200 hover:bg-stone-50 font-bold transition-all"
                    >
                        <FaTimes /> キャンセル
                    </button>
                    <button
                        onClick={saveChanges}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full shadow-md hover:bg-primary/90 font-bold transition-all"
                    >
                        <FaSave /> 保存
                    </button>
                </div>
            ) : (
                <button
                    onClick={startEditing}
                    className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full shadow-xl hover:bg-primary/90 hover:-translate-y-1 font-bold transition-all border-4 border-white/20"
                >
                    <FaPen /> プラン内容を編集
                </button>
            )}
        </div>
      </div>

      {/* Journal Header Section */}
      <div className="relative mb-16 overflow-x-hidden">
        <div className="relative aspect-video sm:aspect-21/9 w-full rounded-sm overflow-hidden shadow-xl border-8 border-white bg-white rotate-1">
          <Image
            src={heroImg}
            alt={result.destination}
            fill
            className="object-cover"
            priority
          />
          {/* Tape Effect */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 -rotate-2 shadow-sm backdrop-blur-sm"></div>
        </div>

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
              {/* Stamp inner border */}
              <div className="absolute inset-0.5 border border-primary/10 pointer-events-none"></div>
            </div>

            <p className="text-sm font-hand text-stone-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              <FaMapMarkerAlt className="text-primary" />
              Your Destination
            </p>
            <h1 className="text-4xl sm:text-6xl font-serif text-stone-800 mb-4 tracking-tight">
              {result.destination}
            </h1>
            <p className="text-lg text-stone-600 font-light leading-relaxed max-w-xl mx-auto font-sans">
              {result.description}
            </p>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex justify-center mt-6">
          <ShareButtons input={input} result={result} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12 overflow-x-hidden">
        {/* Timeline */}
        <div className="space-y-16">


          {displayResult.days.map((day, dayIndex) => (
            <div key={day.day} className="relative">
              {/* Day Header - Sticky at top when scrolled */}
              <div className="sticky top-0 z-30 mb-8 bg-[#fcfbf9] -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-4">
                <div className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-r-full shadow-md border border-stone-200 border-l-4 border-l-primary">
                  <span className="text-4xl font-serif text-primary">
                    {day.day}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
                      Day
                    </span>
                    <span className="text-stone-600 font-serif italic text-lg leading-none">
                      {day.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activities */}
              <div className="border-l-2 border-stone-200 ml-8 space-y-8 pb-8 relative">
                {day.activities.map((act, actIndex) => (
                  <div key={actIndex} className="relative pl-10 group">
                    {/* Dot on timeline */}
                    <div className="absolute left-[-9px] top-6 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm z-10"></div>

                    {/* Activity Card */}
                    <div
                      className={`bg-white border rounded-xl p-6 shadow-sm transition-all duration-300 relative overflow-hidden ${
                        isEditing
                          ? "border-primary/30 ring-2 ring-primary/5"
                          : "hover:bg-stone-50 border-stone-100 hover:shadow-md group-hover:-translate-y-1"
                      }`}
                    >
                      {/* Decorative background stripe */}
                      {!isEditing && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-stone-200 group-hover:bg-primary transition-colors"></div>
                      )}

                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <FaClock className="text-stone-400" />
                                <input
                                  value={act.time}
                                  onChange={(e) =>
                                    handleActivityChange(
                                      dayIndex,
                                      actIndex,
                                      "time",
                                      e.target.value
                                    )
                                  }
                                  className="bg-stone-50 border border-stone-200 rounded px-2 py-1 text-sm font-mono w-24 focus:outline-hidden focus:border-primary"
                                  placeholder="Time"
                                />
                              </div>
                              <input
                                value={act.activity}
                                onChange={(e) =>
                                  handleActivityChange(
                                    dayIndex,
                                    actIndex,
                                    "activity",
                                    e.target.value
                                  )
                                }
                                className="w-full font-bold text-stone-800 border-b border-stone-200 focus:border-primary focus:outline-hidden py-1"
                                placeholder="Activity Name"
                              />
                            </div>
                            <button
                              onClick={() =>
                                handleDeleteActivity(dayIndex, actIndex)
                              }
                              className="text-stone-400 hover:text-red-500 p-2"
                              title="削除"
                            >
                              <FaTrash />
                            </button>
                          </div>
                          <textarea
                            value={act.description}
                            onChange={(e) =>
                              handleActivityChange(
                                dayIndex,
                                actIndex,
                                "description",
                                e.target.value
                              )
                            }
                            className="w-full text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded p-2 focus:outline-hidden focus:border-primary h-24"
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2 text-stone-500 text-sm font-mono bg-stone-100 inline-block px-2 py-1 rounded-md">
                            <FaClock className="text-primary/70" />
                            {act.time}
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

                {/* Add Activity Button (Only in edit mode) */}
                {isEditing && (
                  <div className="pl-10">
                    <button
                      onClick={() => handleAddActivity(dayIndex)}
                      className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                      <FaPlus /> アクティビティを追加
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Chat Section - Restyled */}
          {!isEditing && (
            <div className="bg-white rounded-3xl p-8 border-2 border-stone-100 shadow-lg relative overflow-hidden">
              {/* Texture overlay */}
              <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-20 pointer-events-none mix-blend-multiply" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    🤖
                  </div>
                  <h3 className="text-xl font-bold text-stone-800 font-serif">
                    Customize Plan with AI
                  </h3>
                </div>

                <div className="bg-stone-50/50 rounded-xl">
                  <TravelPlannerChat
                    itinerary={result}
                    onRegenerate={onRegenerate}
                    isRegenerating={isUpdating}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / References */}
        <div className="lg:sticky lg:top-0 lg:pt-4 lg:self-start lg:max-h-screen lg:overflow-y-auto space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-4 mb-4 flex items-center gap-2">
              <FaCalendarAlt /> Reference Articles
            </h3>

            <div className="space-y-6">
              {result.references && result.references.length > 0 ? (
                result.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group relative"
                  >
                    <div className="relative h-32 w-full rounded-lg overflow-hidden border border-stone-200 shadow-sm group-hover:shadow-md transition-all">
                      {ref.image ? (
                        <Image
                          src={ref.image}
                          alt={ref.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                          No Image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <h5 className="mt-2 text-stone-700 text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {ref.title}
                    </h5>
                  </a>
                ))
              ) : (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-sm text-stone-500 italic text-center">
                  No specific references linked.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 mb-12">
        <RequestSummary input={input} onEdit={onEditRequest} />
      </div>
    </div>
  );
}
