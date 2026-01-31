import type { Metadata } from "next";
import { stripe } from "@/lib/stripe/client";
import SuccessPageClient from "@/components/billing/SuccessPageClient";

export const metadata: Metadata = {
  title: "購入完了 | Tabidea",
  description: "ご購入ありがとうございます。",
};

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  let isSubscription = true;

  // Determine if this was a subscription or ticket purchase
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      isSubscription = session.mode === "subscription";
    } catch {
      // If we can't retrieve the session, default to subscription
      isSubscription = true;
    }
  }

  return (
    <SuccessPageClient sessionId={sessionId} isSubscription={isSubscription} />
  );
}
