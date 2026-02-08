import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { planService } from '@/lib/plans/service';
import { getUser, createClient } from '@/lib/supabase/server';
import PlanCodeClient from './PlanCodeClient';
import type { ChatMessage } from '@/app/actions/travel-planner';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const user = await getUser();
  const result = await planService.getPlanByShareCode(code, user?.id);

  if (!result.success || !result.plan) {
    return {
      title: 'プランが見つかりません',
    };
  }

  const { plan } = result;
  const title = plan.destination ? `${plan.destination}の旅行プラン` : '旅行プラン';
  const description = plan.itinerary?.description || 'AIが生成した旅行プラン';

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

  // Get base URL from environment or default (check both env vars for compatibility)
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tabide.ai').replace(/\/$/, '');
  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
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

export default async function PlanCodePage({ params }: PageProps) {
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

  const isOwner = user?.id === plan.userId;

  // Load chat messages if user is owner
  let initialChatMessages: ChatMessage[] = [];
  if (isOwner && user) {
    try {
      const supabase = await createClient();
      const { data: messages } = await supabase
        .from('plan_chat_messages')
        .select('role, content')
        .eq('plan_id', plan.id)
        .order('sequence_number', { ascending: true });

      if (messages) {
        initialChatMessages = messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      }
    } catch (e) {
      console.error('Failed to load chat messages:', e);
    }
  }

  return (
    <PlanCodeClient
      plan={plan}
      input={plan.input}
      itinerary={plan.itinerary}
      shareCode={code}
      isOwner={isOwner}
      isAuthenticated={!!user}
      initialChatMessages={initialChatMessages}
    />
  );
}
