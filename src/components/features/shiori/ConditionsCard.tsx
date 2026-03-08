import { getTranslations } from 'next-intl/server';
import type { PublicConditionsSnapshot } from '@/types/plans';

interface ConditionsCardProps {
  conditions: PublicConditionsSnapshot | null | undefined;
  language: 'ja' | 'en';
}

export default async function ConditionsCard({ conditions, language }: ConditionsCardProps) {
  if (!conditions) return null;

  const t = await getTranslations({ locale: language, namespace: 'components.features.shiori.conditionsCard' });

  const companionLabel = conditions.companions
    ? t(`companionOptions.${conditions.companions}`, { fallback: conditions.companions })
    : null;

  const budgetLabel = conditions.budget
    ? t(`budgetOptions.${conditions.budget}`, { fallback: conditions.budget })
    : null;

  const paceLabel = conditions.pace
    ? t(`paceOptions.${conditions.pace}`, { fallback: conditions.pace })
    : null;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-6">
      <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">
        {t('title')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        {conditions.destinations.length > 0 && (
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t('destinations')}</p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{conditions.destinations.join(', ')}</p>
          </div>
        )}
        {conditions.dates && (
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t('dates')}</p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{conditions.dates}</p>
          </div>
        )}
        {companionLabel && (
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t('companions')}</p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{companionLabel}</p>
          </div>
        )}
        {budgetLabel && (
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t('budget')}</p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{budgetLabel}</p>
          </div>
        )}
        {paceLabel && (
          <div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t('pace')}</p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{paceLabel}</p>
          </div>
        )}
        {conditions.travelVibe && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">{t('travelVibe')}</p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{conditions.travelVibe}</p>
          </div>
        )}
      </div>

      {conditions.theme.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">{t('themes')}</p>
          <div className="flex flex-wrap gap-2">
            {conditions.theme.map((key) => (
              <span
                key={key}
                className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20"
              >
                #{t(`themeOptions.${key}`, { fallback: key })}
              </span>
            ))}
          </div>
        </div>
      )}

      {conditions.mustVisitPlaces && conditions.mustVisitPlaces.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">{t('mustVisit')}</p>
          <div className="flex flex-wrap gap-2">
            {conditions.mustVisitPlaces.map((place) => (
              <span
                key={place}
                className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300"
              >
                {place}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
