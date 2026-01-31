"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getUserSettings, updateUserSettings } from "@/app/actions/user-settings";
import { deleteAccount } from "@/app/actions/travel-planner";
import { getBillingStatus } from "@/app/actions/billing";
import { createPortalSession } from "@/app/actions/stripe/portal";
import { useAuth } from "@/context/AuthContext";
import type { UserBillingStatus } from "@/types/billing";
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
} from "react-icons/fa";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'ai' | 'account';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
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

  // Billing State
  const [billingStatus, setBillingStatus] = useState<UserBillingStatus | null>(null);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isRedirectingToPortal, setIsRedirectingToPortal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadBillingStatus();
      // Reset states
      setActiveTab('account');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');

      // Lock scroll
      const scrollY = window.scrollY;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      return () => {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const loadBillingStatus = async () => {
    setIsLoadingBilling(true);
    try {
      const status = await getBillingStatus();
      setBillingStatus(status);
    } catch (e) {
      console.error("Failed to load billing status:", e);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsRedirectingToPortal(true);
    try {
      await createPortalSession();
    } catch (e) {
      console.error("Failed to open portal:", e);
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
      } else {
        // If no settings exist yet, it's fine, just empty
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#fcfbf9] rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden border border-stone-200 flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar (Tabs) */}
        <div className="w-full md:w-64 bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 p-4 md:p-6 flex flex-col">
          <h2 className="text-xl font-bold text-stone-800 mb-6 hidden md:block">
            設定
          </h2>

          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar">
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'account'
                  ? 'bg-white text-[#e67e22] shadow-sm ring-1 ring-[#e67e22]/20'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
              }`}
            >
              <FaUserCog className={activeTab === 'account' ? 'text-[#e67e22]' : 'text-stone-400'} />
              アカウント
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'bg-white text-[#e67e22] shadow-sm ring-1 ring-[#e67e22]/20'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
              }`}
            >
              <FaRobot className={activeTab === 'ai' ? 'text-[#e67e22]' : 'text-stone-400'} />
              AI設定
            </button>
          </div>

          <div className="mt-auto hidden md:block pt-6 border-t border-stone-200">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-sm font-medium"
            >
              <FaTimes /> 閉じる
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Mobile Header (Close button) */}
          <div className="md:hidden flex justify-end p-4">
             <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500"
            >
              <FaTimes />
            </button>
          </div>

          <div className="p-6 md:p-8 flex-1">
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-stone-800 mb-2 flex items-center gap-2">
                    AI設定
                    {billingStatus?.isSubscribed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white text-xs font-bold rounded-full">
                        <FaCrown className="text-[0.6rem]" />
                        Pro
                      </span>
                    )}
                  </h3>
                  <p className="text-stone-500 text-sm">
                    旅行プラン生成時のAIの挙動をカスタマイズできます。
                  </p>
                </div>

                {!billingStatus?.isSubscribed && !isLoadingBilling ? (
                  <div className="bg-gradient-to-r from-[#e67e22]/5 to-[#f39c12]/5 rounded-xl border border-[#e67e22]/20 p-6 text-center">
                    <div className="w-16 h-16 bg-[#e67e22]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaLock className="text-[#e67e22] text-2xl" />
                    </div>
                    <h4 className="font-bold text-stone-800 mb-2">Pro限定機能</h4>
                    <p className="text-sm text-stone-600 mb-4">
                      AI設定はProプランでご利用いただけます。<br />
                      旅のスタイルやカスタム指示を設定して、<br />
                      あなたにぴったりのプランを生成しましょう。
                    </p>
                    <a
                      href="/pricing"
                      onClick={onClose}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#e67e22] text-white font-bold rounded-full hover:bg-[#d35400] transition-all"
                    >
                      <FaCrown />
                      Proにアップグレード
                    </a>
                  </div>
                ) : isLoadingSettings || isLoadingBilling ? (
                  <div className="py-12 flex justify-center">
                    <FaSpinner className="animate-spin text-3xl text-[#e67e22]" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                      <label className="block text-sm font-bold text-stone-700 mb-2">
                        旅のスタイル
                      </label>
                      <div className="text-xs text-stone-500 mb-3 bg-stone-50 p-3 rounded-lg">
                        <p className="mb-1 font-bold">💡 ヒント</p>
                        AIがあなたの好みを理解するための参考情報です。
                        <ul className="list-disc list-inside mt-1 space-y-0.5 ml-1">
                          <li>「ゆったりと現地の空気を楽しみたい」</li>
                          <li>「とにかく美味しいものをたくさん食べたい」</li>
                          <li>「できるだけ費用を抑えて多くの場所を回りたい」</li>
                        </ul>
                      </div>
                      <textarea
                        value={travelStyle}
                        onChange={(e) => setTravelStyle(e.target.value)}
                        className="w-full h-32 p-4 rounded-lg border border-stone-300 focus:ring-2 focus:ring-[#e67e22] focus:border-transparent bg-white resize-none text-stone-800 placeholder-stone-400 transition-all"
                        placeholder="例：歴史的な場所が好きです。朝はゆっくりスタートしたいです..."
                      />
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                      <label className="block text-sm font-bold text-stone-700 mb-2">
                        カスタム指示（制約事項）
                      </label>
                      <div className="text-xs text-stone-500 mb-3 bg-stone-50 p-3 rounded-lg">
                        <p className="mb-1 font-bold">💡 ヒント</p>
                        AIに対して必ず守らせたい条件を入力してください。
                        <ul className="list-disc list-inside mt-1 space-y-0.5 ml-1">
                          <li>「美術館は含めないで」</li>
                          <li>「足が悪いので移動の少ないプランで」</li>
                          <li>「朝は10時以降に行動開始したい」</li>
                        </ul>
                      </div>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        className="w-full h-48 p-4 rounded-lg border border-stone-300 focus:ring-2 focus:ring-[#e67e22] focus:border-transparent bg-white resize-none text-stone-800 placeholder-stone-400 transition-all"
                        placeholder="ここに指示を入力..."
                      />
                    </div>

                    {settingsError && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                        <FaExclamationTriangle />
                        {settingsError}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="px-8 py-3 bg-[#e67e22] hover:bg-[#d35400] text-white rounded-full font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                      >
                        {isSaving ? (
                          <>
                            <FaSpinner className="animate-spin" /> 保存中...
                          </>
                        ) : (
                          <>
                            <FaSave /> 設定を保存
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-stone-800 mb-2">
                    アカウント設定
                  </h3>
                  <p className="text-stone-500 text-sm">
                    ユーザー情報の確認やアカウントの管理が行えます。
                  </p>
                </div>

                {/* User Info Card */}
                <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-5 shadow-sm">
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName || 'ユーザー'}
                      width={64}
                      height={64}
                      className="rounded-full ring-4 ring-stone-100"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#e67e22]/10 ring-4 ring-stone-100 flex items-center justify-center">
                      <span className="text-[#e67e22] text-2xl font-bold">
                        {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg text-stone-800 truncate">
                      {user?.displayName || 'ユーザー'}
                    </h4>
                    <p className="text-stone-500 truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Plan Management */}
                <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
                  <h4 className="font-bold text-stone-800 flex items-center gap-2">
                    <FaCreditCard className="text-[#e67e22]" />
                    プラン管理
                  </h4>

                  {isLoadingBilling ? (
                    <div className="flex justify-center py-4">
                      <FaSpinner className="animate-spin text-[#e67e22]" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                        <div>
                          <p className="text-sm text-stone-500">現在のプラン</p>
                          <div className="flex items-center gap-2 mt-1">
                            {billingStatus?.isSubscribed ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-[#e67e22] to-[#f39c12] text-white text-sm font-bold rounded-full">
                                  <FaCrown className="text-xs" />
                                  Pro
                                </span>
                                {billingStatus.subscriptionEndsAt && (
                                  <span className="text-xs text-stone-500">
                                    次回更新: {new Date(billingStatus.subscriptionEndsAt).toLocaleDateString('ja-JP')}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 bg-stone-200 text-stone-600 text-sm font-medium rounded-full">
                                Free
                              </span>
                            )}
                          </div>
                        </div>
                        {billingStatus?.ticketCount && billingStatus.ticketCount > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-stone-500">回数券</p>
                            <p className="text-lg font-bold text-[#e67e22]">{billingStatus.ticketCount}回</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        {billingStatus?.isSubscribed ? (
                          <button
                            onClick={handleManageSubscription}
                            disabled={isRedirectingToPortal}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors disabled:opacity-50"
                          >
                            {isRedirectingToPortal ? (
                              <>
                                <FaSpinner className="animate-spin" />
                                <span>読み込み中...</span>
                              </>
                            ) : (
                              <>
                                <FaCog className="text-stone-500" />
                                <span>プランを管理</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <a
                            href="/pricing"
                            onClick={onClose}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#e67e22] text-white rounded-xl font-bold hover:bg-[#d35400] transition-colors"
                          >
                            <FaCrown />
                            <span>Proにアップグレード</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all group"
                  >
                    <span className="font-bold text-stone-700">ログアウト</span>
                    <FaSignOutAlt className="text-stone-400 group-hover:text-stone-600" />
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="pt-6 border-t border-dashed border-stone-200">
                  <h4 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                    <FaExclamationTriangle /> 危険なエリア
                  </h4>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      アカウントを削除する
                    </button>
                  ) : (
                    <div className="bg-red-50 rounded-xl p-5 border border-red-100 animate-in fade-in zoom-in-95">
                      <h5 className="font-bold text-red-800 mb-2">
                        本当に削除しますか？
                      </h5>
                      <p className="text-sm text-red-700/80 mb-4">
                        保存したすべての旅行プランが削除され、復元することはできません。<br/>
                        確認のため、下に「削除する」と入力してください。
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="削除する"
                        className="w-full px-3 py-2 border border-red-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="px-4 py-2 bg-white text-stone-600 rounded-lg text-sm font-bold border border-stone-200 hover:bg-stone-50"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText !== '削除する' || isDeletingAccount}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isDeletingAccount ? (
                            <>
                              <FaSpinner className="animate-spin" /> 削除中...
                            </>
                          ) : (
                            <>
                              <FaTrash /> アカウント削除
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
