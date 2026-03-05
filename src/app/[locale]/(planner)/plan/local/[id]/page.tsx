import { Metadata } from 'next';
import { getTranslations } from "next-intl/server";

import PlanLocalClient from './PlanLocalClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.planner.plan.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanLocalPage({ params }: PageProps) {
  const { id } = await params;

  return <PlanLocalClient localId={id} />;
}
