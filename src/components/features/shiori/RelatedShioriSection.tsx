import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { planService } from '@/lib/plans/service';
import { localizePath } from '@/lib/i18n/locales';

interface RelatedShioriSectionProps {
  destination: string | null;
  currentSlug: string;
  language: 'ja' | 'en';
}

export default async function RelatedShioriSection({
  destination,
  currentSlug,
  language,
}: RelatedShioriSectionProps) {
  if (!destination) return null;

  const t = await getTranslations({ locale: language, namespace: 'components.features.shiori.relatedSection' });
  const { plans } = await planService.getPublicShioriFeed({ destination, limit: 5 });
  const related = (plans ?? []).filter((p) => p.slug !== currentSlug).slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200 mb-4">{t('title')}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {related.map((plan) => (
          <Link
            key={plan.id}
            href={localizePath(`/shiori/${plan.slug}`, language)}
            className="flex-shrink-0 w-48 group"
          >
            <div className="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-28 bg-stone-100 dark:bg-stone-700">
                {plan.thumbnailUrl ? (
                  <Image
                    src={plan.thumbnailUrl}
                    alt={plan.destination ?? ''}
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <FaMapMarkerAlt size={24} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200 line-clamp-2">
                  {plan.destination ?? destination}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {plan.durationDays ? `${plan.durationDays}日間` : ''}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
