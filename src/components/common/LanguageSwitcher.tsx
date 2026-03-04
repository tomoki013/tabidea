"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaGlobe } from "react-icons/fa";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "@/lib/i18n/locales";
import {
  resolveLanguageFromPathname,
  switchLanguagePath,
} from "@/lib/i18n/navigation";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("languageSwitcher");
  const currentLanguage = resolveLanguageFromPathname(pathname);

  const handleLanguageChange = (language: LanguageCode) => {
    if (language === currentLanguage) {
      return;
    }

    const nextPath = switchLanguagePath(pathname, language);
    const queryString = searchParams.toString();
    const href = queryString ? `${nextPath}?${queryString}` : nextPath;

    router.push(href);
    router.refresh();
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-flex items-center text-stone-400 dark:text-[#b6c6df]" aria-label={t("label")}>
        <FaGlobe className="text-xs" />
      </span>

      {SUPPORTED_LANGUAGES.map((language) => {
        const active = language === currentLanguage;

        return (
          <button
            key={language}
            type="button"
            onClick={() => handleLanguageChange(language)}
            className={`px-2 py-1 text-xs rounded-sm border transition-colors font-semibold ${
              active
                ? "text-stone-900 dark:text-white border-stone-500 dark:border-[#8ea8cd] bg-stone-100 dark:bg-[#314760]"
                : "text-stone-500 dark:text-[#c2d4ef] border-stone-200 dark:border-[#56739a] hover:text-stone-800 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-[#3b5270]"
            }`}
            aria-pressed={active}
          >
            {t(language)}
          </button>
        );
      })}
    </div>
  );
}

