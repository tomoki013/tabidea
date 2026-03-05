"use client";

import { useTranslations } from "next-intl";

export type LocalizedFAQItem = {
  q: string;
  a: string;
};

export type LocalizedFAQCategory = {
  id: string;
  title: string;
  items: LocalizedFAQItem[];
};

const CATEGORY_ORDER = [
  "planning",
  "account",
  "billing",
  "service",
  "trouble",
  "security",
  "others",
] as const;

type LocalizedFAQData = {
  items: LocalizedFAQItem[];
};

export function useLocalizedFaqData() {
  const t = useTranslations("components.faq");
  const categoryTitles = t.raw("categoryList.categoryTitles") as Record<string, string>;
  const categoriesData = t.raw("data.categories") as Record<string, LocalizedFAQData>;

  const categories: LocalizedFAQCategory[] = CATEGORY_ORDER.map((id) => ({
    id,
    title: categoryTitles[id] ?? id,
    items: categoriesData[id]?.items ?? [],
  })).filter((category) => category.items.length > 0);

  const faqs = categories.flatMap((category) => category.items);

  return { categories, faqs };
}
