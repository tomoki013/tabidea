"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const examples = [
  {
    location: "京都",
    theme: "静寂と歴史",
    note: "朝一番の清水寺から始まり、嵐山の竹林で深呼吸。夜は先斗町で京料理を。",
    color: "bg-[#e8f5e9] border-[#a5d6a7]", // Greenish
    rotate: "rotate-1",
  },
  {
    location: "沖縄",
    theme: "青と白のコントラスト",
    note: "レンタカーで古宇利島へ。美ら海水族館の後は、サンセットビーチで波の音を聴く。",
    color: "bg-[#e3f2fd] border-[#90caf9]", // Blueish
    rotate: "-rotate-1",
  },
  {
    location: "金沢",
    theme: "アートと海鮮",
    note: "21世紀美術館で現代アートに触れ、近江町市場で新鮮な海鮮丼を堪能する旅。",
    color: "bg-[#fff3e0] border-[#ffcc80]", // Orangeish
    rotate: "rotate-2",
  },
];

export default function ExampleSection() {
  return (
    <section className="w-full py-24 px-4 bg-white border-t border-dashed border-gray-200">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
            みんなの旅の記録
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
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
              className={`p-6 rounded-sm shadow-sm border-l-4 ${ex.color} ${ex.rotate} transition-transform hover:rotate-0 hover:shadow-md cursor-default`}
            >
              <div className="flex justify-between items-baseline mb-4 border-b border-dashed border-gray-300 pb-2">
                <h3 className="text-2xl font-serif font-bold text-gray-800">
                  {ex.location}
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {ex.theme}
                </span>
              </div>
              <p className="font-hand text-gray-700 leading-relaxed text-lg">
                &quot;{ex.note}&quot;
              </p>
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
          <div className="inline-block">
            <div className="mb-3 font-hand text-stone-600 text-base">
              もっと色々なプランを見てみませんか？
            </div>
            <Link
              href="/samples"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[#e67e22] font-bold rounded-full border-2 border-[#e67e22] border-dashed hover:bg-[#e67e22] hover:text-white transition-all hover:scale-105 shadow-sm group"
            >
              <span>サンプルプランをもっと見る</span>
              <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
