import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from "next-intl/server";
import { parseCategoriesParam, parseDatesParam } from '@/lib/utils';
import { getRequestLanguage } from '@/lib/i18n/server';
import { resolveOpenGraphLocale } from '@/lib/i18n/locales';
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
  const t = await getTranslations("pages.info.travelInfoDestination");
  const resolvedParams = await params;
  const destination = decodeURIComponent(resolvedParams.destination);

  return {
    title: t("metaTitle", { destination }),
    description: t("metaDescription", { destination }),
    openGraph: {
      title: t("ogTitle", { destination }),
      description: t("ogDescription", { destination }),
      type: 'website',
      locale: resolveOpenGraphLocale(language),
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
