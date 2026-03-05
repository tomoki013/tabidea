"use client";

import Link from 'next/link';
import { useLocale, useTranslations } from "next-intl";
import { FaCompass, FaMap } from 'react-icons/fa6';
import { localizeHref } from '@/lib/i18n/navigation';
import type { LanguageCode } from "@/lib/i18n/locales";

export default function NotFound() {
  const t = useTranslations("pages.rootNotFound");
  const locale = useLocale() as LanguageCode;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">

      {/* Icon or decorative element */}
      <div className="mb-6 text-primary/20 animate-pulse">
         <FaCompass size={120} />
      </div>

      <h1 className="text-6xl md:text-8xl font-serif font-bold text-primary mb-4">
        404
      </h1>

      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 font-serif">
        {t("title")}
      </h2>

      <div className="max-w-md mx-auto space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          {t("description")}
        </p>

        <p className="font-hand text-lg text-secondary">
          {t("subLine1")}<br/>
          {t("subLine2")}
        </p>

        <div className="pt-4">
          <Link
            href={localizeHref("/", locale)}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <FaMap className="text-sm" />
            {t("back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
