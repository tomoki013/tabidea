'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SyncSelectionModal } from '@/components/ui/SyncSelectionModal';
import {
  getLocalPlans,
  syncLocalPlansSelectively,
  checkSyncCapacity,
} from '@/lib/local-storage/plans';
import { checkPlanStorageLimit } from '@/lib/limits/check';
import { savePlan } from '@/app/actions/travel-planner';
import { createClient } from '@/lib/supabase/client';

function SyncPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localPlans, setLocalPlans] = useState<
    Array<{ id: string; destination: string; createdAt: string }>
  >([]);
  const [availableSlots, setAvailableSlots] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const plans = getLocalPlans();

        if (plans.length === 0) {
          // No plans to sync, redirect to home
          router.replace('/');
          return;
        }

        // Get user's plan count and storage limit
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Not logged in, redirect to login
          router.replace('/login');
          return;
        }

        const { data: dbCount } = await supabase.rpc('count_user_plans', {
          p_user_id: user.id,
        });

        const storageStatus = await checkPlanStorageLimit();

        const available =
          storageStatus.limit === -1
            ? plans.length
            : Math.max(0, storageStatus.limit - (dbCount || 0));

        setLocalPlans(
          plans.map((p) => ({
            id: p.id,
            destination: p.itinerary.destination || '未設定',
            createdAt: p.createdAt,
          }))
        );
        setAvailableSlots(available);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize sync page:', err);
        setError('同期の準備中にエラーが発生しました');
        setIsLoading(false);
      }
    }
    init();
  }, [router]);

  const handleConfirm = async (
    selectedIds: string[],
    deleteUnselected: boolean
  ) => {
    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncLocalPlansSelectively(
        async (input, itinerary) => {
          const saveResult = await savePlan(input, itinerary, false);
          return saveResult;
        },
        {
          planIdsToSync: selectedIds,
          unsyncedAction: deleteUnselected ? 'delete' : 'keep_local',
        }
      );

      if (result.success) {
        // Sync successful, redirect to dashboard
        router.push('/dashboard?sync=success');
      } else {
        setError(
          result.errors.length > 0
            ? result.errors[0]
            : '同期中にエラーが発生しました'
        );
        setIsSyncing(false);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError('同期中にエラーが発生しました');
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <p className="text-stone-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">😢</div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">
              エラーが発生しました
            </h2>
            <p className="text-stone-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
            >
              ダッシュボードへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <SyncSelectionModal
        isOpen={!isSyncing}
        onClose={() => router.push('/dashboard')}
        localPlans={localPlans}
        availableSlots={availableSlots}
        onConfirm={handleConfirm}
      />

      {isSyncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <p className="text-stone-800 font-medium">同期中...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SyncPlansPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <SyncPlansContent />
    </Suspense>
  );
}
