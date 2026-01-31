"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PricingCard } from "./PricingCard";
import { TicketCard } from "./TicketCard";
import { createCheckoutSession } from "@/app/actions/stripe/checkout";
import { createPortalSession } from "@/app/actions/stripe/portal";
import { PRICING_PLANS, TICKET_PLANS } from "@/lib/billing/pricing-plans";

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

    // 既にProプランの場合、サブスク購入を防ぐ
    if (planType === "pro_monthly" && billingStatus?.isSubscribed) {
      setError("既にProプランに加入しています。プラン管理からご確認ください。");
      return;
    }

    setIsLoading(planType);
    setError(null);

    try {
      const result = await createCheckoutSession(
        planType as "pro_monthly" | "ticket_1" | "ticket_5" | "ticket_10",
      );

      if (result.success && result.url) {
        window.location.href = result.url;
      } else if (result.error === "not_authenticated") {
        router.push("/auth/login?redirect=/pricing");
      } else if (result.error === "already_subscribed") {
        setError(
          "既にProプランに加入しています。プラン管理からご確認ください。",
        );
        // ページをリロードして最新状態を表示
        router.refresh();
      } else {
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
    try {
      await createPortalSession();
    } catch (err) {
      console.error("Portal error:", err);
      setError("ポータルの読み込みに失敗しました。");
    } finally {
      setIsLoading(null);
    }
  };

  const isPro = billingStatus?.isSubscribed === true;

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

        {/* Current Plan Status */}
        {isLoggedIn && billingStatus && (
          <div className="mb-8 p-4 bg-white rounded-xl border border-stone-200 shadow-sm max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">現在のプラン</p>
                <p className="text-lg font-bold text-stone-800">
                  {isPro ? "Pro" : "Free"}
                </p>
              </div>
              {billingStatus.ticketCount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-stone-500">回数券残数</p>
                  <p className="text-lg font-bold text-primary">
                    {billingStatus.ticketCount}回
                  </p>
                </div>
              )}
            </div>
            {isPro && billingStatus.subscriptionEndsAt && (
              <p className="text-xs text-stone-500 mt-2">
                次回更新日:{" "}
                {new Date(billingStatus.subscriptionEndsAt).toLocaleDateString(
                  "ja-JP",
                )}
              </p>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        <div className="mb-16">
          <h2 className="text-xl font-bold text-stone-800 text-center mb-8">
            サブスクリプションプラン
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={
                  (plan.id === "free" && !isPro) ||
                  (plan.id === "pro_monthly" && isPro)
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

        {/* Ticket Plans */}
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

        {/* Feature Comparison */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-6 sm:p-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-stone-800 text-center mb-6">
            プラン比較
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 font-medium text-stone-600">
                    機能
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-stone-600">
                    Free
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-primary">
                    Pro
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-stone-600">
                    回数券
                  </th>
                </tr>
              </thead>
              <tbody>
                <FeatureRow
                  feature="プラン生成"
                  free="月3回"
                  pro="無制限"
                  ticket="購入分"
                />
                <FeatureRow
                  feature="渡航情報カテゴリ"
                  free="3カテゴリ"
                  pro="全カテゴリ"
                  ticket="3カテゴリ"
                />
                <FeatureRow
                  feature="渡航情報取得"
                  free="週1回"
                  pro="無制限"
                  ticket="週1回"
                />
                <FeatureRow
                  feature="プラン内渡航情報表示"
                  free={false}
                  pro={true}
                  ticket={false}
                />
                <FeatureRow
                  feature="プラン保存"
                  free="2件"
                  pro="無制限"
                  ticket="2件"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-stone-800 text-center mb-8">
            よくある質問
          </h2>
          <div className="space-y-4">
            <FaqItem
              question="回数券とProプランの違いは？"
              answer="Proプランはサブスクリプション形式で、プラン生成が無制限、全ての渡航情報カテゴリにアクセスでき、プラン内で渡航情報を直接閲覧できます。回数券は購入した回数分のプラン生成のみが可能で、渡航情報は無料ユーザーと同じ制限があります。"
            />
            <FaqItem
              question="回数券の有効期限は？"
              answer="1回券は30日、5回券は90日、10回券は180日です。期限内であれば複数回に分けて使用できます。"
            />
            <FaqItem
              question="Proプランはいつでも解約できますか？"
              answer="はい、いつでも解約できます。解約後も請求期間の終了まではProプランの機能をご利用いただけます。解約は設定画面の「プランを管理」から行えます。"
            />
            <FaqItem
              question="支払い方法は？"
              answer="クレジットカード（Visa, Mastercard, American Express, JCB）でお支払いいただけます。安全な決済はStripe社のシステムを利用しています。"
            />
          </div>
        </div>

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

function FeatureRow({
  feature,
  free,
  pro,
  ticket,
}: {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  ticket: string | boolean;
}) {
  const renderCell = (value: string | boolean) => {
    if (typeof value === "boolean") {
      return value ? (
        <svg
          className="w-5 h-5 text-green-500 mx-auto"
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
      ) : (
        <svg
          className="w-5 h-5 text-stone-300 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    }
    return <span>{value}</span>;
  };

  return (
    <tr className="border-b border-stone-100">
      <td className="py-3 px-4 text-stone-700">{feature}</td>
      <td className="py-3 px-4 text-center text-stone-600">
        {renderCell(free)}
      </td>
      <td className="py-3 px-4 text-center text-primary font-medium">
        {renderCell(pro)}
      </td>
      <td className="py-3 px-4 text-center text-stone-600">
        {renderCell(ticket)}
      </td>
    </tr>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-white rounded-xl border border-stone-200 overflow-hidden">
      <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors">
        <span className="font-medium text-stone-800">{question}</span>
        <svg
          className="w-5 h-5 text-stone-400 group-open:rotate-180 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>
      <div className="px-4 pb-4 text-sm text-stone-600">{answer}</div>
    </details>
  );
}
