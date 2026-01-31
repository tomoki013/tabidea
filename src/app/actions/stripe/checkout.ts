"use server";

import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/billing/user-billing-status";

type PlanType = "pro_monthly" | "ticket_1" | "ticket_5" | "ticket_10";

const PRICE_IDS: Record<PlanType, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  ticket_1: process.env.STRIPE_PRICE_TICKET_1!,
  ticket_5: process.env.STRIPE_PRICE_TICKET_5!,
  ticket_10: process.env.STRIPE_PRICE_TICKET_10!,
};

const TICKET_COUNTS: Record<string, number> = {
  ticket_1: 1,
  ticket_5: 5,
  ticket_10: 10,
};

export async function createCheckoutSession(planType: PlanType): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "not_authenticated" };
  }

  const priceId = PRICE_IDS[planType];
  if (!priceId) {
    return { success: false, error: "invalid_plan" };
  }

  const isSubscription = planType === "pro_monthly";

  // 🔒 二重決済防止: DBチェック
  if (isSubscription) {
    const { hasActive, subscription } = await hasActiveSubscription(user.id);

    if (hasActive) {
      console.warn(
        `[checkout] User ${user.id} already has active subscription: ${subscription?.externalSubscriptionId}`,
      );
      return { success: false, error: "already_subscribed" };
    }
  }

  try {
    // Stripe Customer取得または作成
    const { data: userData } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      // 既存のStripe Customerをメールで検索
      const existingCustomers = await stripe.customers.list({
        email: user.email!,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
      }

      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // 🔒 二重決済防止: Stripe側チェック
    if (isSubscription) {
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (existingSubscriptions.data.length > 0) {
        console.warn(
          `[checkout] Customer ${customerId} already has active Stripe subscription`,
        );

        // DBと同期
        const stripeSub = existingSubscriptions.data[0];
        const item = stripeSub.items.data[0];

        await supabase.from("subscriptions").upsert(
          {
            user_id: user.id,
            external_subscription_id: stripeSub.id,
            external_customer_id: customerId,
            payment_provider: "stripe",
            status: stripeSub.status,
            plan_code: "pro_monthly",
            current_period_start: item?.current_period_start
              ? new Date(item.current_period_start * 1000).toISOString()
              : null,
            current_period_end: item?.current_period_end
              ? new Date(item.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: stripeSub.cancel_at_period_end,
          },
          {
            onConflict: "external_subscription_id",
          },
        );

        return { success: false, error: "already_subscribed" };
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
        ticket_count: TICKET_COUNTS[planType]?.toString() || "0",
      },
    });

    return { success: true, url: session.url! };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { success: false, error: "checkout_failed" };
  }
}
