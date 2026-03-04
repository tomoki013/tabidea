"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FaSearch } from "react-icons/fa";
import { faqs } from "@/lib/data/faq";
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from "@/lib/i18n/locales";
import FAQCategoryList from "./FAQCategoryList";
import FAQCard from "./FAQCard";

export default function FAQContent() {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = searchTerm
    ? faqs.filter(
        (f) =>
          f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.a.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      {/* Search Input */}
      <div className="relative max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FaSearch className="text-stone-400" />
        </div>
        <input
          type="text"
          placeholder={
            language === "ja"
              ? "キーワードで検索（例：予算、キャンセル、アプリ）"
              : "Search by keyword (e.g. budget, cancellation, app)"
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent shadow-sm text-stone-700 placeholder:text-stone-400 transition-all"
        />
      </div>

      {/* Results or Categories */}
      {searchTerm ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-stone-500 mb-6">
            {language === "ja"
              ? `「${searchTerm}」の検索結果 (${filteredFaqs.length}件)`
              : `Results for "${searchTerm}" (${filteredFaqs.length})`}
          </h2>
          {filteredFaqs.length > 0 ? (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <FAQCard
                  key={index}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openIndex === index}
                  onClick={() =>
                    setOpenIndex(openIndex === index ? null : index)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500">
              {language === "ja"
                ? "見つかりませんでした。別のキーワードをお試しください。"
                : "No results found. Try a different keyword."}
            </div>
          )}
        </div>
      ) : (
        <FAQCategoryList />
      )}
    </div>
  );
}
