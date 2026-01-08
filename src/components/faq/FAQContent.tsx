"use client";

import { useState } from "react";
import { FaSearch, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { faqs } from "@/lib/data/faq";
import FAQCategoryList from "./FAQCategoryList";
import { motion } from "framer-motion";

export default function FAQContent() {
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
          placeholder="キーワードで検索（例：予算、キャンセル、アプリ）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-stone-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#e67e22] focus:border-transparent shadow-sm text-stone-700 placeholder:text-stone-400 transition-all"
        />
      </div>

      {/* Results or Categories */}
      {searchTerm ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-stone-500 mb-6">
            「{searchTerm}」の検索結果 ({filteredFaqs.length}件)
          </h2>
          {filteredFaqs.length > 0 ? (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-[#fffdfa] transition-colors"
                  >
                    <span className="font-bold text-lg text-[#2c2c2c]">{faq.q}</span>
                    {openIndex === index ? (
                      <FaChevronUp className="text-[#e67e22]" />
                    ) : (
                      <FaChevronDown className="text-stone-400" />
                    )}
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: openIndex === index ? "auto" : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-stone-600 leading-relaxed border-t border-dashed border-stone-200 bg-[#fffdfa]">
                      {faq.a}
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500">
              見つかりませんでした。別のキーワードをお試しください。
            </div>
          )}
        </div>
      ) : (
        <FAQCategoryList />
      )}
    </div>
  );
}
