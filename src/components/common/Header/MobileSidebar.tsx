'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTimes,
  FaHome,
  FaMap,
  FaQuestionCircle,
  FaPen,
  FaMapMarkerAlt,
  FaSuitcase,
  FaPlane,
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCrown,
  FaCog,
} from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';
import { usePlanModal } from '@/context/PlanModalContext';
import { useLocalPlans } from '@/lib/local-storage/plans';
import { useUserPlans } from '@/context/UserPlansContext';
import { deletePlan, updatePlanName } from '@/app/actions/travel-planner';
import { getBillingStatus } from '@/app/actions/billing';
import type { PlanListItem } from '@/types';
import type { UserBillingStatus } from '@/types/billing';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export default function MobileSidebar({
  isOpen,
  onClose,
  onOpenSettings,
}: MobileSidebarProps) {
  const { isAuthenticated, user } = useAuth();
  const { openModal } = usePlanModal();
  const { plans: localPlans, deletePlan: deleteLocalPlan } = useLocalPlans();
  const { plans: serverPlans, isLoading: isServerPlansLoading, removePlan, updatePlan } = useUserPlans();

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [isLocalDelete, setIsLocalDelete] = useState(false);

  // Billing status state
  const [billingStatus, setBillingStatus] = useState<UserBillingStatus | null>(null);

  // Fetch billing status when authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      getBillingStatus().then(setBillingStatus);
    }
  }, [isAuthenticated, isOpen]);

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

  // Focus rename input when opening
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleMenuToggle = (planId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === planId ? null : planId);
  };

  const handleStartRename = (planId: string, currentName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRenaming(planId);
    setRenameValue(currentName || '');
    setOpenMenuId(null);
  };

  const handleRename = async (planId: string, isLocal: boolean) => {
    if (!renameValue.trim() || isUpdating) return;

    setIsUpdating(true);

    if (isLocal) {
      // For local plans, we would need to update the itinerary destination
      // This is more complex, so for now we'll just close the modal
      setIsRenaming(null);
      setIsUpdating(false);
      return;
    }

    const result = await updatePlanName(planId, renameValue.trim());

    if (result.success) {
      updatePlan(planId, { destination: renameValue.trim() });
    } else {
      alert(result.error || '名前の変更に失敗しました');
    }

    setIsRenaming(null);
    setIsUpdating(false);
  };

  const handleDeleteClick = (planId: string, isLocal: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);

    setPlanToDelete(planId);
    setIsLocalDelete(isLocal);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!planToDelete) return;

    setIsDeleting(planToDelete);
    setShowDeleteModal(false);

    if (isLocalDelete) {
      deleteLocalPlan(planToDelete);
    } else {
      const result = await deletePlan(planToDelete);
      if (result.success) {
        removePlan(planToDelete);
      } else {
        alert(result.error || '削除に失敗しました');
      }
    }

    setIsDeleting(null);
    setPlanToDelete(null);
  };

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCreatePlan = () => {
    onClose();
    openModal();
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  // Decide which plans to show
  const displayPlans = isAuthenticated ? serverPlans : localPlans;
  const isLoading = isAuthenticated ? isServerPlansLoading : false;
  const hasPlans = displayPlans.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#fcfbf9] shadow-2xl z-[80] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dashed border-stone-200">
              <Link href="/" onClick={onClose} className="group flex items-center gap-1">
                <span className="font-serif text-xl font-bold text-[#e67e22] tracking-tight group-hover:opacity-80 transition-opacity flex items-center">
                  <span>Tabide</span>
                  <span className="text-[#27ae60] font-extrabold flex items-center ml-px">
                    .a
                    <FaMapMarkerAlt className="text-[0.85em] mt-0.5" />
                  </span>
                </span>
              </Link>
              <button
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
                aria-label="メニューを閉じる"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* User Info Section */}
            {isAuthenticated && user && (
              <div className="p-4 bg-gradient-to-r from-[#e67e22]/5 to-[#f39c12]/5 border-b border-dashed border-stone-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                  >
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.displayName || 'ユーザー'}
                        width={40}
                        height={40}
                        className="rounded-full ring-2 ring-[#e67e22]/20 group-hover:ring-[#e67e22]/40 transition-all"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#e67e22]/10 ring-2 ring-[#e67e22]/20 flex items-center justify-center group-hover:ring-[#e67e22]/40 transition-all">
                        <span className="text-[#e67e22] font-bold">
                          {user.displayName?.[0] || user.email?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-800 truncate text-sm group-hover:text-[#e67e22] transition-colors">
                        {user.displayName || 'ユーザー'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {billingStatus?.isSubscribed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white text-xs font-bold rounded-full">
                            <FaCrown className="text-[0.6rem]" />
                            Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-stone-200 text-stone-600 text-xs font-medium rounded-full">
                            Free
                          </span>
                        )}
                        {billingStatus && billingStatus.ticketCount > 0 && (
                          <span className="text-xs text-stone-500">
                            回数券: {billingStatus.ticketCount}回
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={onOpenSettings}
                    className="p-2 text-stone-400 hover:text-[#e67e22] hover:bg-[#e67e22]/5 rounded-full transition-colors"
                    aria-label="設定"
                  >
                    <FaCog size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="p-4 space-y-2">
              <SidebarLink href="/" icon={<FaHome />} label="ホーム" onClick={onClose} />
              <SidebarLink href="/usage" icon={<FaMap />} label="使い方" onClick={onClose} />
              <SidebarLink href="/pricing" icon={<FaCrown />} label="料金プラン" onClick={onClose} />
              <SidebarLink href="/faq" icon={<FaQuestionCircle />} label="よくある質問" onClick={onClose} />
            </nav>

            {/* Divider */}
            <div className="mx-4 border-t border-dashed border-stone-200" />

            {/* Plans Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <FaSuitcase className="text-[#e67e22]/70" />
                  <span className="font-medium text-stone-700 text-sm">
                    {isAuthenticated ? '保存したプラン' : 'ローカルプラン'}
                  </span>
                </div>
                {isAuthenticated && (
                  <Link
                    href="/my-plans"
                    onClick={onClose}
                    className="text-xs text-[#e67e22] hover:text-[#d35400] transition-colors"
                  >
                    すべて見る
                  </Link>
                )}
              </div>

              {/* Plans List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-stone-100 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hasPlans ? (
                      <div className="space-y-2">
                        {displayPlans.slice(0, 5).map((plan) => {
                          // Determine link and plan info based on type
                          const isLocalPlan = 'itinerary' in plan;
                          const href = isLocalPlan
                            ? `/plan/local/${plan.id}`
                            : `/plan/id/${plan.id}`;
                          const destination = isLocalPlan
                            ? (plan as { itinerary: { destination?: string } }).itinerary?.destination
                            : (plan as PlanListItem).destination;
                          const thumbnailUrl = isLocalPlan
                            ? (plan as { itinerary: { heroImage?: string } }).itinerary?.heroImage
                            : (plan as PlanListItem).thumbnailUrl;
                          const createdAt = plan.createdAt;
                          const isMenuOpen = openMenuId === plan.id;
                          const isCurrentlyRenaming = isRenaming === plan.id;
                          const isCurrentlyDeleting = isDeleting === plan.id;

                          return (
                            <div
                              key={plan.id}
                              className={`relative flex items-center gap-3 p-2 rounded-lg transition-colors group ${
                                isCurrentlyDeleting ? 'opacity-50' : 'hover:bg-[#e67e22]/5'
                              }`}
                            >
                              {/* Main content as link */}
                              <Link
                                href={href}
                                onClick={onClose}
                                className="flex items-center gap-3 flex-1 min-w-0"
                              >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                                  {thumbnailUrl ? (
                                    <Image
                                      src={thumbnailUrl}
                                      alt={destination || '旅行プラン'}
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e67e22]/10 to-[#27ae60]/10">
                                      <FaMapMarkerAlt className="text-[#e67e22]/40" />
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  {isCurrentlyRenaming ? (
                                    <input
                                      ref={renameInputRef}
                                      type="text"
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleRename(plan.id, isLocalPlan);
                                        } else if (e.key === 'Escape') {
                                          setIsRenaming(null);
                                        }
                                      }}
                                      onBlur={() => handleRename(plan.id, isLocalPlan)}
                                      onClick={(e) => e.preventDefault()}
                                      className="w-full text-sm font-medium text-stone-800 bg-white border border-[#e67e22] rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50"
                                      disabled={isUpdating}
                                    />
                                  ) : (
                                    <p className="text-sm font-medium text-stone-800 truncate group-hover:text-[#e67e22] transition-colors">
                                      {destination || '目的地未設定'}
                                    </p>
                                  )}
                                  <p className="text-xs text-stone-400">
                                    {formatDate(createdAt)}
                                  </p>
                                </div>
                              </Link>

                              {/* Three-dot menu button (only for authenticated users with server plans) */}
                              {isAuthenticated && !isLocalPlan && !isCurrentlyRenaming && (
                                <div className="relative" ref={isMenuOpen ? menuRef : null}>
                                  <button
                                    onClick={(e) => handleMenuToggle(plan.id, e)}
                                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    aria-label="メニューを開く"
                                  >
                                    <FaEllipsisV className="text-sm" />
                                  </button>

                                  {/* Dropdown menu */}
                                  <AnimatePresence>
                                    {isMenuOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50"
                                      >
                                        <button
                                          onClick={(e) => handleStartRename(plan.id, destination || '', e)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                        >
                                          <FaEdit className="text-stone-400" />
                                          名前を変更
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteClick(plan.id, isLocalPlan, e)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          <FaTrash className="text-red-400" />
                                          削除
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {displayPlans.length > 5 && (
                          <Link
                            href={isAuthenticated ? '/my-plans' : '#'}
                            onClick={onClose}
                            className="block text-center text-xs text-stone-500 hover:text-[#e67e22] py-2 transition-colors"
                          >
                            他 {displayPlans.length - 5} 件のプラン
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#e67e22]/5 flex items-center justify-center">
                          <FaPlane className="text-[#e67e22]/30 text-xl" />
                        </div>
                        <p className="text-sm text-stone-500 mb-1">
                          プランがありません
                        </p>
                        <p className="text-xs text-stone-400">
                          新しい旅を計画しましょう
                        </p>
                      </div>
                    )}

                    {/* Unauthenticated User Call to Action */}
                    {!isAuthenticated && (
                      <div className="pt-4 border-t border-dashed border-stone-200">
                        <div className="bg-[#e67e22]/5 p-4 rounded-xl text-center">
                          <p className="text-sm font-bold text-stone-700 mb-1">
                            保存したプランを表示
                          </p>
                          <p className="text-xs text-stone-500 mb-3">
                            ログインして、保存したすべての<br/>プランにアクセスしましょう
                          </p>
                          <Link
                            href="/auth/login"
                            onClick={onClose}
                            className="inline-flex items-center justify-center w-full px-4 py-2 bg-white border border-[#e67e22]/30 text-[#e67e22] rounded-lg text-sm font-bold hover:bg-[#e67e22] hover:text-white transition-all shadow-sm"
                          >
                            ログインする
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Create Plan Button */}
            <div className="p-4 border-t border-dashed border-stone-200">
              <button
                onClick={handleCreatePlan}
                className="w-full flex items-center justify-center gap-2 bg-[#e67e22] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[#d35400] transition-all"
              >
                <FaPen className="text-sm" />
                <span>プランを作成する</span>
              </button>
            </div>
          </motion.aside>

          {/* Delete Plan Modal */}
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
                      onClick={executeDelete}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                      削除する
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-stone-700 hover:bg-[#e67e22]/5 hover:text-[#e67e22] transition-colors"
    >
      <span className="text-[#e67e22]/60">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
