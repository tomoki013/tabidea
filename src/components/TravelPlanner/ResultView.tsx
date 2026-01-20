"use client";

import { Itinerary, UserInput } from '@/types';
import Image from "next/image";
import TravelPlannerChat from "../TravelPlannerChat";
import ShareButtons from "../ShareButtons";
import PDFDownloadButton from "./PDFDownloadButton";
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
  FaArrowUp,
  FaArrowDown,
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
  showRequestSummary?: boolean;
  showChat?: boolean;
  showShareButtons?: boolean;
  showReferences?: boolean;
}

export default function ResultView({
  result,
  input,
  onRegenerate,
  onResultChange,
  isUpdating = false,
  onEditRequest,
  showRequestSummary = true,
  showChat = true,
  showShareButtons = true,
  showReferences = true,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage;

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

  // Move activity up within the same day (keep times in their original positions)
  const handleMoveActivityUp = (dayIndex: number, actIndex: number) => {
    if (!editingResult || actIndex === 0) return;
    const newResult = JSON.parse(JSON.stringify(editingResult));
    const activities = newResult.days[dayIndex].activities;

    // Save the times at their original positions
    const upperTime = activities[actIndex - 1].time;
    const lowerTime = activities[actIndex].time;

    // Swap the activities
    [activities[actIndex - 1], activities[actIndex]] = [
      activities[actIndex],
      activities[actIndex - 1],
    ];

    // Restore times to their original positions
    activities[actIndex - 1].time = upperTime;
    activities[actIndex].time = lowerTime;

    setEditingResult(newResult);
  };

  // Move activity down within the same day (keep times in their original positions)
  const handleMoveActivityDown = (dayIndex: number, actIndex: number) => {
    if (!editingResult) return;
    const activities = editingResult.days[dayIndex].activities;
    if (actIndex >= activities.length - 1) return;
    const newResult = JSON.parse(JSON.stringify(editingResult));
    const newActivities = newResult.days[dayIndex].activities;

    // Save the times at their original positions
    const upperTime = newActivities[actIndex].time;
    const lowerTime = newActivities[actIndex + 1].time;

    // Swap the activities
    [newActivities[actIndex], newActivities[actIndex + 1]] = [
      newActivities[actIndex + 1],
      newActivities[actIndex],
    ];

    // Restore times to their original positions
    newActivities[actIndex].time = upperTime;
    newActivities[actIndex + 1].time = lowerTime;

    setEditingResult(newResult);
  };

  // Move day up
  const handleMoveDayUp = (dayIndex: number) => {
    if (!editingResult || dayIndex === 0) return;
    const newResult = JSON.parse(JSON.stringify(editingResult));
    [newResult.days[dayIndex - 1], newResult.days[dayIndex]] = [
      newResult.days[dayIndex],
      newResult.days[dayIndex - 1],
    ];
    // Update day numbers
    newResult.days.forEach((day: { day: number }, index: number) => {
      day.day = index + 1;
    });
    setEditingResult(newResult);
  };

  // Move day down
  const handleMoveDayDown = (dayIndex: number) => {
    if (!editingResult || dayIndex >= editingResult.days.length - 1) return;
    const newResult = JSON.parse(JSON.stringify(editingResult));
    [newResult.days[dayIndex], newResult.days[dayIndex + 1]] = [
      newResult.days[dayIndex + 1],
      newResult.days[dayIndex],
    ];
    // Update day numbers
    newResult.days.forEach((day: { day: number }, index: number) => {
      day.day = index + 1;
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
    <div className="w-full max-w-6xl mx-auto mt-4 px-4 sm:px-6 lg:px-8 text-left animate-in fade-in duration-700 pb-20 relative overflow-x-clip">
      {/* Updating Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-500 p-4">
          <div className="relative p-6 sm:p-10 rounded-3xl bg-[#fcfbf9] shadow-2xl border-4 border-white text-center max-w-sm w-full">
            {/* Paper Texture Overlay */}
            <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none rounded-3xl" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              {/* Animated Icon */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">
                  ✏️
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-stone-800 tracking-wide">
                  プランを書き直しています...
                </h2>
                <p className="text-stone-500 font-sans text-xs">
                  Updating your travel plan
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-24 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress-indeterminate" />
              </div>
            </div>
          </div>
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
        {heroImg ? (
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-sm overflow-hidden shadow-xl border-8 border-white bg-white rotate-1">
            <Image
              src={heroImg}
              alt={result.destination}
              fill
              className="object-cover"
              priority
            />
            {/* Unsplash Credit - Only show if photographer info exists */}
            {result.heroImagePhotographer && result.heroImagePhotographerUrl && (
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                Photo by{" "}
                <a
                  href={result.heroImagePhotographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-stone-300 transition-colors"
                >
                  {result.heroImagePhotographer}
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
        ) : null}

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

        {/* Share Buttons and PDF Download */}
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-6 sm:gap-8 mt-6">
          {showShareButtons && <ShareButtons input={input} result={result} />}
          <PDFDownloadButton itinerary={result} />
        </div>
      </div>

      {/* AI Disclaimer Notice */}
      <div className="w-full max-w-4xl mx-auto mt-8 mb-8 px-4">
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-2 text-lg">
                AI生成プランに関する重要なお知らせ
              </h3>
              <div className="text-amber-800 text-sm leading-relaxed space-y-2">
                <p>
                  このプランはAIによって自動生成されています。以下の点にご注意ください：
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>施設の営業時間、料金、住所などの情報は必ず公式サイトで最新情報をご確認ください</li>
                  <li>AIは時に事実と異なる情報を生成する可能性があります（ハルシネーション）</li>
                  <li>季節や天候、予約の必要性など、実際の旅行計画では追加の確認が必要です</li>
                </ul>
                <p className="font-semibold mt-3">
                  このプランはあくまで旅行のアイデアとしてご活用ください。実際の旅行では必ず最新情報を確認し、安全で楽しい旅をお楽しみください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={
          showReferences
            ? "grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12 overflow-x-clip"
            : "max-w-4xl mx-auto space-y-16 overflow-x-clip"
        }
      >
        {/* Timeline */}
        <div className="space-y-16" data-itinerary-section>
          {displayResult.days.map((day, dayIndex) => (
            <div key={day.day} className="relative">
              {/* Day Header - Sticky at top when scrolled */}
              <div className="sticky top-24 md:top-28 z-30 mb-8 flex items-center gap-4">
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
                {/* Day reorder buttons - Only in edit mode */}
                {isEditing && (
                  <div className="flex items-center gap-1 bg-white rounded-full shadow-md border border-stone-200 p-1">
                    <button
                      onClick={() => handleMoveDayUp(dayIndex)}
                      disabled={dayIndex === 0}
                      className={`p-2 rounded-full transition-colors ${
                        dayIndex === 0
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-500 hover:text-primary hover:bg-primary/10"
                      }`}
                      title="前の日と入れ替え"
                    >
                      <FaArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveDayDown(dayIndex)}
                      disabled={dayIndex >= displayResult.days.length - 1}
                      className={`p-2 rounded-full transition-colors ${
                        dayIndex >= displayResult.days.length - 1
                          ? "text-stone-300 cursor-not-allowed"
                          : "text-stone-500 hover:text-primary hover:bg-primary/10"
                      }`}
                      title="次の日と入れ替え"
                    >
                      <FaArrowDown size={14} />
                    </button>
                  </div>
                )}
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
                            {/* Activity action buttons */}
                            <div className="flex items-center gap-1">
                              {/* Move up/down buttons */}
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() =>
                                    handleMoveActivityUp(dayIndex, actIndex)
                                  }
                                  disabled={actIndex === 0}
                                  className={`p-1.5 rounded transition-colors ${
                                    actIndex === 0
                                      ? "text-stone-300 cursor-not-allowed"
                                      : "text-stone-400 hover:text-primary hover:bg-primary/10"
                                  }`}
                                  title="上に移動"
                                >
                                  <FaArrowUp size={12} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleMoveActivityDown(dayIndex, actIndex)
                                  }
                                  disabled={
                                    actIndex >= day.activities.length - 1
                                  }
                                  className={`p-1.5 rounded transition-colors ${
                                    actIndex >= day.activities.length - 1
                                      ? "text-stone-300 cursor-not-allowed"
                                      : "text-stone-400 hover:text-primary hover:bg-primary/10"
                                  }`}
                                  title="下に移動"
                                >
                                  <FaArrowDown size={12} />
                                </button>
                              </div>
                              {/* Delete button */}
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
          {!isEditing && showChat && (
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
        {showReferences && (
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
        )}
      </div>

      {showRequestSummary && (
        <div className="mt-16 mb-12">
          <RequestSummary input={input} onEdit={onEditRequest} />
        </div>
      )}
    </div>
  );
}
