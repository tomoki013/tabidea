"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

const THEME_OPTIONS = [
  'gourmet', 'cafeHopping', 'historyCulture', 'natureScenery',
  'shopping', 'art', 'onsenSauna', 'adventure',
];

const COMPANION_OPTIONS = ['solo', 'couple', 'family_kids', 'friends'];

export default function ShioriFeedFilters() {
  const t = useTranslations("pages.shiori.detail.feed");
  const tTheme = useTranslations("components.features.shiori.conditionsCard.themeOptions");
  const tComp = useTranslations("components.features.shiori.conditionsCard.companionOptions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const destination = searchParams.get('destination') ?? '';
  const activeTheme = searchParams.get('theme') ?? '';
  const activeCompanion = searchParams.get('companions') ?? '';
  const sortBy = searchParams.get('sort') ?? 'latest';

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams]);

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilters = destination || activeTheme || activeCompanion || sortBy !== 'latest';

  return (
    <div className="sticky top-16 z-20 bg-[#fcfbf9]/90 dark:bg-stone-900/90 backdrop-blur border-b border-stone-200 dark:border-stone-700 py-3 px-4">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Destination search + sort */}
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            value={destination}
            onChange={(e) => update('destination', e.target.value)}
            placeholder={t("filterPlaceholder")}
            className="flex-1 min-w-0 max-w-xs px-3 py-1.5 rounded-full border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => update('sort', 'latest')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sortBy === 'latest'
                  ? 'bg-primary text-white'
                  : 'border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {t("sortLatest")}
            </button>
            <button
              onClick={() => update('sort', 'popular')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sortBy === 'popular'
                  ? 'bg-primary text-white'
                  : 'border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              {t("sortPopular")}
            </button>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-stone-500 dark:text-stone-400 hover:underline"
            >
              {t("clearFilters")}
            </button>
          )}
        </div>

        {/* Theme chips */}
        <div className="flex gap-2 flex-wrap">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme}
              onClick={() => update('theme', activeTheme === theme ? '' : theme)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTheme === theme
                  ? 'bg-primary text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              #{tTheme(theme)}
            </button>
          ))}
        </div>

        {/* Companion chips */}
        <div className="flex gap-2 flex-wrap">
          {COMPANION_OPTIONS.map((comp) => (
            <button
              key={comp}
              onClick={() => update('companions', activeCompanion === comp ? '' : comp)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCompanion === comp
                  ? 'bg-amber-500 text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              {tComp(comp)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
