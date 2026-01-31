import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "./admin";
import type { UserType } from "./config";

export interface UserInfo {
  type: UserType;
  userId: string | null;
  email: string | null;
}

/**
 * Server Action内でユーザー種別を取得
 */
export async function getUserInfo(): Promise<UserInfo> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { type: "anonymous", userId: null, email: null };
  }

  // 管理者チェック
  if (isAdmin(user.email)) {
    return { type: "admin", userId: user.id, email: user.email ?? null };
  }

  // サブスクリプションチェック
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  if (subscription && subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    if (periodEnd > new Date()) {
      return { type: "premium", userId: user.id, email: user.email ?? null };
    }
  }

  return { type: "free", userId: user.id, email: user.email ?? null };
}

export async function getUserTypeClient(): Promise<UserType> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "anonymous";
  if (isAdmin(user.email)) return "admin";

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  if (subscription && subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    if (periodEnd > new Date()) {
      return "premium";
    }
  }

  return "free";
}
