import { Metadata } from 'next';

import PlanLocalClient from './PlanLocalClient';

export const metadata: Metadata = {
  title: '旅行プラン結果',
  description: 'AIが生成したあなただけの旅行プラン結果です。',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanLocalPage({ params }: PageProps) {
  const { id } = await params;

  return <PlanLocalClient localId={id} />;
}
