import { LoadingState } from '@/components/features/travel-info';
import { getTranslations } from 'next-intl/server';

/**
 * 目的地ページのローディング表示
 */
export default async function Loading() {
  const t = await getTranslations("app.info.travelInfoDestination.loading");

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <LoadingState
          message={t("message")}
          categoryCount={3}
        />
      </div>
    </div>
  );
}
