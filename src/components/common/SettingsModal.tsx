"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { getUserSettings, updateUserSettings } from "@/app/actions/user-settings";
import { deleteAccount } from "@/app/actions/travel-planner";
import { getBillingAccessInfo, getUserUsageStats } from "@/app/actions/billing";
import type { UsageStats } from "@/app/actions/billing";
import { createPortalSession } from "@/app/actions/stripe/portal";
import { useAuth } from "@/context/AuthContext";
import { PRO_PLAN_NAME } from "@/lib/billing/constants";
import type { BillingAccessInfo } from "@/types";
import {
  FaSpinner,
  FaSave,
  FaTimes,
  FaUserCog,
  FaRobot,
  FaSignOutAlt,
  FaExclamationTriangle,
  FaTrash,
  FaCrown,
  FaCreditCard,
  FaLock,
  FaCog,
  FaChartPie,
  FaCheckCircle,
  FaInfinity,
} from "react-icons/fa";
import { JournalSheet, Tape, Stamp, HandwrittenText, JournalButton, JournalInput } from "@/components/ui/journal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'account' | 'plan' | 'ai';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [mounted, setMounted] = useState(false);

  // AI Settings State
  const [customInstructions, setCustomInstructions] = useState("");
  const [travelStyle, setTravelStyle] = useState("");
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Account State
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Billing & Usage State
  const [billingInfo, setBillingInfo] = useState<BillingAccessInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isRedirectingToPortal, setIsRedirectingToPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadBillingInfo();
      setActiveTab('account');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [isOpen]);

  const loadBillingInfo = async () => {
    setIsLoadingBilling(true);
    try {
      const [info, stats] = await Promise.all([
        getBillingAccessInfo(),
        getUserUsageStats()
      ]);
      setBillingInfo(info);
      setUsageStats(stats);
    } catch (e) {
      console.error("Failed to load billing info:", e);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsRedirectingToPortal(true);
    setPortalError(null);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else if (result.error === 'not_authenticated') {
        window.location.href = '/auth/login?redirect=/pricing';
      } else if (result.error === 'no_subscription') {
        setPortalError('サブスクリプション情報が見つかりません。まずプランにご加入ください。');
        setIsRedirectingToPortal(false);
      } else if (result.error === 'portal_not_configured') {
        setPortalError('カスタマーポータルの設定が完了していません。管理者にお問い合わせください。');
        setIsRedirectingToPortal(false);
      } else {
        setPortalError('ポータルの読み込みに失敗しました。しばらくしてからもう一度お試しください。');
        setIsRedirectingToPortal(false);
      }
    } catch (e) {
      console.error("Failed to open portal:", e);
      setPortalError('ポータルの読み込みに失敗しました。しばらくしてからもう一度お試しください。');
      setIsRedirectingToPortal(false);
    }
  };

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    setSettingsError(null);
    try {
      const result = await getUserSettings();
      if (result.success && result.settings) {
        setCustomInstructions(result.settings.customInstructions || "");
        setTravelStyle(result.settings.travelStyle || "");
      }
    } catch (e) {
      setSettingsError("エラーが発生しました");
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSettingsError(null);
    try {
      const result = await updateUserSettings({ customInstructions, travelStyle });
      if (result.success) {
        onClose();
      } else {
        setSettingsError(result.error || "保存に失敗しました");
      }
    } catch (e) {
      setSettingsError("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '削除する') {
      return;
    }

    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount();

      if (result.success) {
        await signOut();
        onClose();
        router.push('/');
      } else {
        alert(result.error || 'アカウントの削除に失敗しました');
        setIsDeletingAccount(false);
      }
    } catch (e) {
      alert('エラーが発生しました');
      setIsDeletingAccount(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const isPaidPlan = billingInfo?.isSubscribed;
  const isAdmin = billingInfo?.userType === 'admin';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-full max-h-[90vh] flex flex-col md:flex-row relative min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <JournalSheet variant="notebook" className="w-full h-full p-0 overflow-hidden shadow-2xl relative">
          <div className="flex flex-col md:flex-row h-full w-full">
           <Tape color="white" position="top-right" rotation="right" className="opacity-80 z-20" />

           {/* Close Button (Mobile) */}
           <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 md:hidden p-2 text-stone-500 hover:text-stone-800"
            >
              <FaTimes size={20} />
            </button>

          {/* Sidebar (Tabs) - Notebook Index Style */}
          <div className="w-full md:w-64 bg-stone-100 border-b md:border-b-0 md:border-r-2 border-stone-300 border-dashed p-6 flex flex-col relative">
            <div className="mb-8 hidden md:block">
               <Stamp color="black" size="sm" className="w-16 h-16 border-2 mx-auto rotate-[-6deg]">
                  SET<br/>TINGS
               </Stamp>
            </div>

            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible no-scrollbar">
              <TabButton
                active={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
                icon={FaUserCog}
                label="アカウント"
              />
              <TabButton
                active={activeTab === 'plan'}
                onClick={() => setActiveTab('plan')}
                icon={FaChartPie}
                label="プラン管理"
              />
              <TabButton
                active={activeTab === 'ai'}
                onClick={() => setActiveTab('ai')}
                icon={FaRobot}
                label="AI設定"
              />
            </div>

            <div className="mt-auto hidden md:block pt-6 border-t border-stone-300 border-dashed">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-hand"
              >
                <FaTimes /> 閉じる
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-white/50 relative overscroll-contain h-full">
             {/* Paper Texture */}
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 pointer-events-none" />

            <div className="p-6 md:p-8 relative z-10 pb-20 md:pb-8 min-h-full">
              {activeTab === 'account' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="border-b-2 border-stone-200 border-dashed pb-4">
                    <HandwrittenText tag="h3" className="text-2xl font-bold text-stone-800">
                      アカウント設定
                    </HandwrittenText>
                  </div>

                  {/* User Info Card */}
                  <div className="bg-white rounded-sm border border-stone-200 p-6 flex items-center gap-5 shadow-sm transform -rotate-1">
                    <div className="relative">
                       {user?.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.displayName || 'ユーザー'}
                          width={64}
                          height={64}
                          className="rounded-full ring-4 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-stone-100 ring-4 ring-white flex items-center justify-center border border-stone-300 border-dashed">
                          <span className="text-stone-500 font-hand text-2xl font-bold">
                            {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                      <Tape color="blue" position="top-center" className="w-16 h-4 -top-3 opacity-60" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <HandwrittenText className="font-bold text-lg text-stone-800 truncate">
                        {user?.displayName || 'ユーザー'}
                      </HandwrittenText>
                      <p className="text-stone-500 truncate font-mono text-sm">{user?.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    <JournalButton
                      variant="outline"
                      onClick={handleSignOut}
                      className="w-full justify-between"
                    >
                      <span>ログアウト</span>
                      <FaSignOutAlt className="text-stone-400" />
                    </JournalButton>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t-2 border-stone-200 border-dashed">
                    <HandwrittenText className="font-bold text-red-500 mb-4 flex items-center gap-2">
                      <FaExclamationTriangle /> 危険なエリア
                    </HandwrittenText>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-500 text-sm font-hand underline decoration-dashed hover:text-red-700"
                      >
                        アカウントを削除する
                      </button>
                    ) : (
                      <div className="bg-red-50/50 rounded-sm p-5 border border-red-200 border-dashed relative">
                        <Tape color="red" position="top-right" rotation="right" className="opacity-70" />
                        <h5 className="font-bold text-red-800 mb-2 font-hand">
                          本当に削除しますか？
                        </h5>
                        <p className="text-sm text-red-700/80 mb-4 font-hand">
                          復元することはできません。<br/>
                          確認のため「削除する」と入力してください。
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="削除する"
                          className="w-full px-3 py-2 border-b-2 border-red-300 bg-transparent mb-3 focus:outline-none focus:border-red-500 font-hand"
                        />
                        <div className="flex gap-3">
                          <JournalButton
                            variant="ghost"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="flex-1"
                          >
                            キャンセル
                          </JournalButton>
                          <JournalButton
                            variant="primary"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== '削除する' || isDeletingAccount}
                            className="flex-1 bg-red-600 border-red-800 text-white hover:bg-red-700"
                          >
                            {isDeletingAccount ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                            削除実行
                          </JournalButton>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'plan' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="border-b-2 border-stone-200 border-dashed pb-4">
                    <HandwrittenText tag="h3" className="text-2xl font-bold text-stone-800">
                      プラン管理
                    </HandwrittenText>
                  </div>

                  {isLoadingBilling ? (
                    <div className="flex justify-center py-12">
                      <FaSpinner className="animate-spin text-3xl text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Current Plan Status */}
                      <div className="bg-white rounded-sm border border-stone-200 p-6 shadow-sm relative">
                        <Tape color="yellow" position="top-left" rotation="left" className="opacity-80" />
                        <h4 className="font-bold text-stone-800 flex items-center gap-2 mb-4 font-hand">
                          <FaCreditCard className="text-primary" />
                          現在のプラン
                        </h4>

                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-sm mb-4 border border-stone-100">
                          <div>
                            <div className="flex items-center gap-2">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-800 text-white text-sm font-bold rounded-sm transform -rotate-1">
                                  <FaUserCog className="text-xs" />
                                  管理者
                                </span>
                              ) : isPaidPlan ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-sm font-bold rounded-sm transform -rotate-1 shadow-sm border border-primary/20">
                                  <FaCrown className="text-xs" />
                                  {PRO_PLAN_NAME}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 bg-stone-200 text-stone-600 text-sm font-bold rounded-sm transform rotate-1">
                                  Free
                                </span>
                              )}
                            </div>
                            {isPaidPlan && billingInfo?.subscriptionEndsAt && (
                              <p className="text-xs text-stone-500 mt-2 font-mono">
                                次回更新: {new Date(billingInfo.subscriptionEndsAt).toLocaleDateString('ja-JP')}
                              </p>
                            )}
                          </div>
                          {billingInfo?.ticketCount && billingInfo.ticketCount > 0 ? (
                            <div className="text-right">
                              <p className="text-sm text-stone-500 font-hand">チケット残数</p>
                              <p className="text-xl font-bold text-primary font-hand">{billingInfo.ticketCount}枚</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          {isAdmin ? (
                             <div className="w-full text-center text-sm text-stone-500 bg-stone-100 p-3 rounded-sm font-hand">
                               管理者アカウントです
                             </div>
                          ) : isPaidPlan ? (
                            <JournalButton
                              variant="outline"
                              onClick={handleManageSubscription}
                              disabled={isRedirectingToPortal}
                              className="flex-1"
                            >
                              {isRedirectingToPortal ? (
                                <>
                                  <FaSpinner className="animate-spin mr-2" />
                                  読み込み中...
                                </>
                              ) : (
                                <>
                                  <FaCog className="text-stone-400 mr-2" />
                                  プランを管理・解約
                                </>
                              )}
                            </JournalButton>
                          ) : (
                            <a href="/pricing" onClick={onClose} className="flex-1">
                               <JournalButton variant="primary" className="w-full">
                                  <FaCrown className="mr-2" />
                                  アップグレードする
                               </JournalButton>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Usage Stats */}
                      {usageStats && (
                        <div className="bg-white rounded-sm border border-stone-200 p-6 shadow-sm relative">
                          <Tape color="green" position="top-right" rotation="right" className="opacity-80" />
                          <h4 className="font-bold text-stone-800 flex items-center gap-2 mb-4 font-hand">
                            <FaChartPie className="text-primary" />
                            利用状況
                          </h4>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <UsageStatCard
                              title="プラン生成数"
                              current={usageStats.planGeneration.current}
                              limit={usageStats.planGeneration.limit}
                              resetAt={usageStats.planGeneration.resetAt}
                            />
                            <UsageStatCard
                              title="渡航情報取得"
                              current={usageStats.travelInfo.current}
                              limit={usageStats.travelInfo.limit}
                              resetAt={usageStats.travelInfo.resetAt}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="border-b-2 border-stone-200 border-dashed pb-4">
                    <HandwrittenText tag="h3" className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                      AI設定
                      {isPaidPlan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-sm border border-primary/20 transform -rotate-2">
                          <FaCrown className="text-[0.6rem]" />
                          {PRO_PLAN_NAME}
                        </span>
                      )}
                    </HandwrittenText>
                  </div>

                  {isLoadingSettings ? (
                    <div className="py-12 flex justify-center">
                      <FaSpinner className="animate-spin text-3xl text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Custom Instructions */}
                      <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-sm relative">
                        <Tape color="blue" position="top-left" rotation="left" className="opacity-60 w-16 h-4" />
                        <label className="block text-sm font-bold text-stone-700 mb-2 font-hand">
                          カスタム指示（制約事項）
                        </label>
                        <div className="text-xs text-stone-500 mb-3 bg-stone-50 p-3 rounded-sm border-l-4 border-stone-300">
                          <p className="mb-1 font-bold font-hand">💡 ヒント</p>
                          <span className="font-hand">
                             「美術館は含めないで」「移動少なめで」など、AIに守らせたい条件を書いてね。
                          </span>
                        </div>
                        <textarea
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          className="w-full h-32 p-3 bg-transparent border-b-2 border-stone-300 focus:border-primary focus:outline-none resize-none font-hand text-lg leading-relaxed"
                          placeholder="ここに指示を入力..."
                        />
                      </div>

                      {/* Travel Style */}
                      <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-bold text-stone-700 font-hand">
                            旅のスタイル
                          </label>
                          {!isPaidPlan && !isAdmin && (
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-sm border border-primary/20 flex items-center gap-1">
                              <FaLock size={10} /> {PRO_PLAN_NAME}限定
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <textarea
                            value={travelStyle}
                            onChange={(e) => setTravelStyle(e.target.value)}
                            disabled={!isPaidPlan && !isAdmin}
                            className={`w-full h-32 p-3 bg-transparent border-b-2 focus:outline-none resize-none font-hand text-lg leading-relaxed transition-all
                              ${!isPaidPlan && !isAdmin
                                ? "border-stone-200 text-stone-300 cursor-not-allowed"
                                : "border-stone-300 focus:border-primary text-stone-800"
                              }`}
                            placeholder={!isPaidPlan && !isAdmin ? "アップグレードして利用可能" : "歴史的な場所が好き、朝はゆっくり..."}
                          />

                          {!isPaidPlan && !isAdmin && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                              <a href="/pricing" onClick={onClose}>
                                <JournalButton variant="primary" size="sm">
                                   <FaCrown className="mr-2" />
                                   アップグレード
                                </JournalButton>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <JournalButton
                          variant="primary"
                          onClick={handleSaveSettings}
                          disabled={isSaving}
                          className="shadow-md"
                        >
                          {isSaving ? (
                            <>
                              <FaSpinner className="animate-spin mr-2" /> 保存中...
                            </>
                          ) : (
                            <>
                              <FaSave className="mr-2" /> 設定を保存
                            </>
                          )}
                        </JournalButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
        </JournalSheet>
      </div>
    </div>,
    document.body
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-sm font-bold transition-all whitespace-nowrap font-hand text-lg
        ${active
          ? 'bg-white text-stone-800 shadow-sm border border-stone-200 transform -rotate-1'
          : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
        }`}
    >
      <Icon className={active ? 'text-primary' : 'text-stone-400'} />
      {label}
    </button>
  );
}

function UsageStatCard({ title, current, limit, resetAt }: { title: string, current: number, limit: number, resetAt: Date | null }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);

  return (
    <div className="bg-stone-50 p-4 rounded-sm border border-stone-200 border-dashed">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-stone-700 text-sm font-hand">{title}</span>
        {resetAt && (
          <span className="text-[10px] text-stone-400 font-mono">
            Limit: {resetAt.toLocaleDateString('ja-JP')}
          </span>
        )}
      </div>

      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-bold text-stone-800 font-hand">{current}</span>
        <span className="text-sm text-stone-400 mb-1">/</span>
        <span className="text-sm text-stone-400 mb-1 font-hand">
          {isUnlimited ? <FaInfinity className="inline" /> : limit}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden border border-stone-300">
          <div
            className={`h-full rounded-full ${percentage >= 80 ? 'bg-red-500' : 'bg-primary'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <div className="flex items-center gap-1 text-xs font-bold text-primary mt-2 font-hand">
          <FaCheckCircle /> 無制限
        </div>
      )}
    </div>
  );
}
