// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

/**
 * Subscriptionから期間情報を取得するヘルパー関数
 */
function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: Date;
  periodEnd: Date;
} {
  // 最新のStripe APIでは items.data[0] から取得
  const item = subscription.items.data[0];

  if (item?.current_period_start && item?.current_period_end) {
    return {
      periodStart: new Date(item.current_period_start * 1000),
      periodEnd: new Date(item.current_period_end * 1000),
    };
  }

  // フォールバック: billing_cycle_anchor と created を使用
  const start = subscription.billing_cycle_anchor || subscription.created;
  const end =
    subscription.cancel_at ||
    subscription.canceled_at ||
    start + 30 * 24 * 60 * 60; // デフォルト30日後

  return {
    periodStart: new Date(start * 1000),
    periodEnd: new Date(end * 1000),
  };
}

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  const ticketCount = parseInt(session.metadata?.ticket_count || "0", 10);

  if (!userId || !planType) {
    console.error("Missing metadata in checkout session");
    return;
  }

  if (planType === "pro_monthly") {
    // サブスクリプションの場合
    const subscriptionId = session.subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      status: subscription.status,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      plan_type: "pro_monthly",
    });
  } else {
    // 回数券の場合
    await supabase.from("entitlement_grants").insert({
      user_id: userId,
      entitlement_type: "plan_generation",
      grant_type: "ticket_pack",
      granted_count: ticketCount,
      remaining_count: ticketCount,
      valid_from: new Date().toISOString(),
      valid_until: new Date(
        Date.now() + 180 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      source_type: "stripe",
      source_id: session.id,
      status: "active",
    });
  }

  // 取引履歴を記録
  await supabase.from("billing_transactions").insert({
    user_id: userId,
    transaction_type:
      planType === "pro_monthly" ? "subscription" : "ticket_purchase",
    amount: session.amount_total,
    currency: session.currency,
    payment_provider: "stripe",
    external_transaction_id:
      (session.payment_intent as string) || (session.subscription as string),
    status: "succeeded",
    metadata: {
      plan_type: planType,
      ticket_count: ticketCount,
    },
  });
}

async function handleSubscriptionChange(
  supabase: any,
  subscription: Stripe.Subscription,
) {
  const customerId = subscription.customer as string;
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);

  // customerIdからuserIdを取得
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!user) {
    console.error("User not found for customer:", customerId);
    return;
  }

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (user) {
    console.log("Payment failed for user:", user.id);
  }
}
