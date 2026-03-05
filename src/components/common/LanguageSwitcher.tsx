"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaGlobe, FaChevronDown, FaCheck } from "react-icons/fa";
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLanguageChange = (language: LanguageCode) => {
    if (language === currentLanguage) {
      setIsOpen(false);
      return;
    }

    const nextPath = switchLanguagePath(pathname, language);
    const queryString = searchParams.toString();
    const href = queryString ? `${nextPath}?${queryString}` : nextPath;

    router.push(href);
    router.refresh();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={t("label")}
        className="inline-flex items-center gap-2 rounded-sm border border-stone-300 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-stone-500 dark:bg-stone-800/80 dark:text-stone-100 dark:hover:bg-stone-700"
      >
        <FaGlobe className="text-[0.65rem] text-stone-500 dark:text-stone-300" />
        <span>{t(currentLanguage)}</span>
        <FaChevronDown className={`text-[0.55rem] text-stone-400 transition-transform dark:text-stone-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 min-w-[9rem] rounded-sm border border-stone-300 bg-white p-1 shadow-lg dark:border-stone-600 dark:bg-stone-800"
        >
          {SUPPORTED_LANGUAGES.map((language) => {
            const active = language === currentLanguage;

            return (
              <button
                key={language}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => handleLanguageChange(language)}
                className={`flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                  active
                    ? "bg-primary/15 text-primary dark:bg-primary/25"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
                }`}
              >
                <span>{t(language)}</span>
                {active && <FaCheck className="text-[0.65rem]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

