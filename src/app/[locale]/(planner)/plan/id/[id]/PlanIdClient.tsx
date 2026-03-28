'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus } from 'react-icons/fa6';
import { useTranslations } from 'next-intl';

import type { UserInput, Itinerary, Plan } from '@/types';
import type { MapProviderType } from '@/lib/limits/config';
import type { ReplanTrigger, RecoveryOption } from '@/types/replan';
import { updatePlanItinerary, savePlanChatMessages, type ChatMessage } from '@/app/actions/travel-planner';
import { syncJournalEntry, updatePlanItemDetails } from '@/app/actions/plan-itinerary';
import { buildTripPlan, buildDefaultTravelerState, buildTripContext } from '@/lib/utils/replan-adapter';
import { usePlanRegeneration } from '@/lib/hooks';
import { useReplan } from '@/lib/hooks/useReplan';
import ResultView from '@/components/features/planner/ResultView';
import { ReplanSuggestionCard, ReplanSheet } from '@/components/features/replan';
import { PlanModal } from '@/components/common';
import { FAQSection, ExampleSection } from '@/components/features/landing';
import type { NormalizedPlanDay } from '@/types/normalized-plan';
import FullScreenGenerationOverlay from '@/components/features/planner/FullScreenGenerationOverlay';

interface PlanIdClientProps {
  plan: Plan;
  input: UserInput;
  itinerary: Itinerary;
  planId: string;
  initialChatMessages?: ChatMessage[];
  initialNormalizedDays: NormalizedPlanDay[];
  mapProvider?: MapProviderType;
}

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
  const tPlan = useTranslations("app.planner.plan");
  const tError = useTranslations("errors.ui.plan");
  const regenerateInstruction = tPlan("regenerateInstruction");
  const [result, setResult] = useState<Itinerary>(initialItinerary);
  const [input] = useState<UserInput>(initialInput);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [initialEditStep, setInitialEditStep] = useState(0);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [normalizedDays, setNormalizedDays] = useState<NormalizedPlanDay[]>(initialNormalizedDays);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const initialHistory = initialChatMessages?.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    text: message.content,
  })) ?? [];

  const mapPlanError = useCallback((code?: string | null) => {
    switch (code) {
      case "api_key_missing":
        return tError("apiKeyMissing");
      case "regenerate_no_effect":
        return tError("regenerateNoEffect");
      case "regenerate_timeout":
        return tError("regenerateTimeout");
      case "regenerate_failed":
      case "detail_generation_failed":
      case "chunk_generation_failed":
        return tError("regenerateFailed");
      default:
        return tError("regenerateFailed");
    }
  }, [tError]);

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

  const { isReplanning, result: replanResult, triggerReplan, acceptSuggestion } =
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

  const regeneration = usePlanRegeneration({
    getCurrentPlan: () => result,
    regenerateInstruction,
    initialHistory,
    mode: 'deferred',
    mapError: mapPlanError,
    onApply: async ({ itinerary, history }) => {
      setResult(itinerary);
      await savePlanToDb(itinerary);
      await saveChatToDb(history);
    },
  });

  const handleSuccessComplete = useCallback(async () => {
    await regeneration.completeSuccess();

    // Short delay for re-render, then dismiss overlay and scroll to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 600);
  }, [regeneration]);

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
    regeneration.setChatHistoryToKeep(messages);
    saveChatToDb(messages);
  }, [regeneration, saveChatToDb]);

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

  const handleSaveItemDetails = useCallback(async (input: {
    itemId: string;
    note: string | null;
    actualCost: number | null;
    actualCurrency: string;
  }) => {
    const result = await updatePlanItemDetails({
      itemId: input.itemId,
      actualCost: input.actualCost,
      actualCurrency: input.actualCurrency,
      note: input.note,
    });
    if (result.success) {
      setNormalizedDays((prev) => prev.map((day) => ({
        ...day,
        items: day.items.map((item) =>
          item.id === input.itemId
            ? { ...item, note: input.note, actual_cost: input.actualCost, actual_currency: input.actualCurrency }
            : item
        ),
      })));
    }
    return result;
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
      <FullScreenGenerationOverlay
        phase={regeneration.status === 'idle' ? null : regeneration.status}
        previewDestination={result.destination}
        onSuccessComplete={handleSuccessComplete}
      />
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip pt-24 md:pt-28">
        {regeneration.error && (
          <div className="fixed top-4 right-4 z-50 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
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
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">{regeneration.error}</p>
              </div>
              <button
                onClick={regeneration.clearError}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
          onRegenerate={regeneration.handleRegenerate}
          onResultChange={handleResultChange}
          onChatChange={handleChatChange}
          isUpdating={false}
          onEditRequest={handleEditRequest}
          initialChatHistory={regeneration.chatHistoryToKeep}
          resolvedRegeneration={regeneration.resolvedRegeneration}
          onResolvedRegenerationClear={regeneration.clearResolvedRegeneration}
          chatSessionKey={regeneration.chatSessionKey}
          shareCode={plan.shareCode}
          planId={planId}
          initialIsPublic={plan.isPublic}
          normalizedDays={normalizedDays}
          onSyncJournalEntry={handleSyncJournalEntry}
          onSaveItemDetails={handleSaveItemDetails}
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
            <span className="relative z-10">{tPlan("createNewPlan")}</span>
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
