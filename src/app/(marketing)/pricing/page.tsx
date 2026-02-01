import type { Metadata } from 'next';

import { PricingPageClient } from '@/components/billing/PricingPageClient';
import { getUserBillingStatus } from '@/lib/billing/user-billing-status';
import { getUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: {
    absolute: '料金プラン',
  },
  description:
    'Tabideaの料金プランをご覧ください。無料プランから始めて、必要に応じてProプランや回数券をお選びいただけます。',
};

export default async function PricingPage() {
  const user = await getUser();
  const isLoggedIn = !!user;
  const billingStatus = isLoggedIn ? await getUserBillingStatus() : null;

  return <PricingPageClient isLoggedIn={isLoggedIn} billingStatus={billingStatus} />;
}
