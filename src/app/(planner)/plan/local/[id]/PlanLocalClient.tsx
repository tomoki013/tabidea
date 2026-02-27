'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa6';

import type { UserInput, Itinerary, LocalPlan } from '@/types';
import { regeneratePlan, savePlan } from '@/app/actions/travel-planner';
import { getLocalPlans, updateLocalPlan, deleteLocalPlan } from '@/lib/local-storage/plans';
import { useAuth } from '@/context/AuthContext';
import ResultView from '@/components/features/planner/ResultView';
import { PlanModal } from '@/components/common';
import { FAQSection, ExampleSection } from '@/components/features/landing';
import { restorePendingState, clearPendingState } from '@/lib/restore/pending-state';

interface PlanLocalClientProps {
  localId: string;
}

export default function PlanLocalClient({ localId }: PlanLocalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // 復元パラメータをチェック
  const shouldRestore = searchParams.get('restore') === 'true';
  const shouldAutoSave = searchParams.get('autoSave') === 'true';

  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [result, setResult] = useState<Itinerary | null>(null);
  const [input, setInput] = useState<UserInput | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'regenerating' | 'syncing' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [chatHistoryToKeep, setChatHistoryToKeep] = useState<{ role: string; text: string }[]>([]);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [initialEditStep, setInitialEditStep] = useState(0);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);

  const cleanupUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('restore');
    url.searchParams.delete('autoSave');
    window.history.replaceState({}, '', url.toString());
  };

  // 自動保存処理
  const handleAutoSave = useCallback(async (restoredInput: UserInput, restoredItinerary: Itinerary) => {
    setStatus('syncing');

    try {
      const saveResult = await savePlan(restoredInput, restoredItinerary, false);

      if (saveResult.success && saveResult.plan) {
        // ローカルプランを削除
        await deleteLocalPlan(localId);

        // 保存成功 → /plan/id/[id] へリダイレクト
        router.replace(`/plan/id/${saveResult.plan.id}`);
      } else {
        setAutoSaveError(saveResult.error || '保存に失敗しました');
        setStatus('idle');
        cleanupUrl();
      }
    } catch (error) {
      setAutoSaveError('保存中にエラーが発生しました');
      setStatus('idle');
      cleanupUrl();
    }
  }, [localId, router]);

  // Load plan from local storage & 復元＆自動保存処理
  useEffect(() => {
    const plans = getLocalPlans();
    const foundPlan = plans.find(p => p.id === localId);

    if (!foundPlan) {
      queueMicrotask(() => {
        setError('プランが見つかりませんでした。');
        setStatus('error');
      });
      return;
    }

    queueMicrotask(() => {
      setPlan(foundPlan);
      setInput(foundPlan.input);
      setResult(foundPlan.itinerary);
      setStatus('idle');
    });

    // 復元フラグがある場合
    if (shouldRestore) {
      const restoreResult = restorePendingState();

      if (restoreResult.expired) {
        queueMicrotask(() => {
          setAutoSaveError('保存から24時間以上経過したため、自動保存できませんでした。');
        });
        clearPendingState();
        cleanupUrl();
        return;
      }

      // 自動保存
      if (shouldAutoSave && restoreResult.success && restoreResult.data?.itinerary) {
        const { userInput: restoredInput, itinerary: restoredItinerary } = restoreResult.data;
        queueMicrotask(() => handleAutoSave(restoredInput, restoredItinerary));
      } else {
        cleanupUrl();
      }

      clearPendingState();
    }
  }, [localId, shouldRestore, shouldAutoSave, handleAutoSave]);

  // Auto-sync to database when user logs in
  const syncToDatabase = useCallback(async () => {
    if (!plan || !input || !result) return;

    setStatus('syncing');

    try {
      const saveResult = await savePlan(input, result, false);

      if (saveResult.success && saveResult.plan) {
        // Delete from local storage after successful sync
        deleteLocalPlan(plan.id);
        // Redirect to the new plan id URL
        router.replace(`/plan/id/${saveResult.plan.id}`);
      } else {
        console.error('Failed to sync to database:', saveResult.error);
        setStatus('idle');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setStatus('idle');
    }
  }, [plan, input, result, router]);

  // When user becomes authenticated, sync to database
  useEffect(() => {
    if (!authLoading && isAuthenticated && plan && status === 'idle') {
      queueMicrotask(() => syncToDatabase());
    }
  }, [authLoading, isAuthenticated, plan, status, syncToDatabase]);

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

        // Update local storage
        if (plan) {
          updateLocalPlan(plan.id, { itinerary: response.data });
        }

        setStatus('idle');

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

  const handleResultChange = (newResult: Itinerary) => {
    setResult(newResult);

    // Update local storage
    if (plan) {
      updateLocalPlan(plan.id, { itinerary: newResult });
    }
  };

  const handleEditRequest = (stepIndex: number) => {
    setInitialEditStep(stepIndex);
    setIsEditingRequest(true);
  };

  if (status === 'loading' || (authLoading && !plan)) {
    return (
      <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
        <main className="flex-1 w-full flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </main>
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
        <main className="flex-1 w-full flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <p className="text-stone-600">プランをアカウントに保存しています...</p>
        </main>
      </div>
    );
  }

  if (status === 'error' || !result || !input) {
    return (
      <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
        <main className="flex-1 w-full flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-destructive font-medium text-lg">
            {error || 'プランが見つかりませんでした'}
          </p>
          <p className="text-stone-500 text-sm">
            ローカルに保存されたプランが見つからないか、削除された可能性があります。
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
          >
            新しいプランを作成
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip">
        {/* エラー表示 */}
        {autoSaveError && (
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
                <p className="text-red-800 text-sm font-medium">{autoSaveError}</p>
              </div>
              <button
                onClick={() => setAutoSaveError(null)}
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

        {/* Title Section */}
        <div className="w-full pt-32 pb-8 text-center px-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-block mb-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
            Result
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 tracking-tight">
            旅行プラン結果
          </h1>
          <p className="text-stone-500 mt-3 font-hand text-lg">
            {result.destination
              ? `${result.destination}への旅のしおり`
              : 'あなただけの特別な旅のしおりが完成しました'}
          </p>
          {!isAuthenticated && (
            <p className="text-amber-600 text-sm mt-4 bg-amber-50 inline-block px-4 py-2 rounded-full">
              ログインするとプランが自動的にアカウントに保存されます
            </p>
          )}
        </div>

        <ResultView
          result={result}
          input={input}
          onRestart={handleRestart}
          onRegenerate={handleRegenerate}
          onResultChange={handleResultChange}
          isUpdating={status === 'regenerating'}
          onEditRequest={handleEditRequest}
          initialChatHistory={chatHistoryToKeep}
          localId={localId}
          mapProvider="static"
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
