import { createClient } from "@/lib/supabase/server";
import type { UserBillingStatus, PlanType } from "@/types/billing";

export async function getUserBillingStatus(): Promise<UserBillingStatus | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // サブスクリプション情報を取得
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 回数券の残数を取得
  const { data: tickets } = await supabase
    .from("entitlement_grants")
    .select("remaining_count")
    .eq("user_id", user.id)
    .eq("entitlement_type", "plan_generation")
    .eq("grant_type", "ticket_pack")
    .eq("status", "active")
    .gt("valid_until", new Date().toISOString());

  const ticketCount =
    tickets?.reduce((sum, t) => sum + (t.remaining_count || 0), 0) || 0;

  let isSubscribed = false;
  let planType: PlanType = "free";
  let subscriptionEndsAt: string | undefined;

  if (subscription) {
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;

    if (periodEnd && periodEnd > new Date()) {
      isSubscribed = true;
      // plan_code を使用
      planType = (subscription.plan_code as PlanType) || "pro_monthly";
      subscriptionEndsAt = subscription.current_period_end;
    }
  }

  return {
    planType,
    isSubscribed,
    subscriptionEndsAt,
    ticketCount,
  };
}

export async function hasActiveSubscription(userId: string): Promise<{
  hasActive: boolean;
  subscription?: {
    id: string;
    externalSubscriptionId: string;
    status: string;
    currentPeriodEnd: string;
  };
}> {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("id, external_subscription_id, status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !subscription) {
    return { hasActive: false };
  }

  const periodEnd = new Date(subscription.current_period_end);
  if (periodEnd <= new Date()) {
    return { hasActive: false };
  }

  return {
    hasActive: true,
    subscription: {
      id: subscription.id,
      externalSubscriptionId: subscription.external_subscription_id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    },
  };
}
