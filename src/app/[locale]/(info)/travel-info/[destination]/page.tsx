import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parseCategoriesParam, parseDatesParam } from '@/lib/utils';
import { getRequestLanguage } from '@/lib/i18n/server';
import DestinationClient from './DestinationClient';

interface PageProps {
  params: Promise<{ destination: string }>;
  searchParams: Promise<{
    categories?: string;
    dates?: string;
  }>;
}

/**
 * 動的メタデータ生成
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const language = await getRequestLanguage();
  const resolvedParams = await params;
  const destination = decodeURIComponent(resolvedParams.destination);

  if (language === 'ja') {
    return {
      title: `${destination}の渡航情報 | AI Travel Planner`,
      description: `${destination}への渡航に必要な情報をまとめてチェック。ビザ、安全情報、気候、マナーなど。`,
      openGraph: {
        title: `${destination}の渡航情報`,
        description: `${destination}への渡航に必要な情報をAIがまとめました。`,
        type: 'website',
        locale: 'ja_JP',
      },
    };
  }

  return {
    title: `${destination} Travel Info | AI Travel Planner`,
    description: `Check visa, safety, weather, etiquette, and other travel essentials for ${destination}.`,
    openGraph: {
      title: `${destination} Travel Info`,
      description: `AI-curated travel essentials for visiting ${destination}.`,
      type: 'website',
      locale: 'en_US',
    },
  };
}

/**
 * /travel-info/[destination] - 目的地別渡航情報ページ
 *
 * URLパラメータから目的地とカテゴリを取得し、
 * 渡航情報を表示する
 */
export default async function TravelInfoDestinationPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const destination = decodeURIComponent(resolvedParams.destination);

  // 目的地が空の場合は404
  if (!destination.trim()) {
    notFound();
  }

  // URLパラメータをパース
  const categories = parseCategoriesParam(resolvedSearchParams.categories);
  const dates = parseDatesParam(resolvedSearchParams.dates);

  return (
    <DestinationClient
      key={`${destination}-${resolvedSearchParams.categories || ''}`}
      destination={destination}
      initialCategories={categories}
      dates={dates}
    />
  );
}
