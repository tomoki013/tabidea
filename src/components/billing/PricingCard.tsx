"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import type { PricingPlanInfo, PurchaseType } from "@/types/billing";

interface PricingCardProps {
  plan: PricingPlanInfo;
  isCurrentPlan?: boolean;
  isLoggedIn: boolean;
  isLoading?: boolean;
  onPurchase: (planType: PurchaseType) => void;
  onLoginRequired: () => void;
  onManageSubscription?: () => void;
}

export function PricingCard({
  plan,
  isCurrentPlan = false,
  isLoggedIn,
  isLoading = false,
  onPurchase,
  onLoginRequired,
  onManageSubscription,
}: PricingCardProps) {
  const t = useTranslations("components.billing.pricingCard");
  const [isPending, startTransition] = useTransition();

  const featureCounts: Partial<Record<PricingPlanInfo["id"], number>> = {
    free: 4,
    pro_monthly: 6,
    premium_monthly: 9,
  };
  const featureCount = featureCounts[plan.id];
  const features =
    typeof featureCount === "number"
      ? Array.from({ length: featureCount }, (_, index) =>
          t(`plans.${plan.id}.features.${index + 1}`)
        )
      : plan.features;
  const description = t.has(`plans.${plan.id}.description`)
    ? t(`plans.${plan.id}.description`)
    : plan.description;
  const planButtonLabel = t.has(`plans.${plan.id}.button`)
    ? t(`plans.${plan.id}.button`)
    : plan.buttonLabel;

  const handleClick = () => {
    // Freeプランの場合は何もしない（ログイン済の場合）
    if (plan.id === "free" && isLoggedIn) {
      return;
    }

    // 未ログインでFreeプラン選択の場合はログイン促進
    if (plan.id === "free" && !isLoggedIn) {
      onLoginRequired();
      return;
    }

    // 現在の有料プランは管理ポータルへ
    if (isCurrentPlan && onManageSubscription) {
      startTransition(() => {
        onManageSubscription();
      });
      return;
    }

    // 未ログインの場合はログイン促進
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }

    // 購入処理
    startTransition(() => {
      onPurchase(plan.id);
    });
  };

  const getButtonLabel = () => {
    if (plan.id === "free") {
      if (!isLoggedIn) {
        return t("buttons.loginToStart");
      }
      return isCurrentPlan
        ? t("buttons.currentPlan")
        : t("buttons.startFree");
    }
    if (isCurrentPlan) {
      return t("buttons.managePlan");
    }
    if (!isLoggedIn) {
      return t("buttons.loginToPurchase");
    }
    return planButtonLabel;
  };

  // ログインしていない場合はFreeプランも押せるようにする
  const isDisabled = (plan.id === "free" && isLoggedIn) || isPending || isLoading;

  return (
    <div
      className={`relative flex flex-col p-6 bg-white rounded-2xl border-2 transition-all ${
        plan.isRecommended
          ? "border-primary shadow-xl scale-105"
          : "border-stone-200 shadow-lg hover:shadow-xl"
      }`}
    >
      {plan.isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
            {t("badges.recommended")}
          </span>
        </div>
      )}

      {isCurrentPlan && plan.id !== "free" && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            {t("badges.currentPlan")}
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-stone-800">{plan.name}</h3>
        <p className="text-sm text-stone-500">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold text-stone-800">
          {plan.priceDisplay}
        </span>
        {plan.id === "pro_monthly" && (
          <span className="text-sm text-stone-500 ml-1">
            {t("price.monthSuffix")}
          </span>
        )}
      </div>

      <ul className="flex-1 space-y-3 mb-6">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-stone-600"
          >
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full py-3 px-4 rounded-xl font-bold transition-colors ${
          plan.id === "free" && isLoggedIn
            ? "bg-stone-100 text-stone-400 cursor-default" // ログイン済みFreeプラン（無効）
            : plan.id === "free" && !isLoggedIn
              ? "bg-stone-800 text-white hover:bg-stone-700" // 未ログインFreeプラン（有効・ログインへ）
              : isCurrentPlan && plan.id !== "free"
                ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                : plan.isRecommended
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-stone-800 text-white hover:bg-stone-700"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t("processing")}
          </span>
        ) : (
          getButtonLabel()
        )}
      </button>
    </div>
  );
}
