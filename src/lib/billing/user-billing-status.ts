import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

import type { UserBillingStatus, PlanType } from '@/types/billing';

/**
 * ユーザーの課金状態を取得
 */
export async function getUserBillingStatus(): Promise<UserBillingStatus | null> {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();

  // サブスクリプション情報を取得
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  // 回数券の残数を取得
  const { data: tickets } = await supabase
    .from('tickets')
    .select('remaining_count')
    .eq('user_id', user.id)
    .gt('remaining_count', 0)
    .gt('expires_at', new Date().toISOString());

  const ticketCount = tickets?.reduce((sum, t) => sum + (t.remaining_count || 0), 0) || 0;

  const isSubscribed = !!subscription;
  const planType: PlanType = isSubscribed ? 'pro_monthly' : 'free';

  return {
    planType,
    isSubscribed,
    subscriptionEndsAt: subscription?.current_period_end || undefined,
    ticketCount,
  };
}

/**
 * ユーザーの回数券残数を取得
 */
export async function getUserTicketCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from('tickets')
    .select('remaining_count')
    .eq('user_id', userId)
    .gt('remaining_count', 0)
    .gt('expires_at', new Date().toISOString());

  return tickets?.reduce((sum, t) => sum + (t.remaining_count || 0), 0) || 0;
}
