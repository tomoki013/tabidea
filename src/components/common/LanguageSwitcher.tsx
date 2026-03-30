"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaGlobe, FaChevronDown, FaCheck } from "react-icons/fa";
import { updateDisplayLanguage } from "@/app/actions/user-settings";
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "@/lib/i18n/locales";
import {
  resolveLanguageFromPathname,
  switchLanguagePath,
} from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("languageSwitcher");
  const currentLanguage = resolveLanguageFromPathname(pathname);
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [menuOffsetX, setMenuOffsetX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setMenuOffsetX(0);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setMenuOffsetX(0);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const adjustMenuPosition = () => {
      const menuElement = menuRef.current;
      if (!menuElement) {
        return;
      }

      const viewportPadding = 8;
      const rect = menuElement.getBoundingClientRect();
      let delta = 0;

      if (rect.left < viewportPadding) {
        delta = viewportPadding - rect.left;
      }

      const rightEdge = rect.right + delta;
      const maxRight = window.innerWidth - viewportPadding;
      if (rightEdge > maxRight) {
        delta += maxRight - rightEdge;
      }

      setMenuOffsetX(delta);
    };

    const animationFrameId = window.requestAnimationFrame(adjustMenuPosition);
    window.addEventListener("resize", adjustMenuPosition);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", adjustMenuPosition);
    };
  }, [isOpen]);

  const handleLanguageChange = (language: LanguageCode) => {
    if (language === currentLanguage) {
      setIsOpen(false);
      setMenuOffsetX(0);
      return;
    }

    setIsOpen(false);
    setMenuOffsetX(0);

    if (isAuthenticated) {
      updateDisplayLanguage(language).catch((error) => {
        console.error("Failed to persist display language:", error);
      });
    }

    const nextPath = switchLanguagePath(pathname, language);
    const queryString = searchParams.toString();
    const href = queryString ? `${nextPath}?${queryString}` : nextPath;

    window.location.assign(href);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() =>
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) {
              setMenuOffsetX(0);
            }
            return next;
          })
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={t("label")}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-300/90 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-stone-500 dark:bg-stone-800/90 dark:text-stone-100 dark:hover:bg-stone-700 dark:focus-visible:ring-offset-[#171717]"
      >
        <FaGlobe className="text-[0.75rem] text-stone-500 dark:text-stone-300" />
        <span>{t(currentLanguage)}</span>
        <FaChevronDown className={`text-[0.6rem] text-stone-400 transition-transform dark:text-stone-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          style={{
            transform: menuOffsetX !== 0 ? `translateX(${menuOffsetX}px)` : undefined,
          }}
          className="absolute right-0 top-[calc(100%+0.45rem)] z-50 min-w-[10rem] max-w-[calc(100vw-1rem)] rounded-2xl border border-stone-300 bg-white p-1.5 shadow-xl dark:border-stone-600 dark:bg-stone-800"
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
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
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
