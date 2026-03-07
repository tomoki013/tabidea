import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { localizePath, resolveOpenGraphLocale, resolveRegionalLocale } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';
import { createClient, getUser } from '@/lib/supabase/server';
import type { PublicConditionsSnapshot } from '@/types/plans';
import ShioriLikeButton from '@/components/features/shiori/ShioriLikeButton';
import ConditionsCard from '@/components/features/shiori/ConditionsCard';
import ForkButton from '@/components/features/shiori/ForkButton';
import CreateWithConditionsButton from '@/components/features/shiori/CreateWithConditionsButton';
import ShareButton from '@/components/features/shiori/ShareButton';
import RelatedShioriSection from '@/components/features/shiori/RelatedShioriSection';

interface ShioriItem {
  id: string;
  item_type: string | null;
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  note: string | null;
  journal: {
    id: string;
    content: string;
    updated_at: string;
    phase: 'before' | 'during' | 'after';
    place_name: string | null;
    photo_urls: string[];
    visibility: 'private' | 'public';
  } | null;
}

interface ShioriDay {
  id: string;
  day_number: number;
  title: string | null;
  items: ShioriItem[];
}

interface ShioriPayload {
  plan: {
    destination: string | null;
    duration_days: number | null;
    thumbnail_url: string | null;
    visibility: 'private' | 'unlisted' | 'public';
    likes_count: number | null;
    viewer_liked: boolean | null;
    conditions_snapshot: PublicConditionsSnapshot | null;
  };
  days: ShioriDay[];
}

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ t?: string }>;
}

function getItemTypeColor(itemType: string | null): string {
  switch (itemType) {
    case 'hotel': return 'border-blue-400 dark:border-blue-500';
    case 'spot': return 'border-green-400 dark:border-green-500';
    case 'meal': return 'border-orange-400 dark:border-orange-500';
    case 'transit': return 'border-stone-300 dark:border-stone-500';
    default: return 'border-stone-300 dark:border-stone-500';
  }
}

function getItemTypeDotColor(itemType: string | null): string {
  switch (itemType) {
    case 'hotel': return 'bg-blue-400 dark:bg-blue-500';
    case 'spot': return 'bg-green-400 dark:bg-green-500';
    case 'meal': return 'bg-orange-400 dark:bg-orange-500';
    case 'transit': return 'bg-stone-300 dark:bg-stone-500';
    default: return 'bg-stone-300 dark:bg-stone-500';
  }
}

function formatPhaseLabel(
  phase: 'before' | 'during' | 'after',
  t: (key: string) => string,
) {
  return t(`phase.${phase}`);
}

async function loadShiori(slug: string, token?: string): Promise<ShioriPayload | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_shiori', {
    p_slug: slug,
    p_token: token ?? null,
  });
  if (error) throw error;
  return data as ShioriPayload | null;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = await getTranslations('pages.shiori.detail');
  const { slug } = await params;
  const { t: token } = await searchParams;
  const data = await loadShiori(slug, token);

  if (!data?.plan) {
    return { title: t('metadataNotFoundTitle') };
  }

  const title = data.plan.destination
    ? t('metadataTitleWithDestination', { destination: data.plan.destination })
    : t('metadataTitleFallback');
  const description = t('metadataDescription', { days: data.plan.duration_days ?? '-' });
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://tabide.ai').replace(/\/$/, '');
  const fallbackDestination = t('metadataFallbackDestination');
  const ogImageUrl = `${baseUrl}/api/og?destination=${encodeURIComponent(data.plan.destination ?? fallbackDestination)}&days=${data.plan.duration_days ?? ''}&lang=${language}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale: resolveOpenGraphLocale(language),
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
  };
}

export default async function ShioriPage({ params, searchParams }: PageProps) {
  const language = await getRequestLanguage();
  const t = await getTranslations('pages.shiori.detail');
  const { slug, locale } = await params;
  const { t: token } = await searchParams;
  const user = await getUser();
  const data = await loadShiori(slug, token);

  if (!data?.plan) notFound();

  const entriesCount = data.days.reduce((count, day) => (
    count + day.items.filter((item) => Boolean(item.journal?.content)).length
  ), 0);

  const destination = data.plan.destination ?? t('headerDestinationFallback');
  const conditions = data.plan.conditions_snapshot;

  return (
    <main className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 pb-24">
      {/* Hero */}
      <div className="relative h-64 md:h-80 bg-stone-200 dark:bg-stone-800 overflow-hidden">
        {data.plan.thumbnail_url ? (
          <Image
            src={data.plan.thumbnail_url}
            alt={t('heroAlt', { destination })}
            fill
            className="object-cover"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-wide text-white/70 mb-1">{t('headerBadge')}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md">{destination}</h1>
          <p className="text-sm text-white/80 mt-1">
            {t('headerSummary', {
              days: data.plan.duration_days ?? '-',
              entries: entriesCount,
              visibility: t(`visibility.${data.plan.visibility}`),
            })}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-stone-200 dark:border-stone-700">
          <ShioriLikeButton
            slug={slug}
            initialLiked={Boolean(data.plan.viewer_liked)}
            initialLikesCount={data.plan.likes_count ?? 0}
            canLike={Boolean(user)}
          />
          <ShareButton />
          <ForkButton slug={slug} locale={locale} />
          <CreateWithConditionsButton conditions={conditions} />
          <Link
            href={localizePath('/shiori', language)}
            className="ml-auto text-xs font-semibold text-primary hover:underline"
          >
            {t('backToList')}
          </Link>
        </div>

        {/* Conditions Card */}
        {conditions && (
          <ConditionsCard conditions={conditions} language={language} />
        )}

        {/* Day Timeline */}
        {data.days?.map((day) => (
          <section key={day.id} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-dashed border-stone-200 dark:border-stone-700 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
                {t("dayLabel", { day: day.day_number })}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">{day.title ?? t('dayTitleFallback')}</p>
            </div>

            <div className="relative px-6 py-4">
              {/* Vertical line */}
              <div className="absolute left-10 top-4 bottom-4 w-0.5 bg-stone-100 dark:bg-stone-700" />

              <div className="space-y-6">
                {day.items?.map((item) => (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Time marker */}
                    <div className="flex-shrink-0 w-8 flex flex-col items-center z-10">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${getItemTypeDotColor(item.item_type)}`} />
                      {item.start_time && (
                        <span className="text-xs text-stone-400 dark:text-stone-500 mt-1 font-mono leading-none">
                          {item.start_time}
                        </span>
                      )}
                    </div>

                    {/* Item card */}
                    <div className={`flex-1 rounded-xl border-l-4 ${getItemTypeColor(item.item_type)} bg-stone-50 dark:bg-stone-700/50 border border-stone-100 dark:border-stone-700 p-4`}>
                      {item.location && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{item.location}</p>
                      )}
                      <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">{item.title}</h3>
                      {item.description && (
                        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{item.description}</p>
                      )}
                      {item.note && (
                        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 italic border-t border-stone-100 dark:border-stone-600 pt-2">
                          {item.note}
                        </p>
                      )}

                      {/* Journal entry */}
                      {item.journal?.content && (
                        <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full bg-white dark:bg-stone-800 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                              {formatPhaseLabel(item.journal.phase, t)}
                            </span>
                            <span className="text-xs text-stone-500 dark:text-stone-400">
                              {new Date(item.journal.updated_at).toLocaleDateString(
                                resolveRegionalLocale(language)
                              )}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                            {item.journal.content}
                          </p>
                          {item.journal.place_name && (
                            <p className="mt-3 text-xs text-stone-600 dark:text-stone-400">
                              {t('visitedPlaceLabel')}: {item.journal.place_name}
                            </p>
                          )}
                          {item.journal.photo_urls.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.journal.photo_urls.map((url) => (
                                <a
                                  key={`${item.id}-${url}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 px-2 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600"
                                >
                                  {t('photoLink')}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Related Shiori */}
        <Suspense fallback={null}>
          <RelatedShioriSection
            destination={data.plan.destination}
            currentSlug={slug}
            language={language}
          />
        </Suspense>
      </div>
    </main>
  );
}
