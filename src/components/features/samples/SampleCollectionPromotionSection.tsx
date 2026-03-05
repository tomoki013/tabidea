"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FaBookOpen, FaArrowRight } from 'react-icons/fa';
import { DEFAULT_LANGUAGE, getLanguageFromPathname, localizePath } from '@/lib/i18n/locales';
import { JournalSheet, Tape, HandwrittenText } from '@/components/ui/journal';

export default function SampleCollectionPromotionSection() {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const t = useTranslations("components.features.samples.collectionPromotion");

  return (
    <div className="w-full max-w-3xl mx-auto mt-16 mb-20 px-4">
      <JournalSheet variant="default" className="relative p-8 overflow-hidden transform -rotate-1 transition-transform hover:rotate-0 duration-500">
        <Tape color="yellow" position="top-center" className="opacity-80 -top-4 w-32" />

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
            <FaBookOpen className="text-2xl text-yellow-600" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">EXPLORE MORE PLANS</p>
            <HandwrittenText tag="h2" className="text-2xl md:text-3xl font-bold text-stone-800">
              {t("title")}
            </HandwrittenText>
          </div>

          <p className="text-stone-600 font-hand leading-relaxed max-w-md">
            {t("leadLine1")}<br />
            {t("leadLine2")}
          </p>

          <Link
            href={localizePath("/shiori", language)}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-stone-800 text-white rounded-full font-bold shadow-md hover:bg-stone-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <span className="font-serif">
              {t("cta")}
            </span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </JournalSheet>
    </div>
  );
}
