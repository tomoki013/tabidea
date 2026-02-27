'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus } from 'react-icons/fa6';

import type { UserInput, Itinerary, Plan } from '@/types';
import type { MapProviderType } from '@/lib/limits/config';
import { regeneratePlan, updatePlanItinerary, savePlanChatMessages, type ChatMessage } from '@/app/actions/travel-planner';
import { syncJournalEntry } from '@/app/actions/plan-itinerary';
import ResultView from '@/components/features/planner/ResultView';
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

    setChatHistoryToKeep(chatHistory);
    setStatus('regenerating');

    try {
      const response = await regeneratePlan(planToUse, chatHistory);
      if (response.success && response.data) {
        setResult(response.data);
        setStatus('idle');

        // Save to DB
        await savePlanToDb(response.data);
        await saveChatToDb(chatHistory);

        // Scroll to top
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        console.error(response.message);
        setStatus('idle');
      }
    } catch (e) {
      console.error(e);
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
