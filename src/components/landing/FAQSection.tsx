"use client";

import Link from "next/link";
import { useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import { faqs } from "@/lib/data/faq";
import FAQCard from "@/components/faq/FAQCard";

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
            Tabideaは、AIを活用して、あなたの理想の旅行プランを提案するサービスです。<br />
            旅のワクワク感を大切にし、手書きの旅行日記のような温かみのあるデザインを目指しました。
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
        </div>

        {limit && (
          <div className="mt-12 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#e67e22] text-white font-bold rounded-full hover:bg-[#d35400] transition-all hover:scale-105 shadow-md group"
            >
              <span>よくある質問一覧を見る</span>
              <FaChevronRight className="text-sm group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
