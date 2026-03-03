"use client";

import { useTransition } from "react";

import type { PricingPlanInfo, PurchaseType } from "@/types/billing";

interface TicketCardProps {
  plan: PricingPlanInfo;
  isLoggedIn: boolean;
  isLoading: boolean;
  onPurchase: (planType: PurchaseType) => void;
  onLoginRequired: () => void;
}

export function TicketCard({
  plan,
  isLoggedIn,
  isLoading,
  onPurchase,
  onLoginRequired,
}: TicketCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }

    startTransition(() => {
      onPurchase(plan.id);
    });
  };

  return (
    <div
      className={`relative flex flex-col p-5 bg-white rounded-xl border-2 transition-all ${
        plan.isRecommended
          ? "border-primary shadow-lg"
          : "border-stone-200 shadow-md hover:shadow-lg"
      }`}
    >
      {plan.isRecommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-full">
            お得
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-bold text-stone-800">{plan.name}</h4>
          <p className="text-xs text-stone-500">{plan.description}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-stone-800">
            {plan.priceDisplay}
          </span>
        </div>
      </div>

      <ul className="flex-1 space-y-1.5 mb-4 text-xs text-stone-600">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
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
        disabled={isPending}
        className={`w-full py-2 px-3 rounded-lg font-bold text-sm transition-colors ${
          plan.isRecommended
            ? "bg-primary text-white hover:bg-primary/90"
            : "bg-stone-100 text-stone-700 hover:bg-stone-200"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
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
        ) : !isLoggedIn ? (
          "ログインして購入"
        ) : (
          plan.buttonLabel
        )}
      </button>
    </div>
  );
}
