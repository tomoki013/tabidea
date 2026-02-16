"use client";

import { Itinerary, UserInput, Activity, TransitInfo, DayPlan } from '@/types';
import Image from "next/image";
import TravelPlannerChat from "@/components/TravelPlannerChat";
import ShareButtons from "@/components/ShareButtons";
import PDFExportButton from "./PDFExportButton";
import CalendarExportButton from "./CalendarExportButton";
import CostEstimate from "./CostEstimate";
import BookingLinkButton from "./BookingLinkButton";
import DayMap from "./DayMap";
import MapRouteView from "./MapRouteView";
import { PackingListView } from "./PackingList";
import { getStorageKey } from "./PackingList/PackingListView";
import { EmbeddedTravelInfo } from "@/components/features/travel-info";
import JournalTimeline from "./JournalTimeline";
import PlanFeedbackBar from "./PlanFeedbackBar";
import ActivityFeedbackButton from "./ActivityFeedbackButton";
import type { PackingList } from "@/types/packing-list";
import {
  FaCalendarAlt,
  FaGlobe,
  FaSuitcase,
  FaFlag,
  FaRegFlag,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useFlags } from "@/context/FlagsContext";
import { useAuth } from "@/context/AuthContext";
import { useSpotCoordinates } from "@/lib/hooks/useSpotCoordinates";
import { usePlanModal } from "@/context/PlanModalContext";
import { JournalSheet, Tape, Stamp, HandwrittenText } from "@/components/ui/journal";
import ModelBadge from "@/components/ui/ModelBadge";

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
  showRequestSummary?: boolean; // Deprecated but kept for signature compatibility
  showChat?: boolean;
  showShareButtons?: boolean;
  showReferences?: boolean;
  showFeedback?: boolean;
  initialChatHistory?: { role: string; text: string }[];
  shareCode?: string;
  localId?: string;
  planId?: string;
  enableEditing?: boolean;
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
  showFeedback = true,
  initialChatHistory,
  shareCode,
  localId,
  planId,
  enableEditing = true,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage;

  const [activeTab, setActiveTab] = useState<'plan' | 'info' | 'packing'>('plan');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Packing List State
  const [packingList, setPackingList] = useState<PackingList | null>(null);

  // Load packing list on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = getStorageKey(planId, result.destination);
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          queueMicrotask(() => setPackingList(parsed));
        }
      } catch (e) {
        console.error("Failed to load packing list", e);
      }
    }
  }, [planId, result.destination]);

  const handlePackingListChange = useCallback((list: PackingList) => {
    setPackingList(list);
  }, []);

  const handleTabSwitch = useCallback((tab: 'plan' | 'info' | 'packing') => {
    setActiveTab(tab);
    if (tabBarRef.current) {
      const stickyOffset = 112;
      const rect = tabBarRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = rect.top + scrollTop;
      const targetY = elementTop - stickyOffset;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, []);

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

  // Formatting helpers
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
    const durationMatch = dateStr.match(/(\d+)日間/);
    if (durationMatch) {
      return `${durationMatch[1]} Days Trip`;
    }
    return dateStr;
  };

  const travelDates = formatTravelDates(input.dates);
  const numberOfDays = result.days.length;
  const numberOfNights = Math.max(0, numberOfDays - 1);
  const durationString = `${numberOfNights}泊${numberOfDays}日`;

  // --------------------------------------------------------------------------
  // Update Handlers (Direct Editing)
  // --------------------------------------------------------------------------

  const handleDayUpdate = useCallback((dayIndex: number, updates: Partial<DayPlan>) => {
    const newResult = { ...result };
    newResult.days[dayIndex] = { ...newResult.days[dayIndex], ...updates };
    onResultChange?.(newResult);
  }, [result, onResultChange]);

  const handleActivityUpdate = useCallback((dayIndex: number, actIndex: number, updates: Partial<Activity>) => {
    const newResult = { ...result };
    const day = newResult.days[dayIndex];
    if (!day) return;

    // Create a new array to avoid mutation
    const newActivities = [...day.activities];
    newActivities[actIndex] = { ...newActivities[actIndex], ...updates };
    day.activities = newActivities;

    onResultChange?.(newResult);
  }, [result, onResultChange]);

  const handleTransitUpdate = useCallback((dayIndex: number, originalTransit: TransitInfo, updates: Partial<TransitInfo>) => {
    const newResult = { ...result };
    const day = newResult.days[dayIndex];
    if (!day) return;

    // 1. Update day.transit if it matches
    if (day.transit === originalTransit) {
       day.transit = { ...day.transit, ...updates };
    }
    // 2. Update timelineItems if present (less common for manual edits but possible if AI generated them)
    else if (day.timelineItems) {
       // Find the item in timelineItems that contains this transit data
       const itemIndex = day.timelineItems.findIndex(item => item.itemType === 'transit' && item.data === originalTransit);
       if (itemIndex >= 0) {
          const newItem = { ...day.timelineItems[itemIndex] };
          if (newItem.itemType === 'transit') {
             newItem.data = { ...newItem.data, ...updates };
             day.timelineItems[itemIndex] = newItem;
          }
       }
    }

    onResultChange?.(newResult);
  }, [result, onResultChange]);

  const handleAddActivity = useCallback((dayIndex: number) => {
    const newResult = { ...result };
    const day = newResult.days[dayIndex];
    if (!day) return;

    const newActivity: Activity = {
      time: "12:00",
      activity: "新しい予定",
      description: "詳細を入力してください",
    };

    day.activities = [...day.activities, newActivity];
    onResultChange?.(newResult);
  }, [result, onResultChange]);

  const handleDeleteActivity = useCallback((dayIndex: number, actIndex: number) => {
    if (!confirm('この予定を削除しますか？')) return;
    const newResult = { ...result };
    const day = newResult.days[dayIndex];
    if (!day) return;

    const newActivities = [...day.activities];
    newActivities.splice(actIndex, 1);
    day.activities = newActivities;

    onResultChange?.(newResult);
  }, [result, onResultChange]);

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 pt-20 px-2 sm:px-6 lg:px-8 text-left animate-in fade-in duration-700 pb-20 relative overflow-x-clip">
      {/* Updating Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-500 p-4">
          <div className="relative p-6 sm:p-10 rounded-3xl bg-[#fcfbf9] shadow-2xl border-4 border-white text-center max-w-sm w-full">
            <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none rounded-3xl" />
            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">✏️</div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-stone-800 tracking-wide">プランを書き直しています...</h2>
              </div>
              <div className="w-24 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-progress-indeterminate" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal Header Section */}
      <JournalSheet variant="notebook" className="relative mb-8 overflow-hidden pt-8 pb-12 px-4 sm:px-8 border-l-8 border-l-stone-300">
        <Tape color="blue" position="top-right" rotation="right" className="opacity-90 z-20" />

        {heroImg ? (
          <div className="relative aspect-video sm:aspect-21/9 w-full rounded-sm overflow-hidden shadow-md border-4 border-white bg-white rotate-1 transform mx-auto max-w-4xl">
            <Image src={heroImg} alt={result.destination} fill className="object-cover" priority />
            <Tape color="white" position="top-center" className="w-24 opacity-60 -top-3" />
            {result.heroImagePhotographer && (
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded">
                Photo by {result.heroImagePhotographer}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-10 text-center relative z-10">
          <div className="inline-block relative">
            {planId && isAuthenticated && (
              <motion.button
                onClick={handleToggleFlag}
                disabled={isFlaggingInProgress}
                className={`
                  absolute -top-4 -right-12 z-30 w-10 h-10 rounded-full shadow-sm border-2 border-white transition-all flex items-center justify-center
                  ${isThisPlanFlagged ? 'bg-amber-400 text-white' : 'bg-stone-200 text-stone-400 hover:text-amber-500'}
                `}
                whileTap={{ scale: 0.9 }}
              >
                {isThisPlanFlagged ? <FaFlag /> : <FaRegFlag />}
              </motion.button>
            )}

            <div className="flex flex-col items-center">
               <div className="flex items-center gap-2 mb-2 justify-center">
                  <Stamp color="black" size="sm" className="w-12 h-12 text-[0.6rem] border-2">
                     DESTI<br/>NATION
                  </Stamp>
                  <div className="flex flex-col items-start">
                     <span className="text-xs font-mono text-stone-400 tracking-widest">TRAVEL TO</span>
                     <HandwrittenText tag="h1" className="text-4xl sm:text-6xl font-bold text-stone-800 tracking-tight">
                        {result.destination}
                     </HandwrittenText>
                  </div>
               </div>

               <div className="flex items-center gap-3 text-stone-500 font-hand text-sm mt-2 border-t border-b border-stone-200 py-1 border-dashed">
                  <span className="flex items-center gap-1"><FaCalendarAlt /> {travelDates}</span>
                  <span>|</span>
                  <span>{durationString}</span>
                  {result.modelInfo && (
                    <>
                      <span>|</span>
                      <ModelBadge modelName={result.modelInfo.modelName} />
                    </>
                  )}
               </div>

               {/* Description is now editable if needed, but keeping it simple here as main focus is itinerary */}
               <HandwrittenText className="mt-4 text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
                  {result.description}
               </HandwrittenText>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-4 sm:gap-6 mt-8 flex-wrap">
          {showShareButtons && <ShareButtons input={input} result={result} shareCode={shareCode} localId={localId} />}
          <PDFExportButton itinerary={result} packingList={packingList} />
          <CalendarExportButton itinerary={result} dates={input.dates} />
        </div>
      </JournalSheet>

      {/* Tabs */}
      <div ref={tabBarRef} className="sticky top-[100px] md:top-[110px] z-40 mb-10 w-full flex justify-center px-2 sm:px-0 pointer-events-none will-change-transform [transform:translateZ(0)]">
        <div className="bg-white/95 p-1 rounded-full inline-flex relative shadow-sm border border-stone-200 pointer-events-auto">
          {[
            { id: 'plan', icon: FaCalendarAlt, label: '旅程表' },
            { id: 'info', icon: FaGlobe, label: '渡航情報' },
            { id: 'packing', icon: FaSuitcase, label: '持ち物' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id as 'plan' | 'info' | 'packing')}
              className={`
                relative px-6 py-2 rounded-full text-sm font-bold transition-colors duration-300 flex items-center gap-2 z-10 font-hand
                ${activeTab === tab.id ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}
              `}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBackground"
                  className="absolute inset-0 bg-stone-100 rounded-full shadow-inner"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon size={14} />
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative min-h-[500px]">
        {/* Plan Tab */}
        <div className={activeTab === 'plan' ? 'block' : 'hidden'}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">

            <div className={showReferences ? "grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-12" : "max-w-4xl mx-auto space-y-16"}>
              {/* Timeline */}
              <div className="space-y-16 pl-4 md:pl-0" data-itinerary-section>

                {/* Replaced loop with JournalTimeline */}
                <JournalTimeline
                   days={result.days}
                   destination={result.destination}
                   enableEditing={enableEditing}
                   onUpdateDay={handleDayUpdate}
                   onUpdateActivity={handleActivityUpdate}
                   onUpdateTransit={handleTransitUpdate}
                   onAddActivity={handleAddActivity}
                   onDeleteActivity={handleDeleteActivity}
                />

                {/* Cost & Feedback */}
                <>
                   <CostEstimate input={input} itinerary={result} className="mt-4" />
                   {showFeedback && (
                     <div className="mt-4"><PlanFeedbackBar destination={result.destination} /></div>
                   )}
                </>

                {/* Booking Links */}
                <div className="bg-white border-2 border-stone-200 border-dashed rounded-sm p-6 relative mt-8">
                  <Tape color="yellow" position="top-left" className="w-24 opacity-80 -rotate-12" />
                  <HandwrittenText tag="h3" className="font-bold text-xl mb-4 flex items-center gap-2">
                    <span className="text-2xl">🧳</span> この旅を予約する
                  </HandwrittenText>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <BookingLinkButton type="hotel" destination={result.destination} label="ホテルを予約" />
                    <BookingLinkButton type="flight" destination={result.destination} label="航空券を探す" />
                    <BookingLinkButton type="activity" destination={result.destination} label="体験を予約" />
                  </div>
                </div>

                {/* Disclaimer & Chat */}
                <div className="mt-8 space-y-6">
                   <div className="bg-stone-50 p-4 rounded-sm border border-stone-200 text-xs text-stone-500 font-mono">
                      <p>※このプランはAIによって生成されています。情報の正確性は保証されません。</p>
                      <p>※このページには広告・アフィリエイトリンクが含まれる場合があります。</p>
                   </div>

                   {showChat && (
                      <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-md">
                         <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">🤖</div>
                            <HandwrittenText className="font-bold text-lg">AIと相談して調整</HandwrittenText>
                         </div>
                         <TravelPlannerChat
                            key={result.id}
                            itinerary={result}
                            onRegenerate={onRegenerate}
                            isRegenerating={isUpdating}
                            initialChatHistory={initialChatHistory}
                            onChatChange={onChatChange}
                         />
                      </div>
                   )}
                </div>
              </div>

              {/* Sidebar */}
            </div>
          </motion.div>
        </div>

        {/* Other Tabs */}
        <div className={activeTab === 'info' ? 'block' : 'hidden'}>
           <EmbeddedTravelInfo destinations={input.destinations.length > 0 ? input.destinations : [result.destination]} onClose={() => {}} inline={true} />
        </div>
        <div className={activeTab === 'packing' ? 'block' : 'hidden'}>
           <PackingListView destination={result.destination} days={result.days.length} themes={input.theme} companions={input.companions} budget={input.budget} region={input.region} planId={planId} packingList={packingList} onPackingListChange={handlePackingListChange} />
        </div>
      </div>
    </div>
  );
}
