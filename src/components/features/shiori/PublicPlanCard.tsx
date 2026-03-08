import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FaCalendarAlt, FaMapMarkerAlt, FaHeart, FaBookOpen } from 'react-icons/fa';
import { PublicShioriListItem } from '@/types';
import { localizePath, resolveRegionalLocale } from '@/lib/i18n/locales';
import { Tape } from '@/components/ui/journal';

const ALL_THEMES = [
  'gourmet', 'cafeHopping', 'historyCulture', 'natureScenery', 
  'spectacularViews', 'cityWalk', 'resort', 'relax', 'hiddenSpots', 
  'shopping', 'art', 'architecture', 'nightlife', 'experienceActivity', 
  'localExperience', 'onsenSauna', 'wellness', 'photogenic', 
  'powerSpots', 'seasonalEvents', 'adventure', 'oshikatsu'
];

function getFallbackTags(destination: string | null): string[] {
  if (!destination) return ['relax', 'cityWalk'];
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = destination.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx1 = Math.abs(hash) % ALL_THEMES.length;
  const idx2 = Math.abs(hash + 7) % ALL_THEMES.length;
  const tag1 = ALL_THEMES[idx1];
  const tag2 = ALL_THEMES[idx2];
  return tag1 === tag2 ? [tag1] : [tag1, tag2];
}

interface PublicPlanCardProps {
  plan: PublicShioriListItem;
  language: 'ja' | 'en';
}

export default async function PublicPlanCard({ plan, language }: PublicPlanCardProps) {
  const t = await getTranslations({
    locale: language,
    namespace: 'components.features.shiori.publicPlanCard',
  });
  const tConditions = await getTranslations({
    locale: language,
    namespace: 'components.features.shiori.conditionsCard',
  });
  const destination = plan.destination || t('destinationTbd');

  const days = plan.durationDays || 0;
  const duration = days > 0
    ? t('duration', { nights: Math.max(0, days - 1), days })
    : t('durationTbd');

  const themes = plan.conditionsSummary?.theme?.length 
    ? plan.conditionsSummary.theme.slice(0, 3) 
    : getFallbackTags(plan.destination);
  const companion = plan.conditionsSummary?.companions ?? null;

  return (
    <Link href={localizePath(`/shiori/${plan.slug}`, language)} className="block group h-full">
      <div className="relative bg-card h-full flex flex-col shadow-sm border border-stone-200 dark:border-stone-700 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:rotate-1 rounded-sm overflow-hidden">

        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-stone-100 dark:bg-stone-700 border-b border-stone-100 dark:border-stone-700">
          {plan.thumbnailUrl ? (
            <Image
              src={plan.thumbnailUrl}
              alt={destination}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 dark:text-stone-600 bg-stone-50 dark:bg-stone-800">
              <FaMapMarkerAlt size={32} />
            </div>
          )}

          {/* Tape Effect */}
          <Tape color="white" position="top-center" className="opacity-90 -top-3 w-24 z-10" />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-serif font-bold text-xl text-white drop-shadow-md line-clamp-2 leading-tight">
              {destination}
            </h3>
            {companion && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                {tConditions(`companionOptions.${companion}`, { fallback: companion })}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col justify-between bg-card">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-mono">
            <span className="flex items-center gap-1 bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded-full">
              <FaCalendarAlt className="text-stone-400 dark:text-stone-500" />
              {duration}
            </span>
            <span>
              {new Date(plan.createdAt).toLocaleDateString(resolveRegionalLocale(language))}
            </span>
          </div>

          {themes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {themes.map((key) => (
                <span
                  key={key}
                  className="inline-block px-2 py-0.5 rounded-full text-xs bg-primary/10 dark:bg-primary/20 text-primary"
                >
                  #{tConditions(`themeOptions.${key}`, { fallback: key })}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-stone-700 px-2 py-1 border border-stone-200 dark:border-stone-600">
              <FaBookOpen className="text-stone-400" />
              {t('entries')} {plan.entriesCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-stone-700 px-2 py-1 border border-stone-200 dark:border-stone-600">
              <FaHeart className="text-rose-400" />
              {t('likes')} {plan.likesCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
