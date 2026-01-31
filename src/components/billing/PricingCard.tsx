"use client";

import { useTransition } from "react";

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
  isLoading,
  onPurchase,
  onLoginRequired,
  onManageSubscription,
}: PricingCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // Freeプランの場合は何もしない
    if (plan.id === "free") {
      return;
    }

    // 現在のProプランユーザーの場合はポータルへ
    if (isCurrentPlan && plan.id === "pro_monthly" && onManageSubscription) {
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
      return isCurrentPlan ? "現在のプラン" : "無料で始める";
    }
    if (isCurrentPlan && plan.id === "pro_monthly") {
      return "プランを管理";
    }
    if (!isLoggedIn) {
      return "ログインして購入";
    }
    return plan.buttonLabel;
  };

  const isDisabled = plan.id === "free" || isPending;

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
            おすすめ
          </span>
        </div>
      )}

      {isCurrentPlan && plan.id !== "free" && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            現在のプラン
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-stone-800">{plan.name}</h3>
        <p className="text-sm text-stone-500">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-bold text-stone-800">
          {plan.priceDisplay}
        </span>
        {plan.id === "pro_monthly" && (
          <span className="text-sm text-stone-500 ml-1">/ 月</span>
        )}
      </div>

      <ul className="flex-1 space-y-3 mb-6">
        {plan.features.map((feature, index) => (
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
          plan.id === "free"
            ? "bg-stone-100 text-stone-400 cursor-default"
            : isCurrentPlan && plan.id === "pro_monthly"
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
            処理中...
          </span>
        ) : (
          getButtonLabel()
        )}
      </button>
    </div>
  );
}
