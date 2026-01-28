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
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

import type { PlanListItem } from '@/types';
import { deletePlan, updatePlanVisibility, savePlan, updatePlanName } from '@/app/actions/travel-planner';
import { usePlanModal } from '@/context/PlanModalContext';
import { useAuth } from '@/context/AuthContext';
import { useUserPlans } from '@/context/UserPlansContext';
import { getLocalPlans, deleteLocalPlan } from '@/lib/local-storage/plans';

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

  // Rename functionality
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Menu state for mobile actions
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // Hydrate context with initial plans on mount
  useEffect(() => {
    if (initialPlans && initialPlans.length > 0) {
      setPlans(initialPlans);
    }
  }, [initialPlans, setPlans]);

  // Focus rename input when opening
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Close menu when clicking outside
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

  // Check local plans on mount
  useEffect(() => {
    const localPlans = getLocalPlans();
    setHasLocalPlans(localPlans.length > 0);
  }, []);

  // Sync local plans to database
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

          // Add to plans list via context
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

    // Refresh local plans count
    setHasLocalPlans(getLocalPlans().length > 0);
    setIsSyncing(false);

    // Clear message after 3 seconds
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

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="pt-24 pb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#e67e22]/10 rounded-full">
                  <FaSuitcase className="text-[#e67e22]" />
                </div>
                <h1 className="font-serif text-3xl font-bold text-stone-800">
                  マイプラン
                </h1>
              </div>
              <p className="text-stone-500 ml-12">
                保存した旅行プラン ({totalPlans}件)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasLocalPlans && (
                <button
                  onClick={syncLocalPlans}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-3 text-[#e67e22] bg-[#e67e22]/10 rounded-full font-bold hover:bg-[#e67e22]/20 transition-all disabled:opacity-50"
                >
                  {isSyncing ? <FaSync className="animate-spin" /> : <FaSync />}
                  <span className="hidden sm:inline">ローカルプランを同期</span>
                </button>
              )}
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-6 py-3 bg-[#e67e22] text-white rounded-full font-bold hover:bg-[#d35400] transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              >
                <FaPlus />
                <span>新規作成</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sync Status */}
        {(isSyncing || syncMessage) && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            isSyncing ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
          }`}>
            {isSyncing ? (
              <FaSync className="animate-spin" />
            ) : (
              <FaSync />
            )}
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Plans List */}
        {plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative inline-block">
              {/* Decorative background */}
              <div className="absolute inset-0 bg-[#e67e22]/5 rounded-full scale-150" />
              <div className="relative p-8 bg-[#fcfbf9] rounded-full border-2 border-dashed border-[#e67e22]/30 mb-6">
                <FaPlane className="text-6xl text-[#e67e22]/30" />
              </div>
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-600 mb-2">
              プランがありません
            </h2>
            <p className="text-stone-500 mb-8 font-hand">
              新しい旅行プランを作成して、ここに保存しましょう
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#e67e22] text-white rounded-full font-bold hover:bg-[#d35400] transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
            >
              <FaPlus />
              <span>プランを作成する</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-[#fcfbf9] rounded-2xl border-2 border-dashed border-stone-200 hover:border-[#e67e22]/40 hover:shadow-lg transition-all group ${
                  openMenuId === plan.id ? 'z-50' : 'z-0'
                }`}
              >
                {/* Corner tape decorations - clipped by this inner container */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-10">
                  <div className="absolute top-0 left-0 w-6 h-6 bg-[#e67e22]/15 rotate-45 -translate-x-3 -translate-y-3" />
                  <div className="absolute top-0 right-0 w-6 h-6 bg-[#27ae60]/15 -rotate-45 translate-x-3 -translate-y-3" />
                </div>

                <div className="flex flex-col sm:flex-row relative z-0">
                  {/* Thumbnail */}
                  <div className="sm:w-48 h-36 sm:h-auto relative bg-stone-100 overflow-hidden rounded-t-2xl sm:rounded-tr-none sm:rounded-l-2xl">
                    {plan.thumbnailUrl ? (
                      <Image
                        src={plan.thumbnailUrl}
                        alt={plan.destination || '旅行プラン'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e67e22]/5 to-[#27ae60]/5">
                        <FaMapMarkerAlt className="text-4xl text-[#e67e22]/30" />
                      </div>
                    )}
                    {/* Visibility badge */}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      plan.isPublic
                        ? 'bg-[#27ae60]/90 text-white'
                        : 'bg-stone-700/90 text-white'
                    }`}>
                      {plan.isPublic ? <FaEye className="text-[10px]" /> : <FaEyeSlash className="text-[10px]" />}
                      {plan.isPublic ? '公開' : '非公開'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {isRenaming === plan.id ? (
                          <div className="flex items-center gap-2">
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
                              className="flex-1 font-serif text-lg font-bold text-stone-800 bg-white border-2 border-[#e67e22] rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50"
                              disabled={isUpdating === plan.id}
                              placeholder="プラン名を入力"
                            />
                          </div>
                        ) : (
                          <Link
                            href={`/plan/${plan.shareCode}`}
                            className="group/link"
                          >
                            <h3 className="font-serif text-lg font-bold text-stone-800 group-hover/link:text-[#e67e22] transition-colors flex items-center gap-2">
                              {plan.destination || '目的地未設定'}
                              <FaExternalLinkAlt className="text-xs opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </h3>
                          </Link>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-stone-500">
                          {plan.durationDays && (
                            <span className="flex items-center gap-1.5 bg-[#e67e22]/5 px-2.5 py-1 rounded-full">
                              <FaCalendarAlt className="text-[#e67e22]/60 text-xs" />
                              {plan.durationDays}日間
                            </span>
                          )}
                          {/* Improved visibility indicator */}
                          <button
                            onClick={() => handleToggleVisibility(plan.id, plan.isPublic)}
                            disabled={isUpdating === plan.id}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-50 ${
                              plan.isPublic
                                ? 'bg-[#27ae60]/10 text-[#27ae60] hover:bg-[#27ae60]/20'
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                            title={plan.isPublic ? 'クリックで非公開にする' : 'クリックで公開する'}
                          >
                            {plan.isPublic ? (
                              <>
                                <FaGlobe className="text-[10px]" />
                                公開中
                              </>
                            ) : (
                              <>
                                <FaLock className="text-[10px]" />
                                非公開
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-stone-400 mt-3 font-hand">
                          作成日: {formatDate(plan.createdAt)}
                        </p>
                      </div>

                      {/* Actions - Three dot menu */}
                      <div className="relative" ref={openMenuId === plan.id ? menuRef : null}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === plan.id ? null : plan.id)}
                          className="p-2.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all"
                          title="メニュー"
                        >
                          <FaEllipsisV />
                        </button>

                        {/* Dropdown menu */}
                        {openMenuId === plan.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50">
                            <button
                              onClick={() => handleStartRename(plan.id, plan.destination || '')}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                            >
                              <FaEdit className="text-stone-400" />
                              名前を変更
                            </button>
                            <button
                              onClick={() => {
                                handleToggleVisibility(plan.id, plan.isPublic);
                                setOpenMenuId(null);
                              }}
                              disabled={isUpdating === plan.id}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                            >
                              {plan.isPublic ? (
                                <>
                                  <FaLock className="text-stone-400" />
                                  非公開にする
                                </>
                              ) : (
                                <>
                                  <FaGlobe className="text-stone-400" />
                                  公開する
                                </>
                              )}
                            </button>
                            <hr className="my-2 border-stone-100" />
                            <button
                              onClick={() => {
                                confirmDelete(plan.id);
                              }}
                              disabled={isDeleting === plan.id}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <FaTrash className="text-red-400" />
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Plan Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <FaTimes />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-red-100 rounded-full mb-4">
                  <FaTrash className="text-red-500 text-2xl" />
                </div>

                <h3 className="font-serif text-xl font-bold text-stone-800 mb-2">
                  プランを削除しますか？
                </h3>

                <p className="text-sm text-stone-600 mb-6">
                  この操作は取り消すことができません。<br/>
                  本当にこのプランを削除しますか？
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                  >
                    削除する
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
