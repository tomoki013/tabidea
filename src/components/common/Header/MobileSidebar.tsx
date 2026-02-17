'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
  FaFlag,
} from 'react-icons/fa';

import { useAuth } from '@/context/AuthContext';
import { usePlanModal } from '@/context/PlanModalContext';
import { useLocalPlans } from '@/lib/local-storage/plans';
import { useUserPlans } from '@/context/UserPlansContext';
import { useFlags } from '@/context/FlagsContext';
import { deletePlan, updatePlanName } from '@/app/actions/travel-planner';
import { getBillingStatus } from '@/app/actions/billing';
import { PRO_PLAN_NAME } from '@/lib/billing/constants';
import type { PlanListItem } from '@/types';
import type { UserBillingStatus } from '@/types/billing';
import { JournalSheet, Tape, HandwrittenText, Stamp, JournalButton } from '@/components/ui/journal';

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
  const { isFlagged, toggleFlag } = useFlags();
  const pathname = usePathname();

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

  const handleToggleFlag = async (planId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    await toggleFlag(planId);
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

  // Decide which plans to show, sorted by flagged first then by updatedAt desc
  const displayPlans = useMemo(() => {
    const plans = isAuthenticated ? serverPlans : localPlans;
    return [...plans].sort((a, b) => {
      const aFlagged = isFlagged(a.id);
      const bFlagged = isFlagged(b.id);
      if (aFlagged && !bFlagged) return -1;
      if (!aFlagged && bFlagged) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [isAuthenticated, serverPlans, localPlans, isFlagged]);

  const isLoading = isAuthenticated ? isServerPlansLoading : false;
  const hasPlans = displayPlans.length > 0;

  // Check if a plan is currently active based on URL
  const isActivePlan = (planId: string, isLocalPlan: boolean) => {
    if (isLocalPlan) {
      return pathname === `/plan/local/${planId}`;
    }
    return pathname === `/plan/id/${planId}`;
  };

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
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-[80] flex flex-col pointer-events-none"
          >
            {/*
              Changed: overflow-y-auto to allow full sidebar scrolling.
              Removed flex-1 from children to allow natural flow.
            */}
            <JournalSheet variant="notebook" className="w-full h-full flex flex-col pointer-events-auto shadow-2xl overflow-y-auto overflow-x-hidden p-0 rounded-l-none overscroll-contain">

              {/* Decorative Tape */}
              <Tape color="yellow" position="top-right" rotation="right" className="opacity-90 sticky top-2 z-20" />

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-dashed border-stone-200 bg-white/50 sticky top-0 z-10 backdrop-blur-sm">
                <Link href="/" onClick={onClose} className="group flex items-center gap-2">
                  <Stamp color="black" size="sm" className="w-10 h-10 text-[0.6rem] border-2 bg-white">
                     <div className="flex flex-col items-center leading-none">
                        <span>TABI</span>
                        <span>DEA</span>
                      </div>
                  </Stamp>
                  <HandwrittenText className="font-bold text-lg">Tabidea</HandwrittenText>
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-sm transition-colors border border-transparent hover:border-stone-300 hover:border-dashed"
                  aria-label="メニューを閉じる"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              {/* User Info Section */}
              {isAuthenticated && user && (
                <div className="p-4 bg-stone-50/50 border-b-2 border-dashed border-stone-200 relative">
                  <div className="flex items-center gap-3 relative z-10">
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
                          className="rounded-full ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-stone-100 ring-2 ring-white flex items-center justify-center border border-stone-300 border-dashed">
                          <span className="text-stone-600 font-hand font-bold">
                            {user.displayName?.[0] || user.email?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <HandwrittenText className="font-bold truncate text-sm">
                          {user.displayName || 'ユーザー'}
                        </HandwrittenText>
                        <div className="flex items-center gap-1.5 mt-1">
                          {billingStatus?.isSubscribed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-sm border border-primary/20">
                              <FaCrown className="text-[0.6rem]" />
                              {PRO_PLAN_NAME}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-stone-200 text-stone-600 text-xs font-medium rounded-sm">
                              Free
                            </span>
                          )}
                          {billingStatus && billingStatus.ticketCount > 0 && (
                            <span className="text-xs text-stone-500 font-hand">
                              チケット: {billingStatus.ticketCount}枚
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={onOpenSettings}
                      className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-sm transition-colors border border-transparent hover:border-stone-200 hover:border-dashed"
                      aria-label="設定"
                    >
                      <FaCog size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="p-4 space-y-1">
                <SidebarLink href="/" icon={<FaHome />} label="ホーム" onClick={onClose} />
                <SidebarLink href="/usage" icon={<FaMap />} label="使い方" onClick={onClose} />
                <SidebarLink href="/pricing" icon={<FaCrown />} label="料金プラン" onClick={onClose} />
                <SidebarLink href="/faq" icon={<FaQuestionCircle />} label="よくある質問" onClick={onClose} />
                <SidebarLink href="/shiori" icon={<FaMapMarkerAlt />} label="旅のしおり" onClick={onClose} />
              </nav>

              {/* Divider */}
              <div className="mx-4 border-t-2 border-dashed border-stone-200" />

              {/* Plans Section - Removed flex-1/overflow-hidden to allow full scroll */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FaSuitcase className="text-stone-400" />
                    <HandwrittenText className="font-bold text-sm">
                      {isAuthenticated ? '保存したプラン' : 'ローカルプラン'}
                    </HandwrittenText>
                  </div>
                  {isAuthenticated && (
                    <Link
                      href="/my-plans"
                      onClick={onClose}
                      className="text-xs text-stone-500 hover:text-primary transition-colors font-hand decoration-dashed underline"
                    >
                      すべて見る
                    </Link>
                  )}
                </div>

                {/* Plans List - Removed overflow-y-auto */}
                <div className="px-4 pb-4">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-16 bg-stone-100 rounded-sm animate-pulse"
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
                            const isActive = isActivePlan(plan.id, isLocalPlan);
                            const planIsFlagged = isFlagged(plan.id);

                            return (
                              <div
                                key={plan.id}
                                className={`relative flex items-center gap-3 p-2 rounded-sm border transition-colors group ${
                                  isCurrentlyDeleting
                                    ? 'opacity-50 border-transparent'
                                    : isActive
                                    ? 'bg-primary/5 border-primary/30'
                                    : 'border-transparent hover:bg-stone-50 hover:border-stone-200 hover:border-dashed'
                                }`}
                              >
                                {/* Main content as link */}
                                <Link
                                  href={href}
                                  onClick={onClose}
                                  className="flex items-center gap-3 flex-1 min-w-0"
                                >
                                  {/* Thumbnail */}
                                  <div className="w-12 h-12 rounded-sm overflow-hidden bg-stone-100 flex-shrink-0 relative border border-stone-200 shadow-sm rotate-[-2deg] group-hover:rotate-0 transition-transform">
                                    {thumbnailUrl ? (
                                      <Image
                                        src={thumbnailUrl}
                                        alt={destination || '旅行プラン'}
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-stone-50">
                                        <FaMapMarkerAlt className="text-stone-300" />
                                      </div>
                                    )}
                                    {/* Flag indicator on thumbnail */}
                                    {planIsFlagged && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border border-white shadow-sm z-10">
                                        <FaFlag className="text-[6px] text-white" />
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
                                        className="w-full text-sm font-medium text-stone-800 bg-white border-b-2 border-stone-300 focus:border-primary focus:outline-none font-hand"
                                        disabled={isUpdating}
                                      />
                                    ) : (
                                      <p className={`text-sm font-hand font-bold truncate transition-colors ${
                                        isActive ? 'text-primary' : 'text-stone-700 group-hover:text-primary'
                                      }`}>
                                        {destination || '目的地未設定'}
                                      </p>
                                    )}
                                    <p className="text-xs text-stone-400 font-mono">
                                      {formatDate(createdAt)}
                                    </p>
                                  </div>
                                </Link>

                                {/* Three-dot menu button - Always visible */}
                                {!isCurrentlyRenaming && (
                                  <div className="relative" ref={isMenuOpen ? menuRef : null}>
                                    <button
                                      onClick={(e) => handleMenuToggle(plan.id, e)}
                                      className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
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
                                          className="absolute right-0 top-full mt-1 w-40 bg-white rounded-sm shadow-xl border border-stone-200 py-1 z-50 font-hand"
                                        >
                                          {/* Flag/Unflag action */}
                                          {isAuthenticated && !isLocalPlan && (
                                            <button
                                              onClick={(e) => handleToggleFlag(plan.id, e)}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                            >
                                              <FaFlag className={planIsFlagged ? 'text-amber-500' : 'text-stone-400'} />
                                              {planIsFlagged ? 'ピン解除' : 'ピン留め'}
                                            </button>
                                          )}
                                          {isAuthenticated && !isLocalPlan && (
                                            <button
                                              onClick={(e) => handleStartRename(plan.id, destination || '', e)}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                                            >
                                              <FaEdit className="text-stone-400" />
                                              名前を変更
                                            </button>
                                          )}
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
                              className="block text-center text-xs text-stone-500 hover:text-primary py-2 transition-colors font-hand decoration-dashed underline"
                            >
                              他 {displayPlans.length - 5} 件のプラン
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-200 border-dashed">
                            <FaPlane className="text-stone-300 text-xl" />
                          </div>
                          <p className="text-sm text-stone-500 mb-1 font-hand">
                            プランがありません
                          </p>
                          <p className="text-xs text-stone-400 font-hand">
                            新しい旅を計画しましょう
                          </p>
                        </div>
                      )}

                      {/* Unauthenticated User Call to Action */}
                      {!isAuthenticated && (
                        <div className="pt-4 border-t-2 border-dashed border-stone-200">
                          <div className="bg-primary/5 p-4 rounded-sm border border-primary/20 text-center relative">
                            {/* Tape */}
                            <Tape color="white" position="top-center" className="w-12 h-4" />

                            <p className="text-sm font-bold text-stone-700 mb-1 font-hand">
                              保存したプランを表示
                            </p>
                            <p className="text-xs text-stone-500 mb-3 font-hand">
                              ログインして、保存したすべての<br/>プランにアクセスしましょう
                            </p>
                            <Link
                              href="/auth/login"
                              onClick={onClose}
                              className="inline-flex items-center justify-center w-full px-4 py-2 bg-white border border-primary text-primary rounded-sm text-sm font-bold hover:bg-primary hover:text-white transition-all shadow-sm font-hand"
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
              <div className="p-4 border-t-2 border-dashed border-stone-200 bg-white/50">
                <JournalButton
                  variant="primary"
                  className="w-full font-bold shadow-md"
                  onClick={handleCreatePlan}
                >
                  <FaPen className="text-sm mr-2" />
                  プランを作成する
                </JournalButton>
              </div>
            </JournalSheet>
          </motion.aside>

          {/* Delete Plan Modal - Refactored to match Journal Theme */}
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.9, opacity: 0, rotate: -2 }}
                className="relative max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <JournalSheet>
                   {/* Tape */}
                   <Tape color="red" position="top-right" rotation="right" />

                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="absolute top-2 right-2 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <FaTimes />
                  </button>

                  <div className="flex flex-col items-center text-center mt-2">
                    <div className="p-4 bg-red-50 rounded-full mb-4 border-2 border-red-100 border-dashed">
                      <FaTrash className="text-red-500 text-2xl" />
                    </div>

                    <HandwrittenText tag="h3" className="text-xl font-bold text-stone-800 mb-2">
                      プランを削除しますか？
                    </HandwrittenText>

                    <p className="text-sm text-stone-600 mb-6 font-hand">
                      この操作は取り消すことができません。<br/>
                      本当にこのプランを削除しますか？
                    </p>

                    <div className="flex gap-3 w-full">
                      <JournalButton
                        variant="ghost"
                        onClick={() => setShowDeleteModal(false)}
                        className="flex-1"
                      >
                        キャンセル
                      </JournalButton>
                      <JournalButton
                         variant="primary"
                         onClick={executeDelete}
                         className="flex-1 bg-red-600 hover:bg-red-700 border-red-800 text-white"
                      >
                        削除する
                      </JournalButton>
                    </div>
                  </div>
                </JournalSheet>
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
      className="flex items-center gap-3 px-3 py-3 rounded-sm text-stone-600 hover:bg-stone-50 hover:text-primary transition-colors font-hand font-bold group"
    >
      <span className="text-stone-400 group-hover:text-primary transition-colors">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
