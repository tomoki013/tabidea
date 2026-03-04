import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { planService } from '@/lib/plans/service';
import { getUser } from '@/lib/supabase/server';
import { getRequestLanguage } from '@/lib/i18n/server';
import PlanCodeClient from '@/app/[locale]/(planner)/plan/[code]/PlanCodeClient';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const language = await getRequestLanguage();
  const { code } = await params;
  const result = await planService.getPlanByShareCode(code);

  if (!result.success || !result.plan) {
    return {
      title: language === 'ja' ? 'プランが見つかりません' : 'Plan not found',
    };
  }

  const { plan } = result;
  const title =
    language === 'ja'
      ? (plan.destination ? `${plan.destination}の旅行プラン` : '旅行プラン')
      : (plan.destination ? `${plan.destination} Travel Plan` : 'Travel Plan');
  const description =
    plan.itinerary?.description ||
    (language === 'ja' ? 'AIが生成した旅行プラン' : 'AI-generated travel plan');

  // Build dynamic OGP image URL
  const ogParams = new URLSearchParams();
  if (plan.destination) {
    ogParams.set('destination', plan.destination);
  }
  if (plan.itinerary?.days?.length) {
    ogParams.set('days', plan.itinerary.days.length.toString());
  }
  if (plan.itinerary?.heroImage) {
    ogParams.set('imageUrl', plan.itinerary.heroImage);
  }
  ogParams.set('lang', language);

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tabide.ai').replace(/\/$/, '');
  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/${language}/public/view/${code}`,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicPlanViewPage({ params }: PageProps) {
  const { code } = await params;
  const user = await getUser();

  const result = await planService.getPlanByShareCode(code, user?.id);

  if (!result.success || !result.plan) {
    notFound();
  }

  const { plan } = result;

  if (!plan.input || !plan.itinerary) {
    notFound();
  }

  // Ensure public view is simplified (read-only, minimal)
  const isOwner = false; // Always treat as non-owner in public view for simplicity

  return (
    <PlanCodeClient
      plan={plan}
      input={plan.input}
      itinerary={plan.itinerary}
      shareCode={code}
      isOwner={isOwner}
      isAuthenticated={!!user}
      initialChatMessages={[]} // No chat history in public view
      isSimplifiedView={true}
    />
  );
}
