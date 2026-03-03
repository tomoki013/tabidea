import type { UserType } from "@/lib/limits/config";
import type { PlanType, TicketType } from "@/types/billing";
import { PRO_PLAN_NAME, PREMIUM_PLAN_NAME } from "./constants";

export type SubscriptionPlanType = "pro_monthly" | "premium_monthly";
export type CheckoutPlanType = SubscriptionPlanType | TicketType;

export const SUBSCRIPTION_PLAN_TYPES: readonly SubscriptionPlanType[] = [
  "pro_monthly",
  "premium_monthly",
];

export const TICKET_PLAN_TYPES: readonly TicketType[] = [
  "ticket_1",
  "ticket_5",
  "ticket_10",
];

export type Capability =
  | "travel_style"
  | "packing_list"
  | "multi_ai_provider"
  | "plan_embedded_travel_info";

const FREE_CAPABILITIES: readonly Capability[] = [];
const PRO_CAPABILITIES: readonly Capability[] = [
  "travel_style",
  "packing_list",
  "plan_embedded_travel_info",
];
const PREMIUM_CAPABILITIES: readonly Capability[] = [
  ...PRO_CAPABILITIES,
  "multi_ai_provider",
];

export const CAPABILITIES_BY_USER_TYPE: Readonly<Record<UserType, readonly Capability[]>> = {
  anonymous: FREE_CAPABILITIES,
  free: FREE_CAPABILITIES,
  pro: PRO_CAPABILITIES,
  premium: PREMIUM_CAPABILITIES,
  admin: PREMIUM_CAPABILITIES,
};

export function canAccess(userType: UserType, capability: Capability): boolean {
  return CAPABILITIES_BY_USER_TYPE[userType].includes(capability);
}

export function isSubscriptionPlanType(value: string): value is SubscriptionPlanType {
  return SUBSCRIPTION_PLAN_TYPES.includes(value as SubscriptionPlanType);
}

export function isTicketPlanType(value: string): value is TicketType {
  return TICKET_PLAN_TYPES.includes(value as TicketType);
}

export function isCheckoutPlanType(value: string): value is CheckoutPlanType {
  return isSubscriptionPlanType(value) || isTicketPlanType(value);
}

export function resolveSubscriptionPlanByPriceId(
  priceId: string | null | undefined
): SubscriptionPlanType | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro_monthly";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY) return "premium_monthly";
  return null;
}

export function resolvePlanDisplayName(params: {
  planType: PlanType;
  isSubscribed: boolean;
  isAdmin: boolean;
}): string {
  if (params.isAdmin || params.planType === "admin") return "管理者";
  if (!params.isSubscribed) return "Free";
  if (params.planType === "pro_monthly") return PRO_PLAN_NAME;
  if (params.planType === "premium_monthly") return PREMIUM_PLAN_NAME;
  return "Free";
}
