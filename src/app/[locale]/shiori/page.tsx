import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from "next-intl/server";
import { planService } from '@/lib/plans/service';
import { getRequestLanguage } from '@/lib/i18n/server';
import PublicPlanCard from '@/components/features/shiori/PublicPlanCard';
import ShioriFeedFilters from '@/components/features/shiori/ShioriFeedFilters';
import { Tape, HandwrittenText } from '@/components/ui/journal';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.shiori.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

interface PageProps {
  searchParams: Promise<{
    destination?: string;
    theme?: string;
    companions?: string;
    sort?: string;
  }>;
}

async function PublicPlansGrid({ destination, theme, companions, sort }: {
  destination?: string;
  theme?: string;
  companions?: string;
  sort?: string;
}) {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.shiori");
  const { plans, error } = await planService.getPublicShioriFeed({
    limit: 50,
    destination,
    theme,
    companions,
    sortBy: sort === 'popular' ? 'popular' : 'latest',
  });

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500 dark:text-stone-400">{t("loadError")}</p>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-20 bg-white/50 dark:bg-stone-800/50 rounded-lg border border-dashed border-stone-300 dark:border-stone-600">
        <p className="text-stone-500 dark:text-stone-400 font-hand text-lg">{t("emptyTitle")}</p>
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-2">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
      {plans.map((plan) => (
        <PublicPlanCard key={plan.id} plan={plan} language={language} />
      ))}
    </div>
  );
}

export default async function ShioriPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const t = await getTranslations("pages.shiori");

  return (
    <main className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 pb-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('/images/grid-paper.png')] mix-blend-multiply" />

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto pt-32 px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 space-y-4">
            <div className="inline-block relative">
              <HandwrittenText tag="h1" className="text-4xl md:text-5xl font-bold text-stone-800 dark:text-stone-100 mb-2 transform -rotate-2">
                {t("title")}
              </HandwrittenText>
              <Tape color="blue" position="top-right" className="opacity-70 -right-8 -top-4 w-24" />
            </div>
            <p className="text-stone-500 dark:text-stone-400 font-hand text-lg max-w-2xl mx-auto">
              {t("leadLine1")}<br/>
              {t("leadLine2")}
            </p>
          </div>
        </div>

        <Suspense fallback={null}>
          <ShioriFeedFilters />
        </Suspense>

        <div className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-sm border border-stone-200 dark:border-stone-700" />
                ))}
              </div>
            }
          >
            <PublicPlansGrid
              destination={params.destination}
              theme={params.theme}
              companions={params.companions}
              sort={params.sort}
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
