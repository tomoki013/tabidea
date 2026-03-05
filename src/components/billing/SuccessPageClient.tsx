"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("components.billing.successPage");
  const { openModal } = usePlanModal();
  const resolvedPlanType = planType ?? "pro_monthly";
  const currentPlanName =
    resolvedPlanType === "premium_monthly" ? PREMIUM_PLAN_NAME : PRO_PLAN_NAME;
  const featureTier = resolvedPlanType === "premium_monthly" ? "premium" : "pro";
  const featureHighlights = [1, 2, 3, 4].map((index) =>
    t(`features.${featureTier}.${index}`)
  );

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
          {t("title")}
        </h1>
        <p className="text-stone-600 mb-2">
          {isSubscription
            ? t("messages.upgradeComplete", { planName: currentPlanName })
            : t("messages.ticketPackComplete")}
        </p>
        <p className="text-stone-500 text-sm mb-8">
          {t("messages.enjoy")}
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
            <span>{t("actions.createPlan")}</span>
          </button>
          <Link
            href={localizePath("/pricing", language)}
            className="w-full px-6 py-3 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
          >
            {t("actions.backToPricing")}
          </Link>
        </div>

        {/* Next Steps Card */}
        <div className="mt-10 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-800 mb-4 flex items-center justify-center gap-2">
            <span className="w-6 h-6 bg-[#e67e22]/10 rounded-full flex items-center justify-center">
              <FaRocket className="text-[#e67e22] text-xs" />
            </span>
            {t("nextSteps.title")}
          </h3>
          <ul className="text-sm text-stone-600 text-left space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#e67e22]/10 text-[#e67e22] rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </span>
              <span>{t("nextSteps.step1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#e67e22]/10 text-[#e67e22] rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </span>
              <span>{t("nextSteps.step2")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-[#e67e22]/10 text-[#e67e22] rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </span>
              <span>{t("nextSteps.step3")}</span>
            </li>
          </ul>
        </div>

        {/* Pro Features Highlight */}
        {isSubscription && (
          <div className="mt-6 p-4 bg-gradient-to-r from-[#e67e22]/5 to-[#f39c12]/5 rounded-xl border border-[#e67e22]/20">
            <h4 className="font-bold text-[#e67e22] mb-3 text-sm">
              {t("features.title", { planName: currentPlanName })}
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
