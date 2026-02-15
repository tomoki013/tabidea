"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { JournalSheet, Tape, HandwrittenText, JournalButton } from "@/components/ui/journal";

const examples = [
  {
    location: "京都",
    theme: "静寂と歴史",
    note: "朝一番の清水寺から始まり、嵐山の竹林で深呼吸。夜は先斗町で京料理を。",
    tapeColor: "green",
    rotate: "rotate-1",
  },
  {
    location: "沖縄",
    theme: "青と白のコントラスト",
    note: "レンタカーで古宇利島へ。美ら海水族館の後は、サンセットビーチで波の音を聴く。",
    tapeColor: "blue",
    rotate: "-rotate-1",
  },
  {
    location: "金沢",
    theme: "アートと海鮮",
    note: "21世紀美術館で現代アートに触れ、近江町市場で新鮮な海鮮丼を堪能する旅。",
    tapeColor: "yellow",
    rotate: "rotate-2",
  },
];

export default function ExampleSection() {
  return (
    <section className="w-full py-24 px-4 border-t border-dashed border-stone-200 relative overflow-hidden bg-[#fcfbf9]">
       {/* Background Pattern */}
       <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        <div className="text-center space-y-4">
          <HandwrittenText tag="h2" className="text-3xl sm:text-4xl font-bold text-stone-800">
            みんなの旅の記録
          </HandwrittenText>
          <p className="text-stone-500 font-hand text-lg">
            例えばこんなプラン。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {examples.map((ex, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`h-full ${ex.rotate} hover:rotate-0 transition-transform duration-300`}
            >
              <JournalSheet className="h-full relative pt-10 pb-6 px-6 bg-white hover:shadow-xl transition-all border-l-0">
                 <Tape color={ex.tapeColor as "yellow" | "pink" | "blue" | "green" | "white" | "red"} position="top-center" className="opacity-90 w-24" />

                <div className="flex justify-between items-baseline mb-4 border-b-2 border-stone-100 border-dashed pb-2">
                  <h3 className="text-2xl font-serif font-bold text-stone-800">
                    {ex.location}
                  </h3>
                  <span className="text-xs font-bold font-sans uppercase tracking-wider text-stone-400">
                    {ex.theme}
                  </span>
                </div>
                <HandwrittenText className="text-stone-700 leading-relaxed text-lg">
                  &quot;{ex.note}&quot;
                </HandwrittenText>
              </JournalSheet>
            </motion.div>
          ))}
        </div>

        {/* CTA to Sample Plans Page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <div className="inline-block relative">
            <div className="mb-3 font-hand text-stone-600 text-base">
              もっと色々なプランを見てみませんか？
            </div>
            <Link href="/samples">
              <JournalButton variant="outline" size="lg" className="border-primary/50 text-primary hover:bg-primary/5">
                 サンプルプランをもっと見る
                 <span className="ml-2 font-hand">→</span>
              </JournalButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
