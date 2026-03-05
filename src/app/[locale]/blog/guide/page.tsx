import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from "next-intl/server";
import { localizePath } from '@/lib/i18n/locales';
import { getRequestLanguage } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.blog.guide.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function BlogGuidePage() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.blog.guide");
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-24">
      <header className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">{t("badge")}</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">
          {t("title")}
        </h1>
        <p className="mt-4 text-stone-600">
          {t("description")}
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">
          {t("featuresTitle")}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-stone-700">
          <li>{t("featuresList1")}</li>
          <li>{t("featuresList2")}</li>
          <li>{t("featuresList3")}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">
          {t("gettingStartedTitle")}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-stone-700">
          <li>{t("gettingStartedList1")}</li>
          <li>{t("gettingStartedList2")}</li>
          <li>{t("gettingStartedList3")}</li>
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={localizePath('/blog', language)} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">
            {t("openStudio")}
          </Link>
          <Link href={localizePath('/shiori', language)} className="rounded border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">
            {t("openShiori")}
          </Link>
        </div>
      </section>
    </main>
  );
}
