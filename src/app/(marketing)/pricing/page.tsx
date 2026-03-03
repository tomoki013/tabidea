import type { Metadata } from 'next';

import { PricingPageClient } from '@/components/billing/PricingPageClient';
import { checkBillingAccess } from '@/lib/billing/billing-checker';
import { getUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: '料金プラン',
  description:
    'Tabideaの料金プランをご覧ください。無料プラン、Pro/Premium、回数券の違いや機能制限を確認できます。',
};

export default async function PricingPage() {
  const user = await getUser();
  const isLoggedIn = !!user;
  const billingStatus = isLoggedIn ? await checkBillingAccess() : null;

  return <PricingPageClient isLoggedIn={isLoggedIn} billingStatus={billingStatus} />;
}
