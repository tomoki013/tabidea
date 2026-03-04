import type { Metadata } from 'next';

import { PricingPageClient } from '@/components/billing/PricingPageClient';
import { checkBillingAccess } from '@/lib/billing/billing-checker';
import { getRequestLanguage } from '@/lib/i18n/server';
import { getUser } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: '料金プラン',
        description:
          'Tabideaの料金プランをご覧ください。無料プラン、Pro/Premium、回数券の違いや機能制限を確認できます。',
      }
    : {
        title: 'Pricing',
        description:
          'Compare Tabidea plans, including Free, Pro/Premium, and ticket packs with feature limits.',
      };
}

export default async function PricingPage() {
  const user = await getUser();
  const isLoggedIn = !!user;
  const billingStatus = isLoggedIn ? await checkBillingAccess() : null;

  return <PricingPageClient isLoggedIn={isLoggedIn} billingStatus={billingStatus} />;
}
