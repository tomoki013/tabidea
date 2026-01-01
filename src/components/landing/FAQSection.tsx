"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { faqs } from "@/lib/data/faq";

interface FAQSectionProps {
  limit?: number;
}

export default function FAQSection({ limit }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const displayFaqs = limit ? faqs.slice(0, limit) : faqs;

  return (
    <section className="w-full py-24 px-4 bg-[#fcfbf9]">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c]">
            {limit ? "よくある質問" : "よくある質問（すべて）"}
          </h2>
          <p className="text-stone-600 leading-relaxed font-hand text-lg max-w-2xl mx-auto">
            AI Travel Plannerは、Google Geminiを活用して、あなたの理想の旅行プランを提案するサービスです。<br />
            旅のワクワク感を大切にし、手書きの旅行日記のような温かみのあるデザインを目指しました。
          </p>
        </div>

        <div className="space-y-4">
          {displayFaqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-[#fcfbf9] transition-colors"
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
                <div className="p-6 pt-0 text-stone-600 leading-relaxed border-t border-dashed border-stone-200">
                  {faq.a}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
