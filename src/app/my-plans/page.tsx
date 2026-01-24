import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getUser } from '@/lib/supabase/server';
import { planService } from '@/lib/plans/service';
import MyPlansClient from './MyPlansClient';

export const metadata: Metadata = {
  title: 'マイプラン',
  description: '保存した旅行プランの一覧です。',
};

export default async function MyPlansPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login?redirect=/my-plans');
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
