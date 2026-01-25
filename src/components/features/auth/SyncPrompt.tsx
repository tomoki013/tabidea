'use client';

import { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaCheck, FaTimes, FaSpinner, FaPlane } from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';
import { getLocalPlans, syncLocalPlansToServer } from '@/lib/local-storage/plans';
import { savePlan, getUserPlansCount } from '@/app/actions/travel-planner';
import type { SyncResult } from '@/types';

interface SyncPromptProps {
  onSyncComplete?: (result: SyncResult) => void;
}

export function SyncPrompt({ onSyncComplete }: SyncPromptProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [hasLocalPlans, setHasLocalPlans] = useState(false);
  const [localPlansCount, setLocalPlansCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check for local plans when auth state changes
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const localPlans = getLocalPlans();
      setHasLocalPlans(localPlans.length > 0);
      setLocalPlansCount(localPlans.length);
    }
  }, [isAuthenticated, authLoading]);

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      const result = await syncLocalPlansToServer(
        async (input, itinerary) => {
          const saveResult = await savePlan(input, itinerary, false);
          return {
            success: saveResult.success,
            shareCode: saveResult.shareCode,
            error: saveResult.error,
          };
        },
        getUserPlansCount
      );

      setSyncResult(result);
      onSyncComplete?.(result);

      // Auto-dismiss after successful sync
      if (result.success) {
        setTimeout(() => {
          setIsDismissed(true);
        }, 3000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult({
        success: false,
        syncedCount: 0,
        failedCount: localPlansCount,
        skippedCount: 0,
        errors: ['同期中にエラーが発生しました'],
        mergeInfo: {
          existingPlansCount: 0,
          newPlansAdded: 0,
        },
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Don't show if not authenticated, no local plans, or dismissed
  if (authLoading || !isAuthenticated || !hasLocalPlans || isDismissed) {
    return null;
  }

  // Show success message
  if (syncResult?.success) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-[#fcfbf9] border-2 border-dashed border-[#27ae60]/40 rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom-4">
        {/* Corner decoration */}
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#27ae60]/20 rotate-45 rounded-sm" />

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#27ae60]/10 rounded-full">
            <FaCheck className="text-[#27ae60]" />
          </div>
          <div>
            <p className="font-serif font-bold text-[#27ae60]">同期完了</p>
            <p className="text-sm text-stone-600">
              {syncResult.syncedCount}件のプランを保存しました
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show sync prompt
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-[#fcfbf9] border-2 border-dashed border-[#e67e22]/30 rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom-4">
      {/* Corner decorations */}
      <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#e67e22]/20 rotate-45 rounded-sm" />
      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#27ae60]/20 -rotate-45 rounded-sm" />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
        aria-label="閉じる"
      >
        <FaTimes size={12} />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-3 bg-[#e67e22]/10 rounded-full">
          <FaCloudUploadAlt className="text-[#e67e22]" />
        </div>
        <div className="flex-1">
          <p className="font-serif font-bold text-stone-800 pr-6">
            ローカルのプランを同期
          </p>
          <p className="text-sm text-stone-600 mt-1 mb-3 flex items-center gap-1">
            <FaPlane className="text-[#e67e22]/50 text-xs" />
            {localPlansCount}件のプランをクラウドに保存しますか？
          </p>

          {syncResult && !syncResult.success && (
            <div className="mb-3 p-2 bg-red-50 border border-dashed border-red-200 rounded-lg text-xs text-red-600">
              一部のプランの同期に失敗しました
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#e67e22] text-white rounded-full text-sm font-bold hover:bg-[#d35400] disabled:opacity-50 transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              {isSyncing ? (
                <>
                  <FaSpinner className="animate-spin" />
                  同期中...
                </>
              ) : (
                <>
                  <FaCloudUploadAlt />
                  同期する
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              disabled={isSyncing}
              className="px-4 py-2.5 text-stone-500 hover:text-[#e67e22] text-sm font-medium transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
