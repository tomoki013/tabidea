import type { Metadata } from "next";
import { stripe } from "@/lib/stripe/client";
import SuccessPageClient from "@/components/billing/SuccessPageClient";
import { getRequestLanguage } from "@/lib/i18n/server";
import {
  isSubscriptionPlanType,
  resolveSubscriptionPlanByPriceId,
  type SubscriptionPlanType,
} from "@/lib/billing/plan-catalog";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: "購入完了 | Tabidea",
        description: "ご購入ありがとうございます。",
      }
    : {
        title: "Purchase Complete | Tabidea",
        description: "Thank you for your purchase.",
      };
}

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  let isSubscription = true;
  let planType: SubscriptionPlanType | null = null;

  // Determine if this was a subscription or ticket purchase
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      isSubscription = session.mode === "subscription";
      const metadataPlanType = session.metadata?.plan_type;
      if (metadataPlanType && isSubscriptionPlanType(metadataPlanType)) {
        planType = metadataPlanType;
      }

      if (isSubscription && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const resolved = resolveSubscriptionPlanByPriceId(
          subscription.items.data[0]?.price?.id
        );
        if (resolved) {
          planType = resolved;
        }
      }
    } catch {
      // If we can't retrieve the session, default to subscription
      isSubscription = true;
    }
  }

  return (
    <SuccessPageClient
      sessionId={sessionId}
      isSubscription={isSubscription}
      planType={planType}
    />
  );
}
