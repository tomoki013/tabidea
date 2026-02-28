"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PricingCard } from "./PricingCard";
import { TicketCard } from "./TicketCard";
import { TierComparisonTable } from "./TierComparisonTable";
import { FAQSection } from "@/components/features/landing";
import { createCheckoutSession } from "@/app/actions/stripe/checkout";
import { createPortalSession } from "@/app/actions/stripe/portal";
import { PRICING_PLANS, TICKET_PLANS } from "@/lib/billing/pricing-plans";
import { PRO_PLAN_NAME, PREMIUM_PLAN_NAME } from "@/lib/billing/constants";

import type { UserBillingStatus, PurchaseType } from "@/types/billing";

interface PricingPageClientProps {
  isLoggedIn: boolean;
  billingStatus: UserBillingStatus | null;
}

export function PricingPageClient({
  isLoggedIn,
  billingStatus,
}: PricingPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "checkout_failed"
      ? "決済処理に失敗しました。もう一度お試しください。"
      : null,
  );

  const handlePurchase = async (planType: PurchaseType) => {
    if (planType === "free") return;

    // 既にサブスク中の場合、同一プラン購入を防ぐ
    if (billingStatus?.isSubscribed && (planType === billingStatus.planType)) {
      const currentName = billingStatus.planType.includes('premium') ? PREMIUM_PLAN_NAME : PRO_PLAN_NAME;
      setError(`既に${currentName}プランに加入しています。プラン管理からご確認ください。`);
      return;
    }

    setIsLoading(planType);
    setError(null);

    try {
      const result = await createCheckoutSession(
        planType as "pro_monthly" | "premium_monthly" | "premium_yearly" | "ticket_1" | "ticket_5" | "ticket_10",
      );

      if (result.success && result.url) {
        window.location.href = result.url;
      } else if (result.error === "not_authenticated") {
        router.push("/auth/login?redirect=/pricing");
      } else if (result.error === "already_subscribed") {
        setError(
          `既に${currentPlanName}プランに加入しています。プラン管理からご確認ください。`,
        );
        // ページをリロードして最新状態を表示
        router.refresh();
      } else if (result.error === "configuration_error") {
        setError("決済設定が未完了です。時間をおいて再度お試しください。");
      } else if (result.error === "invalid_plan") {
        setError("選択したプラン情報が無効です。ページを再読み込みしてください。");
      } else {
        console.error("Checkout failed with error code:", result.error);
        setError("決済処理に失敗しました。もう一度お試しください。");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError("予期せぬエラーが発生しました。");
    } finally {
      setIsLoading(null);
    }
  };

  const handleLoginRequired = () => {
    router.push("/auth/login?redirect=/pricing");
  };

  const handleManageSubscription = async () => {
    setIsLoading("manage");
    setError(null);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else if (result.error === 'not_authenticated') {
        router.push("/auth/login?redirect=/pricing");
      } else if (result.error === 'no_subscription') {
        setError("サブスクリプション情報が見つかりません。まずプランにご加入ください。");
      } else if (result.error === 'portal_not_configured') {
        setError("カスタマーポータルの設定が完了していません。管理者にお問い合わせください。");
      } else {
        setError("ポータルの読み込みに失敗しました。しばらくしてからもう一度お試しください。");
      }
    } catch (err) {
      console.error("Portal error:", err);
      setError("ポータルの読み込みに失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setIsLoading(null);
    }
  };

  const isSubscribed = billingStatus?.isSubscribed === true;
  const currentPlanType = billingStatus?.planType;
  const currentPlanName = currentPlanType?.includes('premium')
    ? PREMIUM_PLAN_NAME
    : currentPlanType === 'pro_monthly' ? PRO_PLAN_NAME : 'Free';

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      <div className="max-w-6xl mx-auto px-4 pt-32 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-4">
            料金プラン
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            あなたの旅行スタイルに合わせたプランをお選びください
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
              現在のプラン
            </h4>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg mb-4">
              <div>
                <div className="flex items-center gap-2">
                  {billingStatus.planType === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-800 text-white text-sm font-bold rounded-full">
                      管理者
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
                    次回更新: {new Date(billingStatus.subscriptionEndsAt).toLocaleDateString("ja-JP")}
                  </p>
                )}
              </div>
              {billingStatus.ticketCount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-stone-500">回数券</p>
                  <p className="text-lg font-bold text-primary">
                    {billingStatus.ticketCount}回
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
                  <span>読み込み中...</span>
                ) : (
                  <span>プランを管理・解約</span>
                )}
              </button>
            )}

            {!isSubscribed && billingStatus.planType !== 'admin' && (
              <p className="text-xs text-stone-400 text-center">
                下記のプランからアップグレードできます
              </p>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-stone-800 text-center mb-8">
            サブスクリプションプラン
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
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

        {/* Ticket Plans - Commented out as requested
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-stone-800 mb-2">回数券</h2>
            <p className="text-sm text-stone-600">
              サブスクリプションなしで、必要な分だけ購入できます
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {TICKET_PLANS.map((plan) => (
              <TicketCard
                key={plan.id}
                plan={plan}
                isLoggedIn={isLoggedIn}
                isLoading={isLoading === plan.id}
                onPurchase={handlePurchase}
                onLoginRequired={handleLoginRequired}
              />
            ))}
          </div>
        </div>
        */}

        {/* Feature Comparison — 3-tier table */}
        <div className="max-w-4xl mx-auto mb-16">
          <TierComparisonTable />
        </div>

        {/* FAQ - Using generic component */}
        <FAQSection categoryId="billing" />

        {/* Legal Links */}
        <div className="mt-12 text-center text-sm text-stone-500">
          <a href="/specified" className="hover:text-[#e67e22] underline">
            特定商取引法に基づく表記
          </a>
          <span className="mx-2">|</span>
          <a href="/terms" className="hover:text-[#e67e22] underline">
            利用規約
          </a>
          <span className="mx-2">|</span>
          <a href="/privacy" className="hover:text-[#e67e22] underline">
            プライバシーポリシー
          </a>
        </div>
      </div>
    </div>
  );
}

