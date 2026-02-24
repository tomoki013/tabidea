"use client";

import { Itinerary, UserInput, Activity, TransitInfo, DayPlan } from '@/types';
import Image from "next/image";
import TravelPlannerChat from "@/components/TravelPlannerChat";
import ShareButtons from "@/components/ShareButtons";
import PDFExportButton from "./PDFExportButton";
import CalendarExportButton from "./CalendarExportButton";
import CostEstimate from "./CostEstimate";
import BookingLinkButton from "./BookingLinkButton";
import { PackingListView } from "./PackingList";
import { getStorageKey } from "./PackingList/PackingListView";
import { EmbeddedTravelInfo } from "@/components/features/travel-info";
import PlanFeedbackBar from "./PlanFeedbackBar";
import PublicToggle from "./PublicToggle";
import type { PackingList } from "@/types/packing-list";
import {
  FaCalendarAlt,
  FaGlobe,
  FaSuitcase,
  FaFlag,
  FaRegFlag,
  FaPlus,
  FaMap,
  FaList,
} from "react-icons/fa";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useFlags } from "@/context/FlagsContext";
import { useAuth } from "@/context/AuthContext";
import { JournalSheet, Tape, Stamp, HandwrittenText } from "@/components/ui/journal";
import ModelBadge from "@/components/ui/ModelBadge";
import { EditableText } from "@/components/ui/editable/EditableText";
import { CardState } from "@/components/features/plan/cards/BaseCard";
import SpotCard from "@/components/features/plan/cards/SpotCard";
import TransitCard from "@/components/features/plan/cards/TransitCard";
import MapRouteView from "@/components/features/planner/MapRouteView";
import { MapRenderer } from "@/components/features/plan/map";
import { useSpotCoordinates } from "@/lib/hooks/useSpotCoordinates";
import { cn } from "@/lib/utils";
import type { MapProviderType } from "@/lib/limits/config";
import type { ReplanTrigger } from "@/types/replan";
import { ReplanTriggerPanel } from "@/components/features/replan";
import type { NormalizedPlanDay } from '@/types/normalized-plan';
import ShioriJournalEditor from './ShioriJournalEditor';

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
  showFeedback?: boolean;
  initialChatHistory?: { role: string; text: string }[];
  shareCode?: string;
  localId?: string;
  planId?: string;
  enableEditing?: boolean;
  initialIsPublic?: boolean;
  isSimplifiedView?: boolean;
  /** マッププロバイダー（ティア別: static/leaflet/google_maps） */
  mapProvider?: MapProviderType;
  /** リプラントリガーを表示するか（旅行中モード） */
  showReplanTriggers?: boolean;
  /** リプラントリガー発火コールバック */
  onReplanTrigger?: (trigger: ReplanTrigger) => void;
  /** リプラン処理中か */
  isReplanning?: boolean;
  normalizedDays?: NormalizedPlanDay[];
  onSyncJournalEntry?: (input: {
    itemId: string;
    content: string;
    phase: 'before' | 'during' | 'after';
    placeName: string | null;
    photoUrls: string[];
  }) => Promise<{ success: boolean; error?: string; updatedAt?: string }>;
}

export default function ResultView({
  result,
  input,
  onRegenerate,
  onResultChange,
  onChatChange,
  isUpdating = false,
  showChat = true,
  showShareButtons = true,
  showReferences = true,
  showFeedback = true,
  initialChatHistory,
  shareCode,
  localId,
  planId,
  enableEditing = true,
  initialIsPublic,
  isSimplifiedView = false,
  mapProvider = "google_maps",
  showReplanTriggers = false,
  onReplanTrigger,
  isReplanning = false,
  normalizedDays,
  onSyncJournalEntry,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage;

  // Tabs are simplified for Simplified View
  const [activeTab, setActiveTab] = useState<'plan' | 'journal' | 'info' | 'packing'>('plan');
  const tabBarRef = useRef<HTMLDivElement>(null);

  // View Mode: 'split' (Map + Itinerary) or 'full' (Itinerary Only)
  // Default to 'split' unless isSimplifiedView, then 'full' (and map hidden)
  const [viewMode, setViewMode] = useState<'split' | 'full'>(isSimplifiedView ? 'full' : 'split');
  // Mobile View Mode: 'list' | 'map'
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'map'>('list');

  // Card expansion state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Packing List State
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const hasJournalTab = enableEditing && Boolean(planId) && Boolean(onSyncJournalEntry) && (normalizedDays?.length ?? 0) > 0;

  // Map Data
  const { enrichedDays } = useSpotCoordinates(result.days, result.destination);

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

  const handleTabSwitch = useCallback((tab: 'plan' | 'journal' | 'info' | 'packing') => {
    setActiveTab(tab);
    // Sticky offset removed as sticky headers are removed
    if (tabBarRef.current) {
      const rect = tabBarRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = rect.top + scrollTop;
      window.scrollTo({ top: elementTop - 20, behavior: 'smooth' });
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
    // 2. Update timelineItems if present
    else if (day.timelineItems) {
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
    const newResult = { ...result };
    const day = newResult.days[dayIndex];
    if (!day) return;

    const newActivities = [...day.activities];
    newActivities.splice(actIndex, 1);
    day.activities = newActivities;

    onResultChange?.(newResult);
  }, [result, onResultChange]);

  const handleDeleteTransit = useCallback((dayIndex: number) => {
    const newResult = { ...result };
    const day = newResult.days[dayIndex];
    if (!day) return;

    day.transit = undefined;
    onResultChange?.(newResult);
  }, [result, onResultChange]);

  // Card State Management
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

  return (
    <div className="w-full max-w-7xl mx-auto mt-4 pt-4 px-2 sm:px-6 lg:px-8 text-left animate-in fade-in duration-700 pb-20 relative overflow-x-clip">
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
      <JournalSheet variant="notebook" className="relative mb-8 md:mb-12 overflow-hidden pt-8 pb-12 px-4 sm:px-8 border-l-8 border-l-stone-300">
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

        {/* Action Buttons & Public Toggle */}
        <div className="flex flex-col sm:flex-row justify-center items-center sm:items-start gap-8 mt-12 flex-wrap">
          {enableEditing && planId && typeof initialIsPublic !== 'undefined' && (
             <PublicToggle planId={planId} initialIsPublic={initialIsPublic} />
          )}
          {showShareButtons && <ShareButtons input={input} result={result} shareCode={shareCode} localId={localId} />}
          {!isSimplifiedView && (
             <div className="flex gap-4">
                <PDFExportButton itinerary={result} packingList={packingList} />
                <CalendarExportButton itinerary={result} dates={input.dates} />
             </div>
          )}
        </div>
      </JournalSheet>

      {/* Tabs / View Controls */}
      <div ref={tabBarRef} className="relative z-40 mb-8 w-full flex flex-col items-center gap-4 px-2 sm:px-0">

         {/* Main Tabs (Hidden if simplified view) */}
        {!isSimplifiedView && (
           <div className="bg-white/95 p-1 rounded-full inline-flex relative shadow-sm border border-stone-200 backdrop-blur-sm">
             {[
               { id: 'plan', icon: FaCalendarAlt, label: '旅程表' },
               ...(hasJournalTab ? [{ id: 'journal', icon: FaRegFlag, label: 'しおり記録' }] as const : []),
               { id: 'info', icon: FaGlobe, label: '渡航情報' },
               { id: 'packing', icon: FaSuitcase, label: '持ち物' }
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => handleTabSwitch(tab.id as 'plan' | 'journal' | 'info' | 'packing')}
                 className={`
                   relative px-4 sm:px-6 py-2 rounded-full text-sm font-bold transition-colors duration-300 flex items-center gap-2 z-10 font-hand whitespace-nowrap
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
        )}

        {/* Desktop View Toggle (Map vs List) */}
        {!isSimplifiedView && activeTab === 'plan' && (
           <div className="hidden lg:flex bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg p-1 shadow-sm mt-2">
              <button
                 onClick={() => setViewMode('split')}
                 className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    viewMode === 'split' ? "bg-stone-100 text-stone-800 shadow-inner" : "text-stone-500 hover:bg-stone-50"
                 )}
              >
                 <FaMap className="text-[10px]" />
                 マップ＋旅程
              </button>
              <button
                 onClick={() => setViewMode('full')}
                 className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                    viewMode === 'full' ? "bg-stone-100 text-stone-800 shadow-inner" : "text-stone-500 hover:bg-stone-50"
                 )}
              >
                 <FaList className="text-[10px]" />
                 旅程のみ
              </button>
           </div>
        )}

        {/* Mobile View Toggle (Map vs List) */}
        {!isSimplifiedView && activeTab === 'plan' && (
           <div className="lg:hidden flex w-full max-w-xs mx-auto bg-stone-100 p-1 rounded-xl shadow-inner mt-2">
              <button
                 onClick={() => setMobileViewMode('list')}
                 className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                    mobileViewMode === 'list' ? "bg-white shadow-sm text-stone-800" : "text-stone-400 hover:text-stone-600"
                 )}
              >
                 <FaList className="text-xs" />
                 リスト
              </button>
              <button
                 onClick={() => setMobileViewMode('map')}
                 className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all",
                    mobileViewMode === 'map' ? "bg-white shadow-sm text-stone-800" : "text-stone-400 hover:text-stone-600"
                 )}
              >
                 <FaMap className="text-xs" />
                 マップ
              </button>
           </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative min-h-[500px]">
        {/* Plan Tab */}
        <div className={activeTab === 'plan' ? 'block' : 'hidden'}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">

             {/* Layout Container */}
            <div className={cn(
               "grid gap-12 lg:gap-16",
               viewMode === 'split' ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"
            )}>
              {/* Left Column: Map (Sticky) - Only in Split Mode */}
              {!isSimplifiedView && (
                 <div className={cn(
                    "hidden lg:block relative",
                    viewMode === 'split' ? "" : "hidden"
                 )}>
                    <div className="sticky top-[110px] h-[calc(100vh-130px)] rounded-xl overflow-hidden shadow-lg border border-stone-200">
                        {mapProvider === "google_maps" ? (
                          <MapRouteView days={enrichedDays} destination={result.destination} className="w-full h-full" />
                        ) : (
                          <MapRenderer
                            mapProvider={mapProvider}
                            activities={result.days.flatMap((d) => d.activities)}
                            dayNumber={1}
                            className="w-full h-full"
                          />
                        )}
                    </div>
                 </div>
              )}

              {/* Right Column: Timeline */}
              <div className={cn(
                 "space-y-24",
                 viewMode === 'split' ? "pl-0 md:pl-2" : "w-full"
              )} data-itinerary-section>

                {/* Mobile Map View - Fullscreen style container */}
                {!isSimplifiedView && mobileViewMode === 'map' && (
                   <div className="lg:hidden h-[65vh] rounded-xl overflow-hidden shadow-md border border-stone-200 mb-8 relative z-0">
                       {mapProvider === "google_maps" ? (
                         <MapRouteView days={enrichedDays} destination={result.destination} className="w-full h-full" />
                       ) : (
                         <MapRenderer
                           mapProvider={mapProvider}
                           activities={result.days.flatMap((d) => d.activities)}
                           dayNumber={1}
                           className="w-full h-full"
                         />
                       )}
                   </div>
                )}

                {/* Itinerary List - Hidden on Mobile Map Mode */}
                <div className={cn(
                  "space-y-24",
                  (!isSimplifiedView && mobileViewMode === 'map') ? "hidden lg:block" : "block"
                )}>
                  {result.days.map((day, dayIndex) => (
                    <div key={day.day} className="relative">
                      {/* Day Header (Relative positioning now) */}
                      <div className="relative z-30 mb-8 flex items-center gap-4">
                        <div className="inline-flex items-center gap-4 bg-white/95 backdrop-blur-sm py-3 px-6 rounded-r-full shadow-md border border-stone-200 border-l-4 border-l-primary">
                          <span className="text-4xl font-serif text-primary">
                            {day.day}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
                              Day
                            </span>
                            <span className="text-stone-600 font-serif italic text-lg leading-none min-w-[150px]">
                              {enableEditing ? (
                                <EditableText
                                  value={day.title}
                                  onChange={(val) => handleDayUpdate(dayIndex, { title: val })}
                                  isEditable={true}
                                  className="bg-transparent border-none focus:ring-0 w-full font-serif italic text-lg leading-none"
                                />
                              ) : (
                                day.title
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Day Content */}
                      <div className="space-y-6 ml-4 sm:ml-8 border-l-2 border-dashed border-stone-200 pl-8 pb-12">
                        {/* Transit Card */}
                      {day.transit && (
                        <TransitCard
                          transit={day.transit}
                          state={isSimplifiedView ? "collapsed" : getCardState(`transit-${day.day}`)}
                          onStateChange={(state) => handleCardStateChange(`transit-${day.day}`, state)}
                          className="mb-8"
                          isEditable={enableEditing}
                          onUpdate={(updates) => day.transit && handleTransitUpdate(dayIndex, day.transit, updates)}
                          onDelete={() => handleDeleteTransit(dayIndex)}
                          expandable={!isSimplifiedView}
                        />
                      )}

                      {/* Activity Cards */}
                      {day.activities.map((activity, actIndex) => {
                        const cardId = `activity-${day.day}-${actIndex}`;

                        return (
                          <div key={cardId} className="mb-4">
                            <SpotCard
                                activity={activity}
                                destination={result.destination}
                                state={isSimplifiedView ? "collapsed" : getCardState(cardId)}
                                onStateChange={(state) => handleCardStateChange(cardId, state)}
                                isEditable={enableEditing}
                                onUpdate={(updates) => handleActivityUpdate(dayIndex, actIndex, updates)}
                                onDelete={() => handleDeleteActivity(dayIndex, actIndex)}
                                expandable={!isSimplifiedView}
                            />
                          </div>
                        );
                      })}

                      {/* Replan Trigger Panel (PR-K: 旅中モード) */}
                      {showReplanTriggers && onReplanTrigger && (
                        <div className="pt-4 animate-in fade-in duration-300">
                          <ReplanTriggerPanel
                            slotId={`day-${day.day}-current`}
                            onTrigger={onReplanTrigger}
                            disabled={isReplanning}
                          />
                        </div>
                      )}

                      {/* Add Activity Button */}
                      {enableEditing && (
                        <div className="pt-4">
                          <button
                            onClick={() => handleAddActivity(dayIndex)}
                            className="flex items-center justify-center gap-2 w-full py-4 text-stone-400 hover:text-primary font-hand text-sm border-2 border-dashed border-stone-200 hover:border-primary rounded-xl transition-all group bg-stone-50/50 hover:bg-primary/5"
                          >
                            <div className="w-6 h-6 rounded-full border-2 border-stone-300 group-hover:border-primary flex items-center justify-center">
                              <FaPlus className="w-3 h-3" />
                            </div>
                            予定を書き足す
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>

                {/* Cost & Feedback - Hide feedback if simplified */}
                <div className="space-y-8">
                   <CostEstimate input={input} itinerary={result} />
                   {showFeedback && !isSimplifiedView && (
                     <PlanFeedbackBar destination={result.destination} />
                   )}
                </div>

                {/* Booking Links */}
                {!isSimplifiedView && (
                   <div className="bg-white border-2 border-stone-200 border-dashed rounded-sm p-6 relative mt-12">
                     <Tape color="yellow" position="top-left" className="w-24 opacity-80 -rotate-12" />
                     <HandwrittenText tag="h3" className="font-bold text-xl mb-6 flex items-center gap-2">
                       <span className="text-2xl">🧳</span> この旅を予約する
                     </HandwrittenText>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <BookingLinkButton type="hotel" destination={result.destination} label="ホテルを予約" />
                       <BookingLinkButton type="flight" destination={result.destination} label="航空券を探す" />
                       <BookingLinkButton type="activity" destination={result.destination} label="体験を予約" />
                     </div>
                   </div>
                )}

                {/* Disclaimer & Chat */}
                <div className="mt-12 space-y-8">
                   <div className="bg-stone-50 p-4 rounded-sm border border-stone-200 text-xs text-stone-500 font-mono leading-relaxed">
                      <p>※このプランはAIによって生成されています。情報の正確性は保証されません。</p>
                      <p>※このページには広告・アフィリエイトリンクが含まれる場合があります。</p>
                   </div>

                   {showChat && !isSimplifiedView && (
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
            </div>
          </motion.div>
        </div>

        {/* Journal Tab */}
        {hasJournalTab && (
          <div className={activeTab === 'journal' ? 'block' : 'hidden'}>
            <ShioriJournalEditor
              days={normalizedDays ?? []}
              onSaveEntry={onSyncJournalEntry!}
            />
          </div>
        )}

        {/* Other Tabs - Hidden if simplified view */}
        {!isSimplifiedView && (
           <>
              <div className={activeTab === 'info' ? 'block' : 'hidden'}>
                 <EmbeddedTravelInfo destinations={input.destinations.length > 0 ? input.destinations : [result.destination]} onClose={() => {}} inline={true} />
              </div>
              <div className={activeTab === 'packing' ? 'block' : 'hidden'}>
                 <PackingListView destination={result.destination} days={result.days.length} themes={input.theme} companions={input.companions} budget={input.budget} region={input.region} planId={planId} packingList={packingList} onPackingListChange={handlePackingListChange} />
              </div>
           </>
        )}
      </div>
    </div>
  );
}
