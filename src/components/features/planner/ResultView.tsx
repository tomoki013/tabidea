"use client";

import { Itinerary, UserInput } from '@/types';
import Image from "next/image";
import TravelPlannerChat from "@/components/TravelPlannerChat";
import ShareButtons from "@/components/ShareButtons";
import PDFExportButton from "./PDFExportButton";
import RequestSummary from "./RequestSummary";
import CalendarExportButton from "./CalendarExportButton";
import CostEstimate from "./CostEstimate";
import BookingLinkButton from "./BookingLinkButton";
import DayMap from "./DayMap";
import { PackingListView } from "./PackingList";
import { getStorageKey } from "./PackingList/PackingListView";
import { EmbeddedTravelInfo } from "@/components/features/travel-info";
import { SpotCard, TransitCard as CardTransitCard, AccommodationCard } from "@/components/features/plan/cards";
import type { CardState } from "@/components/features/plan/cards";
import { getActivityIcon, groupActivitiesByTimePeriod } from "@/lib/utils/activity-icon";
import { extractStartDate, getDayCheckInOutDates } from "@/lib/utils/plan";
import { isDomesticDestination, type TravelRegion } from "@/lib/utils/affiliate-links";
import PlanFeedbackBar from "./PlanFeedbackBar";
import ActivityFeedbackButton from "./ActivityFeedbackButton";
import type { PackingList } from "@/types/packing-list";
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
  FaGlobe,
  FaSuitcase,
  FaFlag,
  FaRegFlag,
  FaLock,
  FaUnlock,
} from "react-icons/fa";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useFlags } from "@/context/FlagsContext";
import { useAuth } from "@/context/AuthContext";

interface ResultViewProps {
  result: Itinerary;
  input: UserInput;
  onRestart: () => void;
  onRegenerate: (
    history: { role: string; text: string }[],
    overridePlan?: Itinerary
  ) => void;
  onResultChange?: (result: Itinerary) => void;
  onChatChange?: (messages: { role: string; text: string }[]) => void;
  isUpdating?: boolean;
  onEditRequest?: (stepIndex: number) => void;
  showRequestSummary?: boolean;
  showChat?: boolean;
  showShareButtons?: boolean;
  showReferences?: boolean;
  initialChatHistory?: { role: string; text: string }[];
  shareCode?: string;
  localId?: string;
  planId?: string;
}

export default function ResultView({
  result,
  input,
  onRegenerate,
  onResultChange,
  onChatChange,
  isUpdating = false,
  onEditRequest,
  showRequestSummary = true,
  showChat = true,
  showShareButtons = true,
  showReferences = true,
  initialChatHistory,
  shareCode,
  localId,
  planId,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage;

  const [isEditing, setIsEditing] = useState(false);
  const [editingResult, setEditingResult] = useState<Itinerary | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'info' | 'packing'>('plan');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Packing List State (Lifted for PDF Export)
  const [packingList, setPackingList] = useState<PackingList | null>(null);

  // Load packing list on mount
  useEffect(() => {
    // Only load if browser side
    if (typeof window !== 'undefined') {
      const key = getStorageKey(planId, result.destination);
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setPackingList(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load packing list", e);
      }
    }
  }, [planId, result.destination]);

  const handlePackingListChange = useCallback((list: PackingList) => {
    setPackingList(list);
    // Note: LocalStorage update is handled within PackingListView or here?
    // Since PackingListView handles its own persistence when generating,
    // and we're controlling it now, we should ensure it persists.
    // However, PackingListView's handleGenerate updates localStorage too.
    // So we just update state.
  }, []);

  const handleTabSwitch = useCallback((tab: 'plan' | 'info' | 'packing') => {
    setActiveTab(tab);
    // Scroll to tab content area with offset for sticky header
    if (tabBarRef.current) {
      // Calculate offset based on sticky header (approx 24-28 rem units + tab bar)
      // Header is usually around 64px + TabBar around 60px.
      // The tabBar is sticky at top-24 (96px) or top-28 (112px).
      // We want to scroll so the content starts right below the sticky tabs.
      const stickyOffset = 112; // md:top-28 = 7rem = 112px
      const rect = tabBarRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = rect.top + scrollTop;

      // Target position: Element Top - Sticky Offset
      const targetY = elementTop - stickyOffset;

      // Only scroll if we are below the target (scrolling UP to content start)
      // or if we are way above? Usually tab switch implies focus on content.
      // Let's just scroll to alignment.
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, []);

  // Card expansion state: track which cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  // Flags
  const { isAuthenticated } = useAuth();
  const { isFlagged, toggleFlag } = useFlags();
  const [isFlaggingInProgress, setIsFlaggingInProgress] = useState(false);

  const handleToggleFlag = async () => {
    if (!planId || !isAuthenticated) return;

    setIsFlaggingInProgress(true);
    await toggleFlag(planId);
    setIsFlaggingInProgress(false);
  };

  const isThisPlanFlagged = planId ? isFlagged(planId) : false;

  // Guard against navigation when editing
  useEffect(() => {
    if (!isEditing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Guard internal links
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && !link.href.startsWith('javascript:') && !link.target) {
        // Allow anchor links on the same page
        const url = new URL(link.href, window.location.href);
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
          return;
        }

        e.preventDefault();
        if (window.confirm('編集中の内容が破棄されますが、移動しますか？')) {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          window.location.href = link.href;
        }
      }
    };

    window.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [isEditing]);

  const startEditing = () => {
    setEditingResult(JSON.parse(JSON.stringify(result))); // Deep clone
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (confirm('編集中の内容は破棄されます。よろしいですか？')) {
      setIsEditing(false);
      setEditingResult(null);
    }
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

  // Toggle lock on activity
  const handleToggleLockActivity = (dayIndex: number, actIndex: number) => {
    if (!editingResult) return;
    const newResult = { ...editingResult };
    newResult.days[dayIndex].activities[actIndex] = {
      ...newResult.days[dayIndex].activities[actIndex],
      isLocked: !newResult.days[dayIndex].activities[actIndex].isLocked,
    };
    setEditingResult(newResult);
  };

  // Toggle lock on transit
  const handleToggleLockTransit = (dayIndex: number) => {
    if (!editingResult || !editingResult.days[dayIndex].transit) return;
    const newResult = { ...editingResult };
    newResult.days[dayIndex].transit = {
      ...newResult.days[dayIndex].transit!,
      isLocked: !newResult.days[dayIndex].transit!.isLocked,
    };
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
              className={`flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full shadow-xl hover:bg-primary/90 hover:-translate-y-1 font-bold transition-all border-4 border-white/20 ${activeTab === 'info' ? 'hidden' : ''}`}
            >
              <FaPen /> プラン内容を編集
            </button>
          )}
        </div>
      </div>

      {/* Journal Header Section */}
      <div className="relative mb-8 overflow-x-hidden">
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
            {/* Flag Button - Positioned at top right */}
            {planId && isAuthenticated && (
              <motion.button
                onClick={handleToggleFlag}
                disabled={isFlaggingInProgress}
                className={`
                  absolute -top-3 -left-3 sm:-left-4 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl border-4 border-white transition-all flex items-center justify-center
                  ${isThisPlanFlagged
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-white text-stone-400 hover:text-amber-500'
                  }
                  ${isFlaggingInProgress ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}
                `}
                whileHover={!isFlaggingInProgress ? { rotate: [0, -10, 10, -10, 0] } : {}}
                whileTap={!isFlaggingInProgress ? { scale: 0.9 } : {}}
                title={isThisPlanFlagged ? 'フラグを外す' : 'フラグを付ける'}
              >
                <motion.div
                  animate={
                    isThisPlanFlagged
                      ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.5 }}
                >
                  {isThisPlanFlagged ? (
                    <FaFlag className="text-2xl" />
                  ) : (
                    <FaRegFlag className="text-2xl" />
                  )}
                </motion.div>
              </motion.button>
            )}

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

        {/* Share Buttons, PDF Download, Calendar Export */}
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-4 sm:gap-6 mt-6 flex-wrap">
          {showShareButtons && <ShareButtons input={input} result={result} shareCode={shareCode} localId={localId} />}
          <PDFExportButton itinerary={result} packingList={packingList} />
          <CalendarExportButton itinerary={result} dates={input.dates} />
        </div>
      </div>

      {/* Modern Toggle Switch Navigation */}
      {/* Sticky Container for Tabs - positioned to align with Day Header */}
      <div ref={tabBarRef} className="sticky top-24 md:top-28 z-40 mb-10 w-full flex justify-end md:justify-center px-2 sm:px-0 pointer-events-none">
        <div className="bg-stone-200/40 p-1.5 rounded-full inline-flex relative shadow-inner border border-stone-200/50 pointer-events-auto backdrop-blur-sm">
          {[
            { id: 'plan', icon: FaCalendarAlt, label: '旅程表' },
            { id: 'info', icon: FaGlobe, label: '渡航情報' },
            { id: 'packing', icon: FaSuitcase, label: '持ち物' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id as 'plan' | 'info' | 'packing')}
              className={`
                relative px-4 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-colors duration-300 flex items-center gap-2 z-10
                ${activeTab === tab.id ? 'text-stone-800' : 'text-stone-500 hover:text-stone-700'}
              `}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBackground"
                  className="absolute inset-0 bg-white rounded-full shadow-sm border border-stone-200/50"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className={activeTab === tab.id ? 'text-primary' : 'text-stone-400'} size={14} />
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area (No conditional unmounting for persistence) */}
      <div className="relative min-h-[500px]">
        {/* Plan Tab Content */}
        <div className={activeTab === 'plan' ? 'block' : 'hidden'}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* AI Disclaimer Notice */}
            <div className="w-full max-w-4xl mx-auto mt-0 mb-8 px-4">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">&#x26A0;&#xFE0F;</div>
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
                    {/* Day Header - Sticky position updated to top-24 md:top-28 to align with Tabs */}
                    <div className="sticky top-24 md:top-28 z-30 mb-8 flex items-center gap-4 pointer-events-none">
                      <div className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-r-full shadow-md border border-stone-200 border-l-4 border-l-primary pointer-events-auto">
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

                    {/* Day Content */}
                    <div className="relative ml-4 sm:ml-8">
                      {/* Enhanced Timeline Line */}
                      {!isEditing && (
                        <div className="absolute left-3 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary/40 via-primary/20 to-primary/5 rounded-full hidden md:block" />
                      )}

                      <div className="space-y-4">
                      {isEditing ? (
                        <>
                          {/* Edit Mode: Transit Card */}
                          {day.transit && (
                            <CardTransitCard
                              transit={day.transit}
                              state={getCardState(`transit-${day.day}`)}
                              onStateChange={(state) =>
                                handleCardStateChange(`transit-${day.day}`, state)
                              }
                              isEditing={true}
                              onLockToggle={() => handleToggleLockTransit(dayIndex)}
                              className="mb-6"
                            />
                          )}

                          {/* Edit Mode: Activity Cards */}
                          {day.activities.map((act, actIndex) => (
                            <div
                              key={actIndex}
                              className="relative bg-white rounded-xl shadow-sm border border-primary/30 ring-2 ring-primary/5 p-6"
                            >
                              <div className="space-y-3 w-full">
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
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        handleToggleLockActivity(dayIndex, actIndex)
                                      }
                                      className={`p-2 rounded transition-colors ${
                                        act.isLocked
                                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                          : "text-stone-400 hover:text-amber-600 hover:bg-amber-50"
                                      }`}
                                      title={act.isLocked ? "ロック解除" : "ロック"}
                                    >
                                      {act.isLocked ? <FaLock size={14} /> : <FaUnlock size={14} />}
                                    </button>
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
                                          handleMoveActivityDown(
                                            dayIndex,
                                            actIndex
                                          )
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
                            </div>
                          ))}

                          {/* Add Activity Button */}
                          <button
                            onClick={() => handleAddActivity(dayIndex)}
                            className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-bold"
                          >
                            <FaPlus /> アクティビティを追加
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Day Map */}
                          <DayMap
                            activities={day.activities}
                            dayNumber={day.day}
                            className="mb-6"
                          />

                          {/* View Mode: Transit Card */}
                          {day.transit && (
                            <div className="relative md:pl-8">
                              {/* Timeline dot for transit */}
                              <div className="absolute left-0 top-4 w-7 h-7 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center text-xs z-10 hidden md:flex">
                                🚃
                              </div>
                              <CardTransitCard
                                transit={day.transit}
                                state={getCardState(`transit-${day.day}`)}
                                onStateChange={(state) =>
                                  handleCardStateChange(`transit-${day.day}`, state)
                                }
                                className="mb-6"
                              />
                            </div>
                          )}

                          {/* View Mode: Activity Cards with Time Period Sections */}
                          {groupActivitiesByTimePeriod(day.activities).map(
                            (group) => (
                              <div key={group.period.period} className="space-y-4">
                                {/* Time Period Label */}
                                <div className="flex items-center gap-3 md:pl-8 pt-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
                                    <span className="text-base">{group.period.icon}</span>
                                    <span className="uppercase tracking-wider text-xs font-bold">
                                      {group.period.label}
                                    </span>
                                  </div>
                                  <div className="flex-1 h-px bg-gradient-to-r from-stone-200 to-transparent" />
                                </div>

                                {/* Activities in this period */}
                                {group.activities.map((act, actIndex) => {
                                  const globalIndex = day.activities.indexOf(act);
                                  const iconInfo = getActivityIcon(act.activity);
                                  return (
                                    <div
                                      key={`activity-${day.day}-${globalIndex}`}
                                      className="relative md:pl-8"
                                    >
                                      {/* Timeline dot with activity icon */}
                                      <div className="absolute left-0 top-4 w-7 h-7 rounded-full bg-white border-2 border-primary/30 flex items-center justify-center text-xs z-10 shadow-sm hidden md:flex">
                                        {iconInfo.icon}
                                      </div>
                                      <div className="relative">
                                        <SpotCard
                                          activity={act}
                                          destination={result.destination}
                                          state={getCardState(
                                            `activity-${day.day}-${globalIndex}`
                                          )}
                                          onStateChange={(state) =>
                                            handleCardStateChange(
                                              `activity-${day.day}-${globalIndex}`,
                                              state
                                            )
                                          }
                                        />
                                        {!isEditing && (
                                          <div className="absolute top-2 right-2 z-10">
                                            <ActivityFeedbackButton
                                              day={day.day}
                                              activityIndex={globalIndex}
                                              destination={result.destination}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          )}

                          {/* View Mode: Accommodation Card */}
                          {dayIndex < displayResult.days.length - 1 && (
                            <div className="relative md:pl-8">
                              {/* Timeline dot for accommodation */}
                              <div className="absolute left-0 top-4 w-7 h-7 rounded-full bg-purple-100 border-2 border-purple-400 flex items-center justify-center text-xs z-10 hidden md:flex">
                                🏨
                              </div>
                              <AccommodationCard
                                accommodation={(() => {
                                  const startDate = extractStartDate(input.dates);
                                  const dates = startDate ? getDayCheckInOutDates(startDate, day.day) : undefined;
                                  const lastActivity = day.activities[day.activities.length - 1];
                                  const overnightArea = lastActivity?.locationEn || result.destination;
                                  return {
                                    name: overnightArea,
                                    description: `${day.day}日目の宿泊エリア`,
                                    checkInDate: dates?.checkIn,
                                    checkOutDate: dates?.checkOut,
                                  };
                                })()}
                                destination={(() => {
                                  const lastActivity = day.activities[day.activities.length - 1];
                                  return lastActivity?.locationEn || result.destination;
                                })()}
                                region={isDomesticDestination(result.destination) ? 'domestic' as TravelRegion : 'overseas' as TravelRegion}
                                dayNumber={day.day}
                                state={getCardState(`accommodation-${day.day}`)}
                                onStateChange={(state) =>
                                  handleCardStateChange(
                                    `accommodation-${day.day}`,
                                    state
                                  )
                                }
                                className="mt-6"
                              />
                            </div>
                          )}
                        </>
                      )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Cost Estimate Section */}
                {!isEditing && (
                  <CostEstimate
                    input={input}
                    itinerary={displayResult}
                    className="mt-4"
                  />
                )}

                {/* Plan Feedback */}
                {!isEditing && (
                  <div className="mt-4">
                    <PlanFeedbackBar
                      destination={result.destination}
                    />
                  </div>
                )}

                {/* Booking Summary Section */}
                {!isEditing && (
                  <div className="bg-gradient-to-br from-primary/5 via-white to-primary/10 rounded-2xl p-6 sm:p-8 border border-primary/15 mt-4 shadow-sm">
                    <h3 className="font-bold text-stone-800 text-lg mb-2 flex items-center gap-2">
                      <span className="text-xl">🧳</span>
                      この旅を予約する
                    </h3>
                    <p className="text-sm text-stone-500 mb-5">
                      プラン確定後でもいつでも予約できます
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <BookingLinkButton
                        type="hotel"
                        destination={result.destination}
                        label="ホテルを予約"
                      />
                      <BookingLinkButton
                        type="flight"
                        destination={result.destination}
                        label="航空券を探す"
                      />
                      <BookingLinkButton
                        type="activity"
                        destination={result.destination}
                        label="体験を予約"
                      />
                    </div>
                  </div>
                )}

                {/* Trust Badge Legend & Affiliate Disclaimer */}
                {!isEditing && (
                  <div className="mt-4 space-y-4">
                    {/* Trust Badge Legend */}
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                      <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                        信頼性アイコンについて
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-600">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200 text-[10px] font-medium gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            検証済み
                          </span>
                          <span>Google Places等で存在を確認済み</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
                            AI生成
                          </span>
                          <span>AIが生成した情報（未検証）</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                            要確認
                          </span>
                          <span>存在が不確かな場合があります</span>
                        </div>
                      </div>
                    </div>

                    {/* Affiliate Disclaimer */}
                    <div className="text-xs text-stone-400 leading-relaxed bg-stone-50/50 rounded-lg px-4 py-3 border border-stone-100">
                      <p>
                        このページには広告・アフィリエイトリンクが含まれる場合があります。リンク先での購入により、当サイトが報酬を得る場合があります。ご利用者様の追加負担はありません。
                      </p>
                    </div>
                  </div>
                )}

                {/* Chat Section - Restyled */}
                {!isEditing && showChat && (
                  <div className="bg-white rounded-3xl p-4 sm:p-8 border-2 border-stone-100 shadow-lg relative overflow-hidden mt-4 w-full min-w-0">
                    {/* Texture overlay */}
                    <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-20 pointer-events-none mix-blend-multiply" />

                    <div className="relative z-10 w-full min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
                          🤖
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 font-serif">
                          Customize Plan with AI
                        </h3>
                      </div>

                      <div className="bg-stone-50/50 rounded-xl w-full min-w-0 overflow-hidden">
                        <TravelPlannerChat
                          key={result.id}
                          itinerary={result}
                          onRegenerate={onRegenerate}
                          isRegenerating={isUpdating}
                          initialChatHistory={initialChatHistory}
                          onChatChange={onChatChange}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar / References */}
              {showReferences && (
                <div className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-8 custom-scrollbar">
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
          </motion.div>
        </div>

        {/* Info Tab Content */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <EmbeddedTravelInfo
              destinations={
                input.destinations.length > 0
                  ? input.destinations
                  : [result.destination]
              }
              onClose={() => {}}
              inline={true}
            />
          </motion.div>
        </div>

        {/* Packing List Tab Content */}
        <div className={activeTab === 'packing' ? 'block' : 'hidden'}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <PackingListView
              destination={result.destination}
              days={result.days.length}
              themes={input.theme}
              companions={input.companions}
              budget={input.budget}
              region={input.region}
              planId={planId}
              packingList={packingList}
              onPackingListChange={handlePackingListChange}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
