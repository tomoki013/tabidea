// src/lib/limits/tickets.ts
import { createClient } from "@/lib/supabase/server";

export async function consumeTicket(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // 有効な回数券を取得（古いものから消費）
  const { data: grants } = await supabase
    .from("entitlement_grants")
    .select("*")
    .eq("user_id", userId)
    .eq("entitlement_type", "plan_generation")
    .eq("grant_type", "ticket_pack")
    .eq("status", "active")
    .gt("remaining_count", 0)
    .gt("valid_until", new Date().toISOString())
    .order("valid_until", { ascending: true })
    .limit(1);

  if (!grants || grants.length === 0) {
    return false;
  }

  const grant = grants[0];
  const newRemaining = grant.remaining_count - 1;

  await supabase
    .from("entitlement_grants")
    .update({
      remaining_count: newRemaining,
      status: newRemaining === 0 ? "exhausted" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", grant.id);

  return true;
}

export async function getUserTicketCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: grants } = await supabase
    .from("entitlement_grants")
    .select("remaining_count")
    .eq("user_id", userId)
    .eq("entitlement_type", "plan_generation")
    .eq("grant_type", "ticket_pack")
    .eq("status", "active")
    .gt("valid_until", new Date().toISOString());

  if (!grants) return 0;

  return grants.reduce((sum, g) => sum + (g.remaining_count || 0), 0);
}
