import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  resolveSubscriptionPlanByPriceId,
  type SubscriptionPlanType,
} from "@/lib/billing/plan-catalog";

const RECONCILABLE_SUBSCRIPTION_STATUSES: ReadonlySet<Stripe.Subscription.Status> =
  new Set(["active", "trialing", "past_due"]);

export interface StripeReconcileParams {
  userId: string;
  stripeCustomerId: string;
}

export interface StripeReconcileResult {
  synced: boolean;
  planCode?: SubscriptionPlanType;
  reason?:
    | "missing_customer_id"
    | "no_active_subscription"
    | "unknown_price_id"
    | "upsert_failed"
    | "stripe_query_failed";
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: Date;
  periodEnd: Date;
} {
  const item = subscription.items.data[0];
  const now = Date.now();
  const fallbackStart = subscription.billing_cycle_anchor || subscription.created;
  const fallbackEnd = fallbackStart + 30 * 24 * 60 * 60;

  const periodStart = item?.current_period_start
    ? new Date(item.current_period_start * 1000)
    : new Date(fallbackStart * 1000);
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : new Date(fallbackEnd * 1000);

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return {
      periodStart: new Date(now),
      periodEnd: new Date(now + 30 * 24 * 60 * 60 * 1000),
    };
  }

  return { periodStart, periodEnd };
}

function isReconciliableSubscription(subscription: Stripe.Subscription): boolean {
  if (!RECONCILABLE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return false;
  }

  const { periodEnd } = getSubscriptionPeriod(subscription);
  return periodEnd > new Date();
}

export async function reconcileUserSubscriptionFromStripe(
  params: StripeReconcileParams,
): Promise<StripeReconcileResult> {
  const { userId, stripeCustomerId } = params;

  if (!stripeCustomerId) {
    return { synced: false, reason: "missing_customer_id" };
  }

  try {
    const list = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 10,
    });

    const subscription = list.data.find(isReconciliableSubscription);
    if (!subscription) {
      return { synced: false, reason: "no_active_subscription" };
    }

    const item = subscription.items.data[0];
    const planCode = resolveSubscriptionPlanByPriceId(item?.price?.id);
    if (!planCode) {
      console.error("[billing-reconcile] Unknown subscription price ID", {
        userId,
        stripeCustomerId,
        subscriptionId: subscription.id,
        priceId: item?.price?.id,
      });
      return { synced: false, reason: "unknown_price_id" };
    }

    const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);
    const adminClient = createServiceRoleClient();

    const { error } = await adminClient.from("subscriptions").upsert(
      {
        user_id: userId,
        external_subscription_id: subscription.id,
        external_customer_id: stripeCustomerId,
        payment_provider: "stripe",
        status: subscription.status,
        plan_code: planCode,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: null,
      },
      {
        onConflict: "external_subscription_id",
      },
    );

    if (error) {
      console.error("[billing-reconcile] Failed to upsert subscription", {
        userId,
        stripeCustomerId,
        subscriptionId: subscription.id,
        error: error.message,
        code: error.code,
      });
      return { synced: false, reason: "upsert_failed" };
    }

    console.info("[billing-reconcile] Subscription synced from Stripe", {
      userId,
      stripeCustomerId,
      subscriptionId: subscription.id,
      planCode,
      status: subscription.status,
    });

    return { synced: true, planCode };
  } catch (error) {
    console.error("[billing-reconcile] Stripe reconciliation failed", {
      userId,
      stripeCustomerId,
      error,
    });
    return { synced: false, reason: "stripe_query_failed" };
  }
}
