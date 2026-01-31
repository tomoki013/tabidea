"use server";

import { getUserBillingStatus } from "@/lib/billing/user-billing-status";
import type { UserBillingStatus } from "@/types/billing";

export async function getBillingStatus(): Promise<UserBillingStatus | null> {
  return getUserBillingStatus();
}
