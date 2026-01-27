'use client';

import { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaCheck, FaTimes, FaSpinner, FaPlane } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Show success message as a simpler toast/modal
  if (syncResult?.success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      >
        <div className="bg-[#fcfbf9] border-2 border-dashed border-[#27ae60]/40 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 pointer-events-auto flex items-center gap-4">
          <div className="p-4 bg-[#27ae60]/10 rounded-full">
            <FaCheck className="text-[#27ae60] text-xl" />
          </div>
          <div>
            <p className="font-serif font-bold text-[#27ae60] text-lg">同期完了</p>
            <p className="text-stone-600">
              {syncResult.syncedCount}件のプランを保存しました
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show sync prompt as a centered modal
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-md bg-[#fcfbf9] border-2 border-dashed border-[#e67e22]/30 rounded-3xl p-6 shadow-2xl"
        >
          {/* Corner decorations */}
          <div className="absolute -top-2 -left-2 w-8 h-8 bg-[#e67e22]/20 rotate-45 rounded-sm" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#27ae60]/20 -rotate-45 rounded-sm" />

          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <FaTimes size={16} />
          </button>

          <div className="flex flex-col items-center text-center pt-2">
            <div className="p-4 bg-[#e67e22]/10 rounded-full mb-4">
              <FaCloudUploadAlt className="text-[#e67e22] text-3xl" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-stone-800 mb-2">
              プランを同期しますか？
            </h3>

            <p className="text-stone-600 mb-6 flex flex-col items-center justify-center gap-1">
              <span>お使いのブラウザに保存されている</span>
              <span className="font-bold flex items-center gap-1 text-stone-800 bg-[#e67e22]/10 px-2 py-0.5 rounded-full">
                <FaPlane className="text-[#e67e22]" />
                {localPlansCount}件のプラン
              </span>
              <span>をアカウントに保存します。</span>
            </p>

            {syncResult && !syncResult.success && (
              <div className="mb-6 p-3 bg-red-50 border border-dashed border-red-200 rounded-xl text-sm text-red-600 w-full">
                一部のプランの同期に失敗しました
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#e67e22] text-white rounded-xl text-base font-bold hover:bg-[#d35400] disabled:opacity-50 transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
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
                className="w-full sm:w-auto px-6 py-3.5 text-stone-500 hover:text-[#e67e22] hover:bg-stone-50 rounded-xl text-base font-medium transition-colors"
              >
                後で
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
