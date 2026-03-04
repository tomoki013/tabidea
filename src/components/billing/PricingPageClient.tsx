"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PricingCard } from "./PricingCard";
import { TierComparisonTable } from "./TierComparisonTable";
import { FAQSection } from "@/components/features/landing";
import { createCheckoutSession } from "@/app/actions/stripe/checkout";
import { createPortalSession } from "@/app/actions/stripe/portal";
import { PRICING_PLANS } from "@/lib/billing/pricing-plans";
import { resolvePlanDisplayName, type CheckoutPlanType } from "@/lib/billing/plan-catalog";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
} from "@/lib/i18n/locales";

import type { BillingAccessInfo, PurchaseType } from "@/types/billing";

interface PricingPageClientProps {
  isLoggedIn: boolean;
  billingStatus: BillingAccessInfo | null;
}

export function PricingPageClient({
  isLoggedIn,
  billingStatus,
}: PricingPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const searchParams = useSearchParams();
  const text = language === "ja"
    ? {
        checkoutFailed: "決済処理に失敗しました。もう一度お試しください。",
        adminCannotPurchase: "管理者アカウントでは購入できません。",
        alreadySubscribed: (name: string) =>
          `既に${name}プランに加入しています。プラン管理からご確認ください。`,
        paidFallback: "有料",
        configError: "決済設定が未完了です。時間をおいて再度お試しください。",
        invalidPlan: "選択したプラン情報が無効です。ページを再読み込みしてください。",
        unexpectedError: "予期せぬエラーが発生しました。",
        noSubscription: "サブスクリプション情報が見つかりません。まずプランにご加入ください。",
        portalNotConfigured: "カスタマーポータルの設定が完了していません。管理者にお問い合わせください。",
        portalLoadFailed: "ポータルの読み込みに失敗しました。しばらくしてからもう一度お試しください。",
        title: "料金プラン",
        subtitle: "あなたの旅行スタイルに合わせたプランをお選びください",
        currentPlan: "現在のプラン",
        admin: "管理者",
        nextBilling: "次回更新",
        ticketPack: "回数券",
        times: "回",
        loading: "読み込み中...",
        manageCancel: "プランを管理・解約",
        upgradeHint: "下記のプランからアップグレードできます",
        subscriptionPlans: "サブスクリプションプラン",
        subscriptionNote:
          "サブスクリプションは月次自動更新です。解約後も請求期間終了まではご利用いただけます。",
        refundPolicyPrefix: "返金ポリシーは",
        refundPolicyLink: "特定商取引法に基づく表記",
        refundPolicySuffix: "をご確認ください。",
        specified: "特定商取引法に基づく表記",
        terms: "利用規約",
        privacy: "プライバシーポリシー",
        aiPolicy: "AIポリシー",
        cookiePolicy: "クッキーポリシー",
      }
    : {
        checkoutFailed: "Checkout failed. Please try again.",
        adminCannotPurchase: "Admin accounts cannot make purchases.",
        alreadySubscribed: (name: string) =>
          `You are already subscribed to ${name}. Please manage it from plan settings.`,
        paidFallback: "Paid",
        configError: "Payment configuration is incomplete. Please try again later.",
        invalidPlan: "Selected plan is invalid. Please reload this page.",
        unexpectedError: "An unexpected error occurred.",
        noSubscription: "No subscription found. Please subscribe to a plan first.",
        portalNotConfigured: "Customer portal is not configured yet. Please contact support.",
        portalLoadFailed: "Failed to load the customer portal. Please try again later.",
        title: "Pricing Plans",
        subtitle: "Choose a plan that matches your travel style",
        currentPlan: "Current plan",
        admin: "Admin",
        nextBilling: "Next billing",
        ticketPack: "Ticket pack",
        times: "times",
        loading: "Loading...",
        manageCancel: "Manage / Cancel plan",
        upgradeHint: "You can upgrade from the plans below",
        subscriptionPlans: "Subscription Plans",
        subscriptionNote:
          "Subscriptions auto-renew monthly. After cancellation, you can keep using features until the end of the billing period.",
        refundPolicyPrefix: "For refund policy, see",
        refundPolicyLink: "Legal Disclosure",
        refundPolicySuffix: ".",
        specified: "Legal Disclosure",
        terms: "Terms",
        privacy: "Privacy",
        aiPolicy: "AI Policy",
        cookiePolicy: "Cookie Policy",
      };
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "checkout_failed"
      ? text.checkoutFailed
      : null,
  );

  const isSubscribed = billingStatus?.isSubscribed === true;
  const currentPlanType = billingStatus?.planType;
  const currentPlanName = billingStatus
    ? resolvePlanDisplayName({
        planType: billingStatus.planType,
        isSubscribed: billingStatus.isSubscribed,
        isAdmin: billingStatus.isAdmin,
      })
    : "Free";

  const handlePurchase = async (planType: PurchaseType) => {
    if (planType === "free") return;
    if (billingStatus?.isAdmin) {
      setError(text.adminCannotPurchase);
      return;
    }

    // 既にサブスク中の場合、同一プラン購入を防ぐ
    if (billingStatus?.isSubscribed && (planType === billingStatus.planType)) {
      const currentName = resolvePlanDisplayName({
        planType: billingStatus.planType,
        isSubscribed: billingStatus.isSubscribed,
        isAdmin: billingStatus.isAdmin,
      });
      setError(text.alreadySubscribed(currentName));
      return;
    }

    setIsLoading(planType);
    setError(null);

    try {
      const result = await createCheckoutSession(
        planType as CheckoutPlanType,
      );

      if (result.success && result.url) {
        window.location.href = result.url;
      } else if (result.error === "not_authenticated") {
        router.push(`${localizePath("/auth/login", language)}?redirect=${encodeURIComponent(localizePath("/pricing", language))}`);
      } else if (result.error === "already_subscribed") {
        const resolvedPlanName =
          result.resolvedPlanName ||
          (result.resolvedPlanType
            ? resolvePlanDisplayName({
                planType: result.resolvedPlanType,
                isSubscribed: true,
                isAdmin: false,
              })
            : currentPlanName !== "Free"
              ? currentPlanName
              : text.paidFallback);

        setError(text.alreadySubscribed(resolvedPlanName));
        // ページをリロードして最新状態を表示
        router.refresh();
      } else if (result.error === "configuration_error") {
        setError(text.configError);
      } else if (result.error === "invalid_plan") {
        setError(text.invalidPlan);
      } else {
        console.error("Checkout failed with error code:", result.error);
        setError(text.checkoutFailed);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(text.unexpectedError);
    } finally {
      setIsLoading(null);
    }
  };

  const handleLoginRequired = () => {
    router.push(`${localizePath("/auth/login", language)}?redirect=${encodeURIComponent(localizePath("/pricing", language))}`);
  };

  const handleManageSubscription = async () => {
    setIsLoading("manage");
    setError(null);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else if (result.error === 'not_authenticated') {
        router.push(`${localizePath("/auth/login", language)}?redirect=${encodeURIComponent(localizePath("/pricing", language))}`);
      } else if (result.error === 'no_subscription') {
        setError(text.noSubscription);
      } else if (result.error === 'portal_not_configured') {
        setError(text.portalNotConfigured);
      } else {
        setError(text.portalLoadFailed);
      }
    } catch (err) {
      console.error("Portal error:", err);
      setError(text.portalLoadFailed);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      <div className="max-w-6xl mx-auto px-4 pt-32 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-4">
            {text.title}
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto">
            <p className="text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* Current Plan Status - matching SettingsModal format */}
        {isLoggedIn && billingStatus && (
          <div className="mb-8 bg-white rounded-xl border border-stone-200 shadow-sm max-w-md mx-auto p-6">
            <h4 className="font-bold text-stone-800 flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {text.currentPlan}
            </h4>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg mb-4">
              <div>
                <div className="flex items-center gap-2">
                  {billingStatus.planType === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-800 text-white text-sm font-bold rounded-full">
                      {text.admin}
                    </span>
                  ) : isSubscribed ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary to-[#f39c12] text-white text-sm font-bold rounded-full">
                      {currentPlanName}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-stone-200 text-stone-600 text-sm font-medium rounded-full">
                      Free
                    </span>
                  )}
                </div>
                {isSubscribed && billingStatus.subscriptionEndsAt && (
                  <p className="text-xs text-stone-500 mt-2">
                    {text.nextBilling}: {new Date(billingStatus.subscriptionEndsAt).toLocaleDateString(
                      language === "ja" ? "ja-JP" : "en-US"
                    )}
                  </p>
                )}
              </div>
              {billingStatus.ticketCount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-stone-500">{text.ticketPack}</p>
                  <p className="text-lg font-bold text-primary">
                    {billingStatus.ticketCount}{text.times}
                  </p>
                </div>
              )}
            </div>

            {isSubscribed && (
              <button
                onClick={handleManageSubscription}
                disabled={isLoading === "manage"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                {isLoading === "manage" ? (
                  <span>{text.loading}</span>
                ) : (
                  <span>{text.manageCancel}</span>
                )}
              </button>
            )}

            {!isSubscribed && billingStatus.planType !== 'admin' && (
              <p className="text-xs text-stone-400 text-center">
                {text.upgradeHint}
              </p>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-stone-800 text-center mb-8">
            {text.subscriptionPlans}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                language={language}
                isCurrentPlan={
                  (plan.id === "free" && !isSubscribed) ||
                  (plan.id === currentPlanType)
                }
                isLoggedIn={isLoggedIn}
                isLoading={isLoading === plan.id}
                onPurchase={handlePurchase}
                onLoginRequired={handleLoginRequired}
                onManageSubscription={handleManageSubscription}
              />
            ))}
          </div>
        </div>

        {/* Feature Comparison — 3-tier table */}
        <div className="max-w-4xl mx-auto mb-16">
          <TierComparisonTable language={language} />
        </div>

        {/* FAQ - Using generic component */}
        <FAQSection categoryId="billing" />

        <div className="mt-10 text-center text-xs text-stone-500 max-w-2xl mx-auto leading-relaxed">
          {text.subscriptionNote}
          <br />
          {text.refundPolicyPrefix}{" "}
          <a href={localizePath("/specified", language)} className="underline hover:text-[#e67e22]">
            {text.refundPolicyLink}
          </a>
          {text.refundPolicySuffix}
        </div>

        {/* Legal Links */}
        <div className="mt-12 text-center text-sm text-stone-500">
          <a href={localizePath("/specified", language)} className="hover:text-[#e67e22] underline">
            {text.specified}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/terms", language)} className="hover:text-[#e67e22] underline">
            {text.terms}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/privacy", language)} className="hover:text-[#e67e22] underline">
            {text.privacy}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/ai-policy", language)} className="hover:text-[#e67e22] underline">
            {text.aiPolicy}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/cookie-policy", language)} className="hover:text-[#e67e22] underline">
            {text.cookiePolicy}
          </a>
        </div>
      </div>
    </div>
  );
}

