import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';
import { getUser } from '@/lib/supabase/server';
import { planService } from '@/lib/plans/service';
import MyPlansClient from './MyPlansClient';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: 'マイプラン',
        description: '保存した旅行プランの一覧です。',
      }
    : {
        title: 'My Plans',
        description: 'Your saved travel plans.',
      };
}

export default async function MyPlansPage() {
  const language = await getRequestLanguage();
  const user = await getUser();

  if (!user) {
    const loginPath = localizePath('/auth/login', language);
    const redirectPath = localizePath('/my-plans', language);
    redirect(`${loginPath}?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const result = await planService.getUserPlansList(user.id, {
    limit: 50,
  });

  return (
    <MyPlansClient
      initialPlans={result.plans || []}
      totalPlans={result.total || 0}
    />
  );
}
