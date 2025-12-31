"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const faqs = [
  {
    q: "料金はかかりますか？",
    a: "現在はプレビュー版のため、すべての機能を無料でご利用いただけます。将来的に商用サービスとして正式リリースする際には、一部機能が有料となる可能性があります。",
  },
  {
    q: "このサービスについて教えてください",
    a: "将来的な商用展開を目指して開発されている旅行計画サービスです。現在は機能の検証と品質向上を行っている段階です。開発の進捗や詳細はGitHubでも公開しています。",
  },
  {
    q: "入力した情報はAIの学習に使われますか？",
    a: "いいえ、Google Gemini APIの規約に基づき、入力されたデータがモデルの学習に使用されることはありません。安心してご利用ください。",
  },
  {
    q: "生成されたプランの正確性は保証されますか？",
    a: "AIはもっともらしい情報を生成しますが、ハルシネーション（嘘の情報）が含まれる可能性があります。営業時間や料金などは、必ず公式サイト等で最新情報をご確認ください。",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full py-24 px-4 bg-[#fcfbf9]">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c]">
            このプロジェクトについて
          </h2>
          <p className="text-stone-600 leading-relaxed font-hand text-lg max-w-2xl mx-auto">
            AI Travel Plannerは、Google Geminiを活用して、あなたの理想の旅行プランを提案するサービスです。<br />
            旅のワクワク感を大切にし、手書きの旅行日記のような温かみのあるデザインを目指しました。
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
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
