'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaExternalLinkAlt,
  FaSuitcase,
  FaPlane,
  FaSync,
  FaEdit,
  FaEllipsisV,
  FaGlobe,
  FaLock,
  FaTimes,
  FaFlag,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

import type { PlanListItem } from '@/types';
import { deletePlan, updatePlanVisibility, savePlan, updatePlanName, getFlaggedPlans } from '@/app/actions/travel-planner';
import { usePlanModal } from '@/context/PlanModalContext';
import { useAuth } from '@/context/AuthContext';
import { useUserPlans } from '@/context/UserPlansContext';
import { useFlags } from '@/context/FlagsContext';
import { getLocalPlans, deleteLocalPlan } from '@/lib/local-storage/plans';
import { JournalSheet, Tape, Stamp, HandwrittenText, JournalButton } from '@/components/ui/journal';

interface MyPlansClientProps {
  initialPlans: PlanListItem[];
  totalPlans: number;
}

export default function MyPlansClient({
  initialPlans,
  totalPlans,
}: MyPlansClientProps) {
  const { openModal } = usePlanModal();
  const { isAuthenticated, isLoading } = useAuth();
  const { plans, addPlan, removePlan, updatePlan, setPlans } = useUserPlans();
  const { flaggedPlanIds, isFlagged, toggleFlag } = useFlags();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/my-plans');
    }
  }, [isLoading, isAuthenticated, router]);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [hasLocalPlans, setHasLocalPlans] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [flaggedPlans, setFlaggedPlans] = useState<PlanListItem[]>([]);
  const [isLoadingFlags, setIsLoadingFlags] = useState(false);

  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (initialPlans && initialPlans.length > 0) {
      setPlans(initialPlans);
    }
    setIsInitializing(false);
  }, [initialPlans, setPlans]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    const localPlans = getLocalPlans();
    setHasLocalPlans(localPlans.length > 0);
  }, []);

  useEffect(() => {
    if (filter === 'flagged') {
      loadFlaggedPlans();
    }
  }, [filter]);

  const loadFlaggedPlans = useCallback(async () => {
    setIsLoadingFlags(true);
    try {
      const result = await getFlaggedPlans();
      if (result.success && result.plans) {
        setFlaggedPlans(result.plans);
      }
    } catch (error) {
      console.error('Failed to load flagged plans:', error);
    } finally {
      setIsLoadingFlags(false);
    }
  }, []);

  const syncLocalPlans = useCallback(async () => {
    const localPlans = getLocalPlans();
    if (localPlans.length === 0) return;

    setIsSyncing(true);
    setSyncMessage(`${localPlans.length}件のローカルプランを同期中...`);

    let syncedCount = 0;

    for (const localPlan of localPlans) {
      try {
        const result = await savePlan(localPlan.input, localPlan.itinerary, false);
        if (result.success && result.shareCode && result.plan) {
          syncedCount++;
          deleteLocalPlan(localPlan.id);

          addPlan({
            id: result.plan.id,
            shareCode: result.plan.shareCode,
            destination: result.plan.destination,
            durationDays: result.plan.durationDays,
            thumbnailUrl: result.plan.thumbnailUrl,
            isPublic: result.plan.isPublic,
            createdAt: new Date(result.plan.createdAt),
            updatedAt: new Date(result.plan.updatedAt),
          });
        }
      } catch (error) {
        console.error('Failed to sync local plan:', error);
      }
    }

    if (syncedCount > 0) {
      setSyncMessage(`${syncedCount}件のプランを同期しました`);
    } else {
      setSyncMessage(null);
    }

    setHasLocalPlans(getLocalPlans().length > 0);
    setIsSyncing(false);

    setTimeout(() => setSyncMessage(null), 3000);
  }, []);

  const confirmDelete = (planId: string) => {
    setPlanToDelete(planId);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    setIsDeleting(planToDelete);
    setShowDeleteModal(false);

    const result = await deletePlan(planToDelete);

    if (result.success) {
      removePlan(planToDelete);
    } else {
      alert(result.error || '削除に失敗しました');
    }
    setIsDeleting(null);
    setPlanToDelete(null);
  };

  const handleToggleVisibility = async (planId: string, currentPublic: boolean) => {
    setIsUpdating(planId);
    const result = await updatePlanVisibility(planId, !currentPublic);

    if (result.success) {
      updatePlan(planId, { isPublic: !currentPublic });
    } else {
      alert(result.error || '更新に失敗しました');
    }
    setIsUpdating(null);
  };

  const handleStartRename = (planId: string, currentName: string) => {
    setIsRenaming(planId);
    setRenameValue(currentName || '');
    setOpenMenuId(null);
  };

  const handleRename = async (planId: string) => {
    if (!renameValue.trim()) {
      setIsRenaming(null);
      return;
    }

    setIsUpdating(planId);
    const result = await updatePlanName(planId, renameValue.trim());

    if (result.success) {
      updatePlan(planId, { destination: renameValue.trim() });
    } else {
      alert(result.error || '名前の変更に失敗しました');
    }

    setIsRenaming(null);
    setIsUpdating(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const handleToggleFlag = async (planId: string) => {
    await toggleFlag(planId);
    if (filter === 'flagged') {
      loadFlaggedPlans();
    }
  };

  const displayedPlans = filter === 'flagged'
    ? flaggedPlans
    : [...plans].sort((a, b) => {
        const aIsFlagged = isFlagged(a.id);
        const bIsFlagged = isFlagged(b.id);
        if (aIsFlagged && !bIsFlagged) return -1;
        if (!aIsFlagged && bIsFlagged) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="pt-24 pb-8 relative">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <Stamp color="black" size="sm" className="w-12 h-12 text-[0.6rem] border-2 rotate-6">
                   MY<br/>PLANS
                </Stamp>
                <HandwrittenText tag="h1" className="text-4xl font-bold text-stone-800">
                  マイプラン
                </HandwrittenText>
              </div>
              <p className="text-stone-500 font-hand ml-2">
                旅の記録 ({totalPlans}件)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasLocalPlans && (
                <JournalButton
                  variant="outline"
                  onClick={syncLocalPlans}
                  disabled={isSyncing}
                  className="hidden sm:flex"
                >
                  {isSyncing ? <FaSync className="animate-spin mr-2" /> : <FaSync className="mr-2" />}
                  ローカル同期
                </JournalButton>
              )}
              <JournalButton
                variant="primary"
                onClick={() => openModal()}
                className="font-bold shadow-md hover:rotate-1"
              >
                <FaPlus className="mr-2" />
                新規作成
              </JournalButton>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-8">
            <button
              onClick={() => setFilter('all')}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-sm font-bold transition-all font-hand border-b-2
                ${filter === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
                }
              `}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter('flagged')}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-sm font-bold transition-all font-hand border-b-2
                ${filter === 'flagged'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
                }
              `}
            >
              <FaFlag className="text-sm" />
              フラグ付き
            </button>
          </div>
        </div>

        {/* Sync Status */}
        {(isSyncing || syncMessage) && (
          <div className={`mb-6 p-4 rounded-sm flex items-center gap-3 border border-dashed ${
            isSyncing ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {isSyncing ? <FaSync className="animate-spin" /> : <FaSync />}
            <span className="font-hand">{syncMessage}</span>
          </div>
        )}

        {/* Plans List */}
        {isInitializing ? (
          <div className="text-center py-16">
            <FaSync className="animate-spin text-4xl text-primary mx-auto mb-4" />
            <p className="text-stone-600 font-hand">ページをめくっています...</p>
          </div>
        ) : isLoadingFlags && filter === 'flagged' ? (
          <div className="text-center py-16">
            <FaSync className="animate-spin text-4xl text-primary mx-auto mb-4" />
            <p className="text-stone-600 font-hand">お気に入りのページを探しています...</p>
          </div>
        ) : displayedPlans.length === 0 ? (
          <div className="text-center py-16 opacity-70">
            <div className="w-32 h-32 mx-auto mb-6 bg-stone-100 rounded-full border-4 border-stone-200 border-dashed flex items-center justify-center">
               <FaPlane className="text-4xl text-stone-300" />
            </div>
            <h2 className="font-hand text-xl font-bold text-stone-500 mb-2">
              まだ記録がありません
            </h2>
            <p className="text-stone-400 mb-8 font-hand text-sm">
              新しい旅の計画を立てて、ここに思い出を残しましょう
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {displayedPlans.map((plan, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={plan.id}
              >
                <JournalSheet className={`relative p-0 hover:shadow-lg transition-all group ${openMenuId === plan.id ? 'z-50' : 'z-0'}`}>
                  {/* Tape Decorations */}
                  <Tape color="white" position="top-right" rotation="right" className="opacity-70 w-24 -top-3" />

                  <div className="flex flex-col sm:flex-row">
                    {/* Thumbnail */}
                    <div className="sm:w-56 h-48 sm:h-auto relative bg-stone-100 overflow-hidden border-r border-stone-200 border-dashed">
                      {plan.thumbnailUrl ? (
                        <Image
                          src={plan.thumbnailUrl}
                          alt={plan.destination || '旅行プラン'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#fcfbf9]">
                          <FaMapMarkerAlt className="text-4xl text-stone-200" />
                        </div>
                      )}

                      {/* Visibility Badge (Stamp style) */}
                      <div className={`absolute bottom-3 left-3 px-3 py-1 border-2 font-bold text-xs transform -rotate-2 ${
                        plan.isPublic
                          ? 'border-green-600 text-green-700 bg-white/90'
                          : 'border-stone-500 text-stone-600 bg-white/90'
                      }`}>
                        {plan.isPublic ? 'PUBLIC' : 'PRIVATE'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {isRenaming === plan.id ? (
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleRename(plan.id);
                                } else if (e.key === 'Escape') {
                                  setIsRenaming(null);
                                }
                              }}
                              onBlur={() => handleRename(plan.id)}
                              className="w-full font-hand text-2xl font-bold bg-transparent border-b-2 border-primary focus:outline-none"
                              placeholder="タイトルを入力"
                            />
                          ) : (
                            <Link href={`/plan/id/${plan.id}`} className="group/link block">
                              <h3 className="font-hand text-2xl font-bold text-stone-800 group-hover/link:text-primary transition-colors mb-2">
                                {plan.destination || 'Untitled Trip'}
                              </h3>
                            </Link>
                          )}

                          <div className="flex items-center gap-4 text-sm text-stone-500 font-hand mt-2">
                            {plan.durationDays && (
                              <span className="flex items-center gap-1">
                                <FaCalendarAlt className="text-stone-400" />
                                {plan.durationDays} Days
                              </span>
                            )}
                            <span className="text-stone-300">|</span>
                            <span>Created: {formatDate(plan.createdAt)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Flag */}
                          <button
                            onClick={() => handleToggleFlag(plan.id)}
                            className={`p-2 rounded-full transition-all ${
                              isFlagged(plan.id)
                                ? 'text-amber-500'
                                : 'text-stone-300 hover:text-amber-400'
                            }`}
                          >
                            <FaFlag className="text-lg" />
                          </button>

                          {/* Menu */}
                          <div className="relative" ref={openMenuId === plan.id ? menuRef : null}>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                              className="p-2 text-stone-400 hover:text-stone-600 transition-all"
                            >
                              <FaEllipsisV />
                            </button>

                            {openMenuId === plan.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-sm shadow-xl border border-stone-200 z-50 font-hand">
                                <button
                                  onClick={() => handleStartRename(plan.id, plan.destination || '')}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                >
                                  <FaEdit /> 名前を変更
                                </button>
                                <button
                                  onClick={() => {
                                    handleToggleVisibility(plan.id, plan.isPublic);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                >
                                  {plan.isPublic ? <FaLock /> : <FaGlobe />}
                                  {plan.isPublic ? '非公開にする' : '公開する'}
                                </button>
                                <div className="border-t border-stone-100 border-dashed my-1" />
                                <button
                                  onClick={() => confirmDelete(plan.id)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <FaTrash /> 削除
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </JournalSheet>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <div onClick={(e) => e.stopPropagation()} className="max-w-sm w-full transform rotate-1">
               <JournalSheet className="relative text-center p-8">
                  <Tape color="red" position="top-center" className="w-32 -top-4 opacity-80" />
                  <div className="mb-4">
                     <FaTrash className="text-4xl text-red-400 mx-auto" />
                  </div>
                  <HandwrittenText className="text-xl font-bold text-stone-800 mb-2">
                     本当に削除しますか？
                  </HandwrittenText>
                  <p className="text-sm text-stone-500 mb-6 font-hand">
                     この操作は取り消せません。
                  </p>
                  <div className="flex gap-3">
                     <JournalButton variant="ghost" onClick={() => setShowDeleteModal(false)} className="flex-1">
                        キャンセル
                     </JournalButton>
                     <JournalButton variant="primary" onClick={handleDelete} className="flex-1 bg-red-600 border-red-800 text-white hover:bg-red-700">
                        削除する
                     </JournalButton>
                  </div>
               </JournalSheet>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
