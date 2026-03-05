import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from "next-intl/server";

import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';
import { getUser } from '@/lib/supabase/server';
import { planService } from '@/lib/plans/service';
import MyPlansClient from './MyPlansClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.myPlans.meta");
  return {
    title: t("title"),
    description: t("description"),
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
