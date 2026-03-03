"use server";

import { stripe } from "@/lib/stripe/client";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/billing/billing-checker";
import {
  type CheckoutPlanType,
  type SubscriptionPlanType,
  isSubscriptionPlanType,
  resolvePlanDisplayName,
  resolveSubscriptionPlanByPriceId,
} from "@/lib/billing/plan-catalog";
import type { CheckoutSessionResult, TicketType } from "@/types/billing";
import { headers } from "next/headers";

const PRICE_IDS: Record<CheckoutPlanType, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!,
  ticket_1: process.env.STRIPE_PRICE_TICKET_1!,
  ticket_5: process.env.STRIPE_PRICE_TICKET_5!,
  ticket_10: process.env.STRIPE_PRICE_TICKET_10!,
};

const TICKET_COUNTS: Record<TicketType, number> = {
  ticket_1: 1,
  ticket_5: 5,
  ticket_10: 10,
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function resolveSubscribedPlanType(
  planCode: string | null | undefined,
): SubscriptionPlanType | null {
  if (!planCode) return null;
  return isSubscriptionPlanType(planCode) ? planCode : null;
}

function buildAlreadySubscribedResult(
  planCode: string | null | undefined,
): CheckoutSessionResult {
  const resolvedPlanType = resolveSubscribedPlanType(planCode);
  const resolvedPlanName = resolvedPlanType
    ? resolvePlanDisplayName({
        planType: resolvedPlanType,
        isSubscribed: true,
        isAdmin: false,
      })
    : "有料";

  return {
    success: false,
    error: "already_subscribed",
    resolvedPlanType: resolvedPlanType ?? undefined,
    resolvedPlanName,
  };
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function resolveAppUrl(): Promise<string | null> {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) {
    return normalizeBaseUrl(configuredAppUrl);
  }

  const headersList = await headers();
  const origin = headersList.get("origin");
  if (origin) {
    return normalizeBaseUrl(origin);
  }

  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  if (!host) return null;

  const protocol = headersList.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

function isResourceMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { type?: string; code?: string };
  return (
    err.type === "StripeInvalidRequestError" &&
    err.code === "resource_missing"
  );
}

async function persistStripeCustomerId(
  supabase: SupabaseClient,
  userId: string,
  customerId: string,
) {
  const { error } = await supabase
    .from("users")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (error) {
    console.warn("[checkout] Failed to persist stripe_customer_id:", error);
  }
}

async function createStripeCustomer(
  userId: string,
  email?: string | null,
): Promise<string> {
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  });
  return customer.id;
}

async function resolveStripeCustomerId(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  const { data: userData } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let customerId = userData?.stripe_customer_id ?? null;

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!("deleted" in customer && customer.deleted)) {
        return customerId;
      }
      customerId = null;
    } catch (error) {
      if (!isResourceMissingError(error)) {
        throw error;
      }
      customerId = null;
    }
  }

  if (!customerId && email) {
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 10,
    });

    const matchedCustomer = existingCustomers.data.find((customer) => {
      if ("deleted" in customer && customer.deleted) {
        return false;
      }

      return customer.metadata?.supabase_user_id === userId;
    });

    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    }
  }

  if (!customerId) {
    customerId = await createStripeCustomer(userId, email);
  }

  await persistStripeCustomerId(supabase, userId, customerId);
  return customerId;
}

export async function createCheckoutSession(
  planType: CheckoutPlanType,
): Promise<CheckoutSessionResult> {
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

  const isSubscription = isSubscriptionPlanType(planType);

  // 🔒 二重決済防止: DBチェック
  if (isSubscription) {
    const { hasActive, subscription } = await hasActiveSubscription(user.id);

    if (hasActive) {
      console.warn(
        `[checkout] User ${user.id} already has active subscription: ${subscription?.externalSubscriptionId}`,
      );
      return buildAlreadySubscribedResult(subscription?.planCode);
    }
  }

  try {
    const customerId = await resolveStripeCustomerId(
      supabase,
      user.id,
      user.email,
    );

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

        // DBと同期 (Service Role Client を使用して RLS をバイパス)
        const stripeSub = existingSubscriptions.data[0];
        const item = stripeSub.items.data[0];
        const resolvedPlanCode = resolveSubscriptionPlanByPriceId(item?.price?.id);

        try {
          if (!resolvedPlanCode) {
            console.error(
              `[checkout] Unknown active subscription price_id=${item?.price?.id} for customer=${customerId}`,
            );
            return buildAlreadySubscribedResult(null);
          }

          const adminClient = createServiceRoleClient();
          const { error: syncError } = await adminClient
            .from("subscriptions")
            .upsert(
              {
                user_id: user.id,
                external_subscription_id: stripeSub.id,
                external_customer_id: customerId,
                payment_provider: "stripe",
                status: stripeSub.status,
                plan_code: resolvedPlanCode,
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

          if (syncError) {
            console.error("[checkout] Failed to sync subscription:", syncError);
          }
        } catch (syncError) {
          console.error("[checkout] Failed to initialize sync client:", syncError);
        }

        return buildAlreadySubscribedResult(resolvedPlanCode);
      }
    }

    const appUrl = await resolveAppUrl();

    if (!appUrl) {
      console.error(
        "[checkout] Failed to resolve app URL (NEXT_PUBLIC_APP_URL/origin/host)",
      );
      return { success: false, error: "configuration_error" };
    }

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
        ticket_count: isSubscription ? "0" : TICKET_COUNTS[planType].toString(),
      },
    });

    return { success: true, url: session.url! };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { success: false, error: "checkout_failed" };
  }
}
