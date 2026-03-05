import type { Metadata } from 'next';
import { getTranslations } from "next-intl/server";

import { PricingPageClient } from '@/components/billing/PricingPageClient';
import { checkBillingAccess } from '@/lib/billing/billing-checker';
import { getUser } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.pricing.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PricingPage() {
  const user = await getUser();
  const isLoggedIn = !!user;
  const billingStatus = isLoggedIn ? await checkBillingAccess() : null;

  return <PricingPageClient isLoggedIn={isLoggedIn} billingStatus={billingStatus} />;
}
