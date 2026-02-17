"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaGlobeAsia, FaArrowRight } from "react-icons/fa";

export default function CommunitySection() {
  return (
    <section className="w-full py-24 px-4 bg-stone-900 text-stone-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="inline-block p-4 rounded-full bg-stone-800/50 border border-stone-700 text-stone-300 text-3xl mb-4">
            <FaGlobeAsia />
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold tracking-tight">
            みんなの旅を見てみよう
          </h2>
          <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed">
            Tabideaを使って作られた、たくさんの旅行プランが公開されています。<br className="hidden md:block" />
            次の旅のヒントが見つかるかもしれません。
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/shiori"
            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/20"
          >
            <span>みんなの旅を見る</span>
            <FaArrowRight />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
