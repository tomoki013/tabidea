"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { samplePlans } from "@/lib/samplePlans";
import { FaArrowRight } from "react-icons/fa6";

export default function SamplesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      <main className="flex-1 w-full flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full pt-16 pb-8 text-center px-4">
          <div className="inline-block mb-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
            Sample Plans
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 tracking-tight">
            サンプルプラン集
          </h1>
          <p className="text-stone-500 mt-3 font-hand text-lg">
            人気の旅行プランをベースにカスタマイズできます
          </p>
        </div>

        {/* Sample Plans Grid */}
        <div className="w-full max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {samplePlans.map((sample, index) => (
              <motion.div
                key={sample.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/samples/${sample.id}`}
                  className={`block p-6 rounded-xl shadow-sm border-l-4 ${sample.color} ${sample.rotate} transition-all hover:rotate-0 hover:shadow-md hover:scale-[1.02] cursor-pointer h-full`}
                >
                  <div className="flex justify-between items-baseline mb-3 border-b border-dashed border-gray-300 pb-2">
                    <h3 className="text-xl font-serif font-bold text-gray-800 leading-tight">
                      {sample.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {sample.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {sample.tags.slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white/80 text-gray-600 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-primary font-medium text-sm">
                    <span>{sample.userInput.dates}</span>
                    <span className="flex items-center gap-1">
                      詳細を見る
                      <FaArrowRight className="text-xs" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Back to Home CTA */}
        <div className="w-full flex justify-center pb-16 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-primary font-medium hover:text-primary/80 transition-colors"
          >
            ← トップに戻って自由にプランを作る
          </Link>
        </div>
      </main>
    </div>
  );
}
