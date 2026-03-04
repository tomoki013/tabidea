"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { FaChevronRight } from "react-icons/fa";
import { faqs, faqCategories } from "@/lib/data/faq";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
} from "@/lib/i18n/locales";
import FAQCard from "@/components/faq/FAQCard";

interface FAQSectionProps {
  limit?: number;
  categoryId?: string;
}

export default function FAQSection({ limit, categoryId }: FAQSectionProps) {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  let sourceFaqs = faqs;
  if (categoryId) {
    sourceFaqs = faqCategories.find((c) => c.id === categoryId)?.items || [];
  }

  const displayFaqs = limit ? sourceFaqs.slice(0, limit) : sourceFaqs;

  return (
    <section className="w-full py-24 px-4 bg-[#fcfbf9]">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c]">
            {limit || categoryId
              ? (language === "ja" ? "よくある質問" : "FAQ")
              : (language === "ja" ? "よくある質問（すべて）" : "FAQ (All)")}
          </h2>
          <p className="text-stone-600 leading-relaxed font-hand text-lg max-w-2xl mx-auto">
            {language === "ja"
              ? "Tabideaは、AIを活用して、あなたの理想の旅行プランを提案するサービスです。"
              : "Tabidea uses AI to suggest travel plans tailored to you."}<br />
            {language === "ja"
              ? "旅のワクワク感を大切にし、手書きの旅行日記のような温かみのあるデザインを目指しました。"
              : "We designed it to keep the excitement of travel planning with a warm journal-like feel."}
          </p>
        </div>

        <div className="space-y-4">
          {displayFaqs.map((faq, index) => (
            <FAQCard
              key={index}
              question={faq.q}
              answer={faq.a}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
          {displayFaqs.length === 0 && (
            <p className="text-center text-stone-500">
              {language === "ja" ? "該当する質問がありません。" : "No matching questions."}
            </p>
          )}
        </div>

        {limit && !categoryId && (
          <div className="mt-12 text-center">
            <Link
              href={localizePath("/faq", language)}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#e67e22] text-white font-bold rounded-full hover:bg-[#d35400] transition-all hover:scale-105 shadow-md group"
            >
              <span>{language === "ja" ? "よくある質問一覧を見る" : "View all FAQs"}</span>
              <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
