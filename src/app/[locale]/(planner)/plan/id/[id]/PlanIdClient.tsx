'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus } from 'react-icons/fa6';

import type { UserInput, Itinerary, Plan } from '@/types';
import type { MapProviderType } from '@/lib/limits/config';
import type { ReplanTrigger, RecoveryOption } from '@/types/replan';
import { regeneratePlan, updatePlanItinerary, savePlanChatMessages, type ChatMessage } from '@/app/actions/travel-planner';
import { syncJournalEntry } from '@/app/actions/plan-itinerary';
import { buildTripPlan, buildDefaultTravelerState, buildTripContext } from '@/lib/utils/replan-adapter';
import { useReplan } from '@/lib/hooks/useReplan';
import ResultView from '@/components/features/planner/ResultView';
import { ReplanSuggestionCard, ReplanSheet } from '@/components/features/replan';
import { PlanModal } from '@/components/common';
import { FAQSection, ExampleSection } from '@/components/features/landing';
import type { NormalizedPlanDay } from '@/types/normalized-plan';

interface PlanIdClientProps {
  plan: Plan;
  input: UserInput;
  itinerary: Itinerary;
  planId: string;
  initialChatMessages?: ChatMessage[];
  initialNormalizedDays: NormalizedPlanDay[];
  mapProvider?: MapProviderType;
}

const REGENERATE_INSTRUCTION_TEXT =
  "この会話で合意した変更内容を現在のプランに反映して再生成してください。";

export default function PlanIdClient({
  plan,
  input: initialInput,
  itinerary: initialItinerary,
  planId,
  initialChatMessages,
  initialNormalizedDays,
  mapProvider = "static",
}: PlanIdClientProps) {
  const router = useRouter();
  const [result, setResult] = useState<Itinerary>(initialItinerary);
  const [input] = useState<UserInput>(initialInput);
  const [status, setStatus] = useState<'idle' | 'regenerating' | 'saving'>('idle');
  const [chatHistoryToKeep, setChatHistoryToKeep] = useState<
    { role: string; text: string }[]
  >(initialChatMessages?.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content })) || []);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [initialEditStep, setInitialEditStep] = useState(0);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [normalizedDays, setNormalizedDays] = useState<NormalizedPlanDay[]>(initialNormalizedDays);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Replan integration
  const tripPlan = useMemo(() => buildTripPlan(result, input), [result, input]);
  const tripContext = useMemo(() => buildTripContext(result, input), [result, input]);
  const [travelerState, setTravelerState] = useState(() => buildDefaultTravelerState('rain'));

  // Track if save is pending to debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save plan to DB (user is owner since they accessed by ID)
  const savePlanToDb = useCallback(async (itinerary: Itinerary) => {
    try {
      const result = await updatePlanItinerary(planId, itinerary, input);
      if (!result.success) {
        console.error('Failed to save plan:', result.error);
      }
    } catch (e) {
      console.error('Failed to save plan:', e);
    }
  }, [planId, input]);

  // Replan apply: merge recovery option into itinerary and save
  const handleReplanApply = useCallback((newItinerary: Itinerary) => {
    setResult(newItinerary);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      savePlanToDb(newItinerary);
    }, 1000);
  }, [savePlanToDb]);

  const { isReplanning, result: replanResult, triggerReplan, acceptSuggestion, dismissSuggestion } =
    useReplan(tripPlan, travelerState, tripContext, { onApply: handleReplanApply });

  const handleReplanTrigger = useCallback((trigger: ReplanTrigger) => {
    setTravelerState(buildDefaultTravelerState(trigger.type));
    triggerReplan(trigger);
  }, [triggerReplan]);

  const handleAcceptSuggestion = useCallback((option: RecoveryOption) => {
    acceptSuggestion(option);
    setShowAlternatives(false);
  }, [acceptSuggestion]);

  // Save chat messages to DB
  const saveChatToDb = useCallback(async (messages: { role: string; text: string }[]) => {
    try {
      const chatMessages: ChatMessage[] = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      }));
      const result = await savePlanChatMessages(planId, chatMessages);
      if (!result.success) {
        console.error('Failed to save chat:', result.error);
      }
    } catch (e) {
      console.error('Failed to save chat:', e);
    }
  }, [planId]);

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[],
    overridePlan?: Itinerary
  ) => {
    const planToUse = overridePlan || result;
    if (!planToUse || !input) return;
    const persistedHistory =
      chatHistory.length > 0 &&
      chatHistory[chatHistory.length - 1]?.role === "user" &&
      chatHistory[chatHistory.length - 1]?.text === REGENERATE_INSTRUCTION_TEXT
        ? chatHistory.slice(0, -1)
        : chatHistory;

    setRegenerateError(null);
    setChatHistoryToKeep(persistedHistory);
    setStatus('regenerating');

    try {
      const response = await regeneratePlan(planToUse, chatHistory);
      if (response.success && response.data) {
        setResult(response.data);
        setStatus('idle');

        // Save to DB
        await savePlanToDb(response.data);
        await saveChatToDb(persistedHistory);

        // Scroll to top
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        console.error(response.message);
        setRegenerateError(response.message || '再生成に失敗しました。時間をおいて再試行してください。');
        setStatus('idle');
      }
    } catch (e) {
      console.error(e);
      setRegenerateError('再生成中にエラーが発生しました。時間をおいて再試行してください。');
      setStatus('idle');
    }
  };

  const handleRestart = () => {
    router.push('/');
  };

  const handleResultChange = useCallback((newResult: Itinerary) => {
    setResult(newResult);

    // Debounce save to DB
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePlanToDb(newResult);
    }, 1000); // Save 1 second after last change
  }, [savePlanToDb]);

  // Save chat messages when they change
  const handleChatChange = useCallback((messages: { role: string; text: string }[]) => {
    setChatHistoryToKeep(messages);
    saveChatToDb(messages);
  }, [saveChatToDb]);

  const handleEditRequest = (stepIndex: number) => {
    setInitialEditStep(stepIndex);
    setIsEditingRequest(true);
  };

  const handleSyncJournalEntry = useCallback(async (input: {
    itemId: string;
    content: string;
    phase: 'before' | 'during' | 'after';
    placeName: string | null;
    photoUrls: string[];
  }) => {
    const editedAt = new Date().toISOString();
    const result = await syncJournalEntry({
      itemId: input.itemId,
      planId,
      content: input.content,
      editedAt,
      phase: input.phase,
      placeName: input.placeName,
      photoUrls: input.photoUrls,
      visibility: 'public',
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    setNormalizedDays((prevDays) =>
      prevDays.map((day) => ({
        ...day,
        items: day.items.map((item) => (
          item.id === input.itemId
            ? {
              ...item,
              journal: {
                id: item.journal?.id ?? `draft-${item.id}`,
                content: input.content,
                phase: input.phase,
                place_name: input.placeName,
                photo_urls: input.photoUrls,
                visibility: 'public',
                updated_at: editedAt,
              },
            }
            : item
        )),
      }))
    );

    return { success: true, updatedAt: editedAt };
  }, [planId]);

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip pt-24 md:pt-28">
        {regenerateError && (
          <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 text-sm font-medium">{regenerateError}</p>
              </div>
              <button
                onClick={() => setRegenerateError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <ResultView
          result={result}
          input={input}
          onRestart={handleRestart}
          onRegenerate={handleRegenerate}
          onResultChange={handleResultChange}
          onChatChange={handleChatChange}
          isUpdating={status === 'regenerating'}
          onEditRequest={handleEditRequest}
          initialChatHistory={chatHistoryToKeep}
          shareCode={plan.shareCode}
          planId={planId}
          initialIsPublic={plan.isPublic}
          normalizedDays={normalizedDays}
          onSyncJournalEntry={handleSyncJournalEntry}
          mapProvider={mapProvider}
          showReplanTriggers={true}
          onReplanTrigger={handleReplanTrigger}
          isReplanning={isReplanning}
        />

        {/* Replan Suggestion */}
        {replanResult && (
          <div className="fixed bottom-4 left-4 right-4 z-30 max-w-lg mx-auto">
            <ReplanSuggestionCard
              option={replanResult.primaryOption}
              onAccept={handleAcceptSuggestion}
              onShowAlternatives={() => setShowAlternatives(true)}
              hasAlternatives={replanResult.alternatives.length > 0}
            />
          </div>
        )}
        <ReplanSheet
          isOpen={showAlternatives}
          alternatives={replanResult?.alternatives ?? []}
          onSelect={(option) => { handleAcceptSuggestion(option); setShowAlternatives(false); }}
          onClose={() => setShowAlternatives(false)}
        />

        {/* Request Editing Modal */}
        <PlanModal
          isOpen={isEditingRequest}
          onClose={() => setIsEditingRequest(false)}
          initialInput={input}
          initialStep={initialEditStep}
        />

        {/* Call to Action - Create New Plan */}
        <div className="w-full flex justify-center pb-16 pt-8">
          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-primary font-serif rounded-full hover:bg-primary/90 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <FaPlus className="mr-2 relative z-10" />
            <span className="relative z-10">新しいプランを作る</span>
          </button>
        </div>

        <ExampleSection />
        <FAQSection limit={5} />

        {/* New Plan Modal */}
        <PlanModal
          isOpen={isNewPlanModalOpen}
          onClose={() => setIsNewPlanModalOpen(false)}
          initialInput={null}
          initialStep={0}
        />
      </main>
    </div>
  );
}
