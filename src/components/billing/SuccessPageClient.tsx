"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlanModal } from "@/context/PlanModalContext";
import { FaCheck, FaRocket } from "react-icons/fa";
import { PRO_PLAN_NAME, PREMIUM_PLAN_NAME } from "@/lib/billing/constants";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
} from "@/lib/i18n/locales";
import type { SubscriptionPlanType } from "@/lib/billing/plan-catalog";

interface SuccessPageClientProps {
  sessionId?: string;
  isSubscription?: boolean;
  planType?: SubscriptionPlanType | null;
}

export default function SuccessPageClient({
  sessionId,
  isSubscription = true,
  planType = null,
}: SuccessPageClientProps) {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const { openModal } = usePlanModal();
  const resolvedPlanType = planType ?? "pro_monthly";
  const currentPlanName =
    resolvedPlanType === "premium_monthly" ? PREMIUM_PLAN_NAME : PRO_PLAN_NAME;
  const featureHighlights =
    language === "ja"
      ? (resolvedPlanType === "premium_monthly"
      ? [
          "月100回プラン生成",
          "渡航情報無制限・全カテゴリ",
          "Google Maps フル機能",
          "AIプロバイダー選択",
        ]
      : [
          "月30回プラン生成",
          "渡航情報 月10回",
          "Leafletインタラクティブマップ",
          "持ち物リスト生成",
        ])
      : (resolvedPlanType === "premium_monthly"
        ? [
            "100 plan generations / month",
            "Unlimited travel info (all categories)",
            "Full Google Maps features",
            "AI provider selection",
          ]
        : [
            "30 plan generations / month",
            "Travel info: 10 times / month",
            "Interactive Leaflet map",
            "Packing list generation",
          ]);

  const handleCreatePlan = () => {
    openModal();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] px-4 pt-32 pb-16">
      <div className="max-w-md w-full mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
            <FaCheck className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-4">
          {language === "ja" ? "ご購入ありがとうございます！" : "Thank you for your purchase!"}
        </h1>
        <p className="text-stone-600 mb-2">
          {isSubscription
            ? language === "ja"
              ? `${currentPlanName}プランへのアップグレードが完了しました。`
              : `Your upgrade to ${currentPlanName} is complete.`
            : language === "ja"
              ? "回数券の購入が完了しました。"
              : "Your ticket-pack purchase is complete."}
        </p>
        <p className="text-stone-500 text-sm mb-8">
          {language === "ja" ? "すべての機能をお楽しみください。" : "Enjoy all available features."}
        </p>

        {/* Session ID (for debugging) */}
        {sessionId && process.env.NODE_ENV === "development" && (
          <p className="text-xs text-stone-400 mb-6 break-all">
            Session ID: {sessionId}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCreatePlan}
            className="w-full px-6 py-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-[#d35400] transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <FaRocket />
            <span>{language === "ja" ? "さっそくプランを作成する" : "Create your first plan now"}</span>
          </button>
          <Link
            href={localizePath("/pricing", language)}
            className="w-full px-6 py-3 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
          >
            {language === "ja" ? "料金プランに戻る" : "Back to pricing"}
          </Link>
        </div>

        {/* Next Steps Card */}
        <div className="mt-10 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-800 mb-4 flex items-center justify-center gap-2">
            <span className="w-6 h-6 bg-[#e67e22]/10 rounded-full flex items-center justify-center">
              <FaRocket className="text-[#e67e22] text-xs" />
            </span>
            {language === "ja" ? "次のステップ" : "Next steps"}
          </h3>
          <ul className="text-sm text-stone-600 text-left space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#e67e22]/10 text-[#e67e22] rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </span>
              <span>{language === "ja" ? "行きたい場所や日程を入力" : "Enter destination and dates"}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#e67e22]/10 text-[#e67e22] rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </span>
              <span>{language === "ja" ? "AIが最適な旅行プランを生成" : "AI generates an optimized itinerary"}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#e67e22]/10 text-[#e67e22] rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </span>
              <span>{language === "ja" ? "プランを保存・共有" : "Save and share your plan"}</span>
            </li>
          </ul>
        </div>

        {/* Pro Features Highlight */}
        {isSubscription && (
          <div className="mt-6 p-4 bg-gradient-to-r from-[#e67e22]/5 to-[#f39c12]/5 rounded-xl border border-[#e67e22]/20">
            <h4 className="font-bold text-[#e67e22] mb-3 text-sm">
              {language === "ja"
                ? `${currentPlanName}プランで利用可能な機能`
                : `Features available in ${currentPlanName}`}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-stone-600">
              {featureHighlights.map((feature) => (
                <div key={feature} className="flex items-center gap-1.5">
                  <FaCheck className="text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
