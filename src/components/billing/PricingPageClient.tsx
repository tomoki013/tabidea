"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

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
  resolveRegionalLocale,
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
  const t = useTranslations("components.billing.pricingPage");
  const router = useRouter();
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "checkout_failed"
      ? t("checkoutFailed")
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
      setError(t("adminCannotPurchase"));
      return;
    }

    // 既にサブスク中の場合、同一プラン購入を防ぐ
    if (billingStatus?.isSubscribed && (planType === billingStatus.planType)) {
      const currentName = resolvePlanDisplayName({
        planType: billingStatus.planType,
        isSubscribed: billingStatus.isSubscribed,
        isAdmin: billingStatus.isAdmin,
      });
      setError(t("alreadySubscribed", { name: currentName }));
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
              : t("paidFallback"));

        setError(t("alreadySubscribed", { name: resolvedPlanName }));
        // ページをリロードして最新状態を表示
        router.refresh();
      } else if (result.error === "configuration_error") {
        setError(t("configError"));
      } else if (result.error === "invalid_plan") {
        setError(t("invalidPlan"));
      } else {
        console.error("Checkout failed with error code:", result.error);
        setError(t("checkoutFailed"));
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(t("unexpectedError"));
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
        setError(t("noSubscription"));
      } else if (result.error === 'portal_not_configured') {
        setError(t("portalNotConfigured"));
      } else {
        setError(t("portalLoadFailed"));
      }
    } catch (err) {
      console.error("Portal error:", err);
      setError(t("portalLoadFailed"));
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
            {t("title")}
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            {t("subtitle")}
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
              {t("currentPlan")}
            </h4>

            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg mb-4">
              <div>
                <div className="flex items-center gap-2">
                  {billingStatus.planType === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-stone-800 text-white text-sm font-bold rounded-full">
                      {t("admin")}
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
                    {t("nextBilling")}: {new Date(billingStatus.subscriptionEndsAt).toLocaleDateString(
                      resolveRegionalLocale(language)
                    )}
                  </p>
                )}
              </div>
              {billingStatus.ticketCount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-stone-500">{t("ticketPack")}</p>
                  <p className="text-lg font-bold text-primary">
                    {billingStatus.ticketCount}{t("times")}
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
                  <span>{t("loading")}</span>
                ) : (
                  <span>{t("manageCancel")}</span>
                )}
              </button>
            )}

            {!isSubscribed && billingStatus.planType !== 'admin' && (
              <p className="text-xs text-stone-400 text-center">
                {t("upgradeHint")}
              </p>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-stone-800 text-center mb-8">
            {t("subscriptionPlans")}
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

        {/* Feature Comparison — 3-tier table */}
        <div className="max-w-4xl mx-auto mb-16">
          <TierComparisonTable />
        </div>

        {/* FAQ - Using generic component */}
        <FAQSection categoryId="billing" />

        <div className="mt-10 text-center text-xs text-stone-500 max-w-2xl mx-auto leading-relaxed">
          {t("subscriptionNote")}
          <br />
          {t("refundPolicyPrefix")}{" "}
          <a href={localizePath("/specified", language)} className="underline hover:text-[#e67e22]">
            {t("refundPolicyLink")}
          </a>
          {t("refundPolicySuffix")}
        </div>

        {/* Legal Links */}
        <div className="mt-12 text-center text-sm text-stone-500">
          <a href={localizePath("/specified", language)} className="hover:text-[#e67e22] underline">
            {t("specified")}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/terms", language)} className="hover:text-[#e67e22] underline">
            {t("terms")}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/privacy", language)} className="hover:text-[#e67e22] underline">
            {t("privacy")}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/ai-policy", language)} className="hover:text-[#e67e22] underline">
            {t("aiPolicy")}
          </a>
          <span className="mx-2">|</span>
          <a href={localizePath("/cookie-policy", language)} className="hover:text-[#e67e22] underline">
            {t("cookiePolicy")}
          </a>
        </div>
      </div>
    </div>
  );
}

