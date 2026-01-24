'use client';

import { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';

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
      <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <FaCheck className="text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">同期完了</p>
            <p className="text-sm text-green-600">
              {syncResult.syncedCount}件のプランを保存しました
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show sync prompt
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white border border-stone-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-stone-400 hover:text-stone-600"
        aria-label="閉じる"
      >
        <FaTimes size={12} />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <FaCloudUploadAlt className="text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-stone-800 pr-4">
            ローカルのプランを同期
          </p>
          <p className="text-sm text-stone-600 mt-1 mb-3">
            {localPlansCount}件のプランをクラウドに保存しますか？
          </p>

          {syncResult && !syncResult.success && (
            <div className="mb-3 p-2 bg-red-50 rounded text-xs text-red-600">
              一部のプランの同期に失敗しました
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
              className="px-4 py-2 text-stone-600 hover:text-stone-800 text-sm"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
