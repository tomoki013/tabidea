"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FaChevronDown, FaSearch } from "react-icons/fa";
import type { LanguageCode, RegionCode } from "@/lib/i18n/locales";
import { getRegionLabel } from "@/lib/i18n/regions";
import { SEARCH_REGION_OPTION_LIMIT, searchRegionOptions } from "@/lib/i18n/region-search";

interface RegionSearchSelectProps {
  language: LanguageCode;
  value: RegionCode;
  onChange: (next: RegionCode) => void;
  className?: string;
}

export default function RegionSearchSelect({
  language,
  value,
  onChange,
  className,
}: RegionSearchSelectProps) {
  const tSettings = useTranslations("settings");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const listboxId = useId();

  const options = useMemo(
    () => searchRegionOptions(language, deferredQuery, SEARCH_REGION_OPTION_LIMIT),
    [language, deferredQuery]
  );

  const selectedLabel = useMemo(
    () => `${getRegionLabel(value, language)} (${value})`,
    [value, language]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    setQuery("");
  };

  const openMenu = () => {
    setIsOpen(true);
    setQuery("");
    setActiveIndex(0);
  };

  const handleSelect = (next: RegionCode) => {
    onChange(next);
    closeMenu();
  };

  const boundedActiveIndex =
    options.length > 0 ? Math.min(activeIndex, options.length - 1) : -1;

  return (
    <div className={`relative ${className ?? ""}`.trim()} ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => {
          if (isOpen) {
            closeMenu();
            return;
          }
          openMenu();
        }}
        className="w-full px-3 py-2 rounded-sm border border-stone-300 bg-white text-stone-700 font-hand focus:outline-none focus:border-primary flex items-center justify-between gap-2 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-100"
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <FaChevronDown
          className={`text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-sm border border-stone-300 bg-white shadow-lg dark:bg-stone-900 dark:border-stone-700">
          <div className="p-2 border-b border-stone-200 dark:border-stone-700">
            <div className="relative">
              <FaSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                aria-hidden
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((prev) => Math.max(prev - 1, 0));
                    return;
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const active = boundedActiveIndex >= 0 ? options[boundedActiveIndex] : undefined;
                    if (active) {
                      handleSelect(active.value);
                    }
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeMenu();
                  }
                }}
                placeholder={tSettings("regionSearchPlaceholder")}
                className="w-full rounded-sm border border-stone-300 pl-9 pr-3 py-2 text-sm font-hand text-stone-700 focus:outline-none focus:border-primary dark:bg-stone-900 dark:border-stone-700 dark:text-stone-100"
              />
            </div>
            <p className="mt-2 text-xs text-stone-500 font-hand dark:text-stone-400">
              {tSettings("regionSearchResultsCount", { count: options.length })}
            </p>
          </div>

          <ul
            id={listboxId}
            role="listbox"
            className="max-h-64 overflow-auto py-1"
            aria-label={tSettings("region")}
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-stone-500 font-hand dark:text-stone-400">
                {tSettings("regionSearchNoResults")}
              </li>
            )}
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === boundedActiveIndex;

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm font-hand transition-colors ${
                      isActive
                        ? "bg-primary/10 text-stone-900 dark:bg-primary/20 dark:text-stone-100"
                        : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                    } ${isSelected ? "font-bold" : ""}`}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
