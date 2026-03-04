"use client";

import { useTransition } from "react";

import type { PricingPlanInfo, PurchaseType } from "@/types/billing";

interface PricingCardProps {
  plan: PricingPlanInfo;
  language: "ja" | "en";
  isCurrentPlan?: boolean;
  isLoggedIn: boolean;
  isLoading?: boolean;
  onPurchase: (planType: PurchaseType) => void;
  onLoginRequired: () => void;
  onManageSubscription?: () => void;
}

export function PricingCard({
  plan,
  language,
  isCurrentPlan = false,
  isLoggedIn,
  isLoading,
  onPurchase,
  onLoginRequired,
  onManageSubscription,
}: PricingCardProps) {
  const [isPending, startTransition] = useTransition();
  const planText =
    language === "ja"
      ? null
      : {
          free: {
            description: "Start for free",
            features: [
              "Up to 3 plan generations per month",
              "Travel info: once per week, 3 categories",
              "Unlimited plan saves",
              "Static map display",
            ],
            button: "Current plan",
          },
          pro_monthly: {
            description: "More convenience for trip planning",
            features: [
              "Up to 30 plan generations per month",
              "Unlimited plan saves",
              "Travel info: 10 times/month, 3 categories",
              "Places details: 10 spots/plan",
              "Flight/hotel suggestions: 3",
              "Interactive Leaflet map",
            ],
            button: "Choose this plan",
          },
          premium_monthly: {
            description: "Unlock all features",
            features: [
              "Up to 100 plan generations per month",
              "Unlimited plan saves",
              "Unlimited travel info, all categories",
              "Unlimited Places details",
              "Flight/hotel suggestions: 7",
              "Full Google Maps features",
              "AI provider switch (Gemini/OpenAI)",
              "View travel info and packing list in plan",
              "AI settings (style + custom instructions)",
            ],
            button: "Choose this plan",
          },
        };
  const localizedPlan = planText?.[plan.id as "free" | "pro_monthly" | "premium_monthly"];
  const description = localizedPlan?.description ?? plan.description;
  const features = localizedPlan?.features ?? plan.features;
  const planButtonLabel = localizedPlan?.button ?? plan.buttonLabel;

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
        return language === "ja" ? "ログインして始める" : "Log in to start";
      }
      return isCurrentPlan
        ? (language === "ja" ? "現在のプラン" : "Current plan")
        : (language === "ja" ? "無料で始める" : "Start free");
    }
    if (isCurrentPlan) {
      return language === "ja" ? "プランを管理" : "Manage plan";
    }
    if (!isLoggedIn) {
      return language === "ja" ? "ログインして購入" : "Log in to purchase";
    }
    return planButtonLabel;
  };

  // ログインしていない場合はFreeプランも押せるようにする
  const isDisabled = (plan.id === "free" && isLoggedIn) || isPending;

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
            {language === "ja" ? "おすすめ" : "Recommended"}
          </span>
        </div>
      )}

      {isCurrentPlan && plan.id !== "free" && (
        <div className="absolute -top-3 right-4">
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            {language === "ja" ? "現在のプラン" : "Current plan"}
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
            {language === "ja" ? "/ 月" : "/ mo"}
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
            {language === "ja" ? "処理中..." : "Processing..."}
          </span>
        ) : (
          getButtonLabel()
        )}
      </button>
    </div>
  );
}
