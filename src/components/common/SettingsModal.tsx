"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useTheme } from "next-themes";
import { getUserSettings, updateUserSettings } from "@/app/actions/user-settings";
import { deleteAccount } from "@/app/actions/travel-planner";
import { getBillingAccessInfo, getUserUsageStats } from "@/app/actions/billing";
import type { UsageStats } from "@/app/actions/billing";
import { createPortalSession } from "@/app/actions/stripe/portal";
import { useAuth } from "@/context/AuthContext";
import { canAccess, resolvePlanDisplayName } from "@/lib/billing/plan-catalog";
import {
  getDefaultRegionForLanguage,
  resolveRegionalLocale,
  type LanguageCode,
  type RegionCode,
} from "@/lib/i18n/locales";
import RegionSearchSelect from "@/components/common/RegionSearchSelect";
import HomeBaseCitySearchSelect from "@/components/common/HomeBaseCitySearchSelect";
import { resolveHomeBaseCityForRegion } from "@/lib/i18n/home-base-cities";
import {
  localizeHref,
  resolveLanguageFromPathname,
  switchLanguagePath,
} from "@/lib/i18n/navigation";
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
  FaSun,
  FaMoon,
  FaDesktop,
} from "react-icons/fa";
import { JournalSheet, Tape, Stamp, HandwrittenText, JournalButton } from "@/components/ui/journal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'account' | 'plan' | 'ai';
type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{
  value: ThemeOption;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "light", labelKey: "themeLight", icon: FaSun },
  { value: "dark", labelKey: "themeDark", icon: FaMoon },
  { value: "system", labelKey: "themeSystem", icon: FaDesktop },
];

const LANGUAGE_OPTIONS: Array<{ value: LanguageCode; labelKey: string }> = [
  { value: "ja", labelKey: "languageJa" },
  { value: "en", labelKey: "languageEn" },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tSettings = useTranslations("settings");
  const currentLanguage = resolveLanguageFromPathname(pathname);
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [mounted, setMounted] = useState(false);

  // AI Settings State
  const [customInstructions, setCustomInstructions] = useState("");
  const [travelStyle, setTravelStyle] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>("en");
  const [preferredRegion, setPreferredRegion] = useState<RegionCode>(
    getDefaultRegionForLanguage("en")
  );
  const [homeBaseCity, setHomeBaseCity] = useState(
    resolveHomeBaseCityForRegion(getDefaultRegionForLanguage("en"), "en")
  );
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
        window.location.href = `${localizeHref("/auth/login", currentLanguage)}?redirect=${encodeURIComponent(localizeHref("/pricing", currentLanguage))}`;
      } else if (result.error === 'no_subscription') {
        setPortalError(tSettings("errors.noSubscription"));
        setIsRedirectingToPortal(false);
      } else if (result.error === 'portal_not_configured') {
        setPortalError(tSettings("errors.portalNotConfigured"));
        setIsRedirectingToPortal(false);
      } else {
        setPortalError(tSettings("errors.portalLoadFailed"));
        setIsRedirectingToPortal(false);
      }
    } catch (e) {
      console.error("Failed to open portal:", e);
      setPortalError(tSettings("errors.portalLoadFailed"));
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
        const resolvedLanguage = result.settings.preferredLanguage || "en";
        setPreferredLanguage(resolvedLanguage);
        const resolvedRegion =
          result.settings.preferredRegion || getDefaultRegionForLanguage(resolvedLanguage);
        setPreferredRegion(resolvedRegion);
        setHomeBaseCity(
          resolveHomeBaseCityForRegion(
            resolvedRegion,
            resolvedLanguage,
            result.settings.homeBaseCity
          )
        );
      }
    } catch {
      setSettingsError(tSettings("errors.generic"));
    } finally {
      setIsLoadingSettings(false);
    }
  };

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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSettingsError(null);
    try {
      const result = await updateUserSettings({
        customInstructions,
        travelStyle,
        preferredLanguage,
        preferredRegion,
        homeBaseCity,
      });
      if (result.success) {
        if (preferredLanguage !== currentLanguage) {
          const nextPath = switchLanguagePath(pathname, preferredLanguage);
          router.push(nextPath);
        }
        onClose();
      } else {
        setSettingsError(result.error || tSettings("errors.saveFailed"));
      }
    } catch {
      setSettingsError(tSettings("errors.generic"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      router.push(localizeHref('/', currentLanguage));
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== tSettings("dangerZone.deleteConfirmKeyword")) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount();

      if (result.success) {
        await signOut();
        onClose();
        router.push(localizeHref('/', currentLanguage));
      } else {
        alert(result.error || tSettings("errors.deleteAccountFailed"));
        setIsDeletingAccount(false);
      }
    } catch {
      alert(tSettings("errors.generic"));
      setIsDeletingAccount(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const isPaidPlan = billingInfo?.isSubscribed ?? false;
  const isAdmin = billingInfo?.userType === 'admin';
  const isPaidOrAdmin = isPaidPlan || isAdmin;
  const currentPlanName = billingInfo
    ? resolvePlanDisplayName({
        planType: billingInfo.planType,
        isSubscribed: billingInfo.isSubscribed,
        isAdmin: billingInfo.isAdmin,
      })
    : tSettings("plan.freeLabel");
  const canUseTravelStyle = billingInfo ? canAccess(billingInfo.userType, "travel_style") : false;
  const selectedTheme: ThemeOption =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";
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
                  {tSettings("stampLine1")}<br/>{tSettings("stampLine2")}
               </Stamp>
            </div>

            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible no-scrollbar">
              <TabButton
                active={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
                icon={FaUserCog}
                label={tSettings("tabs.account")}
              />
              <TabButton
                active={activeTab === 'plan'}
                onClick={() => setActiveTab('plan')}
                icon={FaChartPie}
                label={tSettings("tabs.plan")}
              />
              <TabButton
                active={activeTab === 'ai'}
                onClick={() => setActiveTab('ai')}
                icon={FaRobot}
                label={tSettings("tabs.ai")}
              />
            </div>

            <div className="mt-auto hidden md:block pt-6 border-t border-stone-300 border-dashed">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-hand"
              >
                <FaTimes /> {tSettings("close")}
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
                      {tSettings("account.title")}
                    </HandwrittenText>
                  </div>

                  {/* User Info Card */}
                  <div className="bg-white rounded-sm border border-stone-200 p-6 flex items-center gap-5 shadow-sm transform -rotate-1">
                    <div className="relative">
                       {user?.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.displayName || tSettings("account.userFallback")}
                          width={64}
                          height={64}
                          className="rounded-full ring-4 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-stone-100 ring-4 ring-white flex items-center justify-center border border-stone-300 border-dashed">
                          <span className="text-stone-500 font-hand text-2xl font-bold">
                            {user?.displayName?.[0] || user?.email?.[0] || tSettings("account.userInitialFallback")}
                          </span>
                        </div>
                      )}
                      <Tape color="blue" position="top-center" className="w-16 h-4 -top-3 opacity-60" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <HandwrittenText className="font-bold text-lg text-stone-800 truncate">
                        {user?.displayName || tSettings("account.userFallback")}
                      </HandwrittenText>
                      <p className="text-stone-500 truncate font-mono text-sm">{user?.email}</p>
                    </div>
                  </div>

                  {/* Theme Settings */}
                  <div className="bg-white rounded-sm border border-stone-200 p-6 shadow-sm">
                    <h4 className="font-bold text-stone-800 mb-2 font-hand text-lg">
                      {tSettings("theme.title")}
                    </h4>
                    <p className="text-sm text-stone-500 mb-4 font-hand">
                      {tSettings("theme.description")}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {THEME_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isActive = selectedTheme === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            aria-pressed={isActive}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-sm border transition-all font-hand text-base
                              ${isActive
                                ? "bg-primary/10 border-primary/40 text-stone-900 shadow-sm"
                                : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                              }`}
                          >
                            <Icon className={isActive ? "text-primary" : "text-stone-400"} />
                            <span>{tSettings(option.labelKey)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Language & Region Settings */}
                  <div className="bg-white rounded-sm border border-stone-200 p-6 shadow-sm space-y-4">
                    <h4 className="font-bold text-stone-800 mb-1 font-hand text-lg">
                      {tSettings("languageAndRegion")}
                    </h4>
                    <p className="text-sm text-stone-500 font-hand">
                      {tSettings("languageDescription")}
                    </p>
                    <p className="text-sm text-primary/90 bg-primary/5 border border-primary/20 rounded-sm px-3 py-2 font-hand">
                      {tSettings("languageAndRouteUsage")}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-stone-700 font-hand">
                          {tSettings("displayLanguage")}
                        </span>
                        <select
                          value={preferredLanguage}
                          onChange={(e) => {
                            const nextLanguage = e.target.value as LanguageCode;
                            const nextRegion = getDefaultRegionForLanguage(nextLanguage);
                            setPreferredLanguage(nextLanguage);
                            setPreferredRegion(nextRegion);
                            setHomeBaseCity(
                              resolveHomeBaseCityForRegion(nextRegion, nextLanguage)
                            );
                          }}
                          className="px-3 py-2 rounded-sm border border-stone-300 bg-white text-stone-700 font-hand focus:outline-none focus:border-primary"
                        >
                          {LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {tSettings(option.labelKey)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-stone-700 font-hand">
                          {tSettings("region")}
                        </span>
                        <RegionSearchSelect
                          language={preferredLanguage}
                          value={preferredRegion}
                          onChange={(nextRegion) => {
                            setPreferredRegion(nextRegion);
                            setHomeBaseCity(
                              resolveHomeBaseCityForRegion(nextRegion, preferredLanguage)
                            );
                          }}
                        />
                      </div>

                      <label className="flex flex-col gap-2 md:col-span-2">
                        <span className="text-sm font-bold text-stone-700 font-hand">
                          {tSettings("homeBaseCity")}
                        </span>
                        <HomeBaseCitySearchSelect
                          language={preferredLanguage}
                          region={preferredRegion}
                          value={homeBaseCity}
                          onChange={setHomeBaseCity}
                          contactHref={localizeHref("/contact", currentLanguage)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-4">
                    <JournalButton
                      variant="outline"
                      onClick={handleSignOut}
                      className="w-full justify-between"
                    >
                      <span>{tSettings("account.logout")}</span>
                      <FaSignOutAlt className="text-stone-400" />
                    </JournalButton>
                  </div>

                  {/* Danger Zone */}
                  <div className="pt-6 border-t-2 border-stone-200 border-dashed">
                    <HandwrittenText className="font-bold text-red-500 mb-4 flex items-center gap-2">
                      <FaExclamationTriangle /> {tSettings("dangerZone.title")}
                    </HandwrittenText>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-500 text-sm font-hand underline decoration-dashed hover:text-red-700"
                      >
                        {tSettings("dangerZone.openDeleteButton")}
                      </button>
                    ) : (
                      <div className="bg-red-50/50 rounded-sm p-5 border border-red-200 border-dashed relative">
                        <Tape color="red" position="top-right" rotation="right" className="opacity-70" />
                        <h5 className="font-bold text-red-800 mb-2 font-hand">
                          {tSettings("dangerZone.deleteConfirmTitle")}
                        </h5>
                        <p className="text-sm text-red-700/80 mb-4 font-hand">
                          {tSettings("dangerZone.deleteConfirmLine1")}<br/>
                          {tSettings("dangerZone.deleteConfirmLine2", {
                            keyword: tSettings("dangerZone.deleteConfirmKeyword"),
                          })}
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder={tSettings("dangerZone.deleteConfirmKeyword")}
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
                            {tSettings("dangerZone.cancel")}
                          </JournalButton>
                          <JournalButton
                            variant="primary"
                            onClick={handleDeleteAccount}
                            disabled={
                              deleteConfirmText !== tSettings("dangerZone.deleteConfirmKeyword") ||
                              isDeletingAccount
                            }
                            className="flex-1 bg-red-600 border-red-800 text-white hover:bg-red-700"
                          >
                            {isDeletingAccount ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                            {tSettings("dangerZone.deleteAction")}
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
                      {tSettings("plan.title")}
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
                          {tSettings("plan.currentPlanTitle")}
                        </h4>

                        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-sm mb-4 border border-stone-100">
                          <div>
                            <div className="flex items-center gap-2">
                              {isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-800 text-white text-sm font-bold rounded-sm transform -rotate-1">
                                  <FaUserCog className="text-xs" />
                                  {tSettings("plan.adminBadge")}
                                </span>
                              ) : isPaidOrAdmin ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-sm font-bold rounded-sm transform -rotate-1 shadow-sm border border-primary/20">
                                  <FaCrown className="text-xs" />
                                  {currentPlanName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 bg-stone-200 text-stone-600 text-sm font-bold rounded-sm transform rotate-1">
                                  {tSettings("plan.freeLabel")}
                                </span>
                              )}
                            </div>
                            {isPaidPlan && billingInfo?.subscriptionEndsAt && (
                              <p className="text-xs text-stone-500 mt-2 font-mono">
                                {tSettings("plan.nextRenewal")}{" "}
                                {new Date(billingInfo.subscriptionEndsAt).toLocaleDateString(
                                  resolveRegionalLocale(currentLanguage, preferredRegion)
                                )}
                              </p>
                            )}
                          </div>
                          {billingInfo?.ticketCount && billingInfo.ticketCount > 0 ? (
                            <div className="text-right">
                              <p className="text-sm text-stone-500 font-hand">{tSettings("plan.ticketRemaining")}</p>
                              <p className="text-xl font-bold text-primary font-hand">
                                {tSettings("plan.ticketCountValue", { count: billingInfo.ticketCount })}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          {isAdmin ? (
                             <div className="w-full text-center text-sm text-stone-500 bg-stone-100 p-3 rounded-sm font-hand">
                               {tSettings("plan.adminAccount")}
                             </div>
                          ) : isPaidOrAdmin ? (
                            <JournalButton
                              variant="outline"
                              onClick={handleManageSubscription}
                              disabled={isRedirectingToPortal}
                              className="flex-1"
                            >
                              {isRedirectingToPortal ? (
                                <>
                                  <FaSpinner className="animate-spin mr-2" />
                                  {tSettings("plan.loading")}
                                </>
                              ) : (
                                <>
                                  <FaCog className="text-stone-400 mr-2" />
                                  {tSettings("plan.manageSubscription")}
                                </>
                              )}
                            </JournalButton>
                          ) : (
                            <a href={localizeHref("/pricing", currentLanguage)} onClick={onClose} className="flex-1">
                               <JournalButton variant="primary" className="w-full">
                                  <FaCrown className="mr-2" />
                                  {tSettings("plan.upgrade")}
                               </JournalButton>
                            </a>
                          )}
                        </div>
                        {portalError && (
                          <p className="mt-3 text-sm text-red-600 font-hand">{portalError}</p>
                        )}
                      </div>

                      {/* Usage Stats */}
                      {usageStats && (
                        <div className="bg-white rounded-sm border border-stone-200 p-6 shadow-sm relative">
                          <Tape color="green" position="top-right" rotation="right" className="opacity-80" />
                          <h4 className="font-bold text-stone-800 flex items-center gap-2 mb-4 font-hand">
                            <FaChartPie className="text-primary" />
                            {tSettings("plan.usageTitle")}
                          </h4>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <UsageStatCard
                              title={tSettings("plan.planGeneration")}
                              current={usageStats.planGeneration.current}
                              limit={usageStats.planGeneration.limit}
                              resetAt={usageStats.planGeneration.resetAt}
                              resetPrefix={tSettings("plan.limitReset")}
                              unlimitedLabel={tSettings("plan.unlimited")}
                              locale={resolveRegionalLocale(currentLanguage, preferredRegion)}
                            />
                            <UsageStatCard
                              title={tSettings("plan.travelInfo")}
                              current={usageStats.travelInfo.current}
                              limit={usageStats.travelInfo.limit}
                              resetAt={usageStats.travelInfo.resetAt}
                              resetPrefix={tSettings("plan.limitReset")}
                              unlimitedLabel={tSettings("plan.unlimited")}
                              locale={resolveRegionalLocale(currentLanguage, preferredRegion)}
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
                      {tSettings("ai.title")}
                      {isPaidOrAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-sm border border-primary/20 transform -rotate-2">
                          <FaCrown className="text-[0.6rem]" />
                          {currentPlanName}
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
                      <div className="bg-primary/5 border border-primary/20 rounded-sm p-4 text-sm text-stone-700 font-hand">
                        {tSettings("aiOutputAndRoutePolicy")}
                      </div>

                      {/* Custom Instructions */}
                      <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-sm relative">
                        <Tape color="blue" position="top-left" rotation="left" className="opacity-60 w-16 h-4" />
                        <label className="block text-sm font-bold text-stone-700 mb-2 font-hand">
                          {tSettings("ai.customInstructionsLabel")}
                        </label>
                        <div className="text-xs text-stone-500 mb-3 bg-stone-50 p-3 rounded-sm border-l-4 border-stone-300">
                          <p className="mb-1 font-bold font-hand">{tSettings("ai.customInstructionsHintTitle")}</p>
                          <span className="font-hand">
                             {tSettings("ai.customInstructionsHintBody")}
                          </span>
                        </div>
                        <textarea
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          className="w-full h-32 p-3 bg-transparent border-b-2 border-stone-300 focus:border-primary focus:outline-none resize-none font-hand text-lg leading-relaxed"
                          placeholder={tSettings("ai.customInstructionsPlaceholder")}
                        />
                      </div>

                      {/* Travel Style */}
                      <div className="bg-white p-5 rounded-sm border border-stone-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-bold text-stone-700 font-hand">
                            {tSettings("ai.travelStyleLabel")}
                          </label>
                          {!canUseTravelStyle && (
                            <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-sm border border-primary/20 flex items-center gap-1">
                              <FaLock size={10} /> {tSettings("ai.travelStyleLocked")}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <textarea
                            value={travelStyle}
                            onChange={(e) => setTravelStyle(e.target.value)}
                            disabled={!canUseTravelStyle}
                            className={`w-full h-32 p-3 bg-transparent border-b-2 focus:outline-none resize-none font-hand text-lg leading-relaxed transition-all
                              ${!canUseTravelStyle
                                ? "border-stone-200 text-stone-300 cursor-not-allowed"
                                : "border-stone-300 focus:border-primary text-stone-800"
                              }`}
                            placeholder={
                              !canUseTravelStyle
                                ? tSettings("ai.travelStyleLockedPlaceholder")
                                : tSettings("ai.travelStylePlaceholder")
                            }
                          />

                          {!canUseTravelStyle && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                              <a href={localizeHref("/pricing", currentLanguage)} onClick={onClose}>
                                <JournalButton variant="primary" size="sm">
                                   <FaCrown className="mr-2" />
                                   {tSettings("plan.upgrade")}
                                </JournalButton>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        {settingsError && (
                          <p className="mr-auto text-sm text-red-600 font-hand self-center">
                            {settingsError}
                          </p>
                        )}
                        <JournalButton
                          variant="primary"
                          onClick={handleSaveSettings}
                          disabled={isSaving}
                          className="shadow-md"
                        >
                          {isSaving ? (
                            <>
                              <FaSpinner className="animate-spin mr-2" /> {tSettings("saving")}
                            </>
                          ) : (
                            <>
                              <FaSave className="mr-2" /> {tSettings("save")}
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

function UsageStatCard({
  title,
  current,
  limit,
  resetAt,
  resetPrefix,
  unlimitedLabel,
  locale,
}: {
  title: string;
  current: number;
  limit: number;
  resetAt: Date | null;
  resetPrefix: string;
  unlimitedLabel: string;
  locale: string;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);

  return (
    <div className="bg-stone-50 p-4 rounded-sm border border-stone-200 border-dashed">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-stone-700 text-sm font-hand">{title}</span>
        {resetAt && (
          <span className="text-[10px] text-stone-400 font-mono">
            {resetPrefix}: {resetAt.toLocaleDateString(locale)}
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
          <FaCheckCircle /> {unlimitedLabel}
        </div>
      )}
    </div>
  );
}
