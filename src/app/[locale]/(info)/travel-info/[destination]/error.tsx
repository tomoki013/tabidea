'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { localizeHref, resolveLanguageFromPathname } from '@/lib/i18n/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 目的地ページのエラー表示
 */
export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations("errors.ui.travelInfoDestination");
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);

  useEffect(() => {
    console.error('Travel info page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-white rounded-3xl border-2 border-red-200 p-8 shadow-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-red-800 mb-2">
            {t("title")}
          </h1>
          <p className="text-red-600 mb-6">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              {t("retry")}
            </button>
            <Link
              href={localizeHref("/travel-info", language)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t("backToTop")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
