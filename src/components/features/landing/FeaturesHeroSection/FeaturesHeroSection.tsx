"use client";

import { motion } from "framer-motion";
import { FaBookOpen, FaMagic, FaPlaneDeparture } from "react-icons/fa";

export default function FeaturesHeroSection() {
  return (
    <section className="relative w-full pt-32 pb-24 sm:pb-32 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[#fcfbf9]" />
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 mix-blend-multiply" />

      {/* Diagonal wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-orange-50/30 transform -skew-y-3 origin-top-left scale-110" />

      <div className="relative max-w-5xl mx-auto px-4 text-center z-10">
         {/* Badge / Label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full bg-white/80 backdrop-blur-sm border-2 border-dashed border-primary/30 text-primary font-bold text-sm tracking-widest shadow-sm"
        >
          <FaBookOpen className="text-sm" />
          <span>FEATURES & GUIDE</span>
        </motion.div>

        {/* Main Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl sm:text-6xl font-serif font-bold text-foreground mb-8 leading-tight"
        >
          旅の計画は、
          <span className="block sm:inline mt-2 sm:mt-0 relative">
            もっと自由でいい。
            <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/20 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
          </span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="text-lg sm:text-xl text-stone-600 font-hand max-w-2xl mx-auto leading-relaxed"
        >
          Tabidea（タビデア）は、AIと対話しながら
          <br className="hidden sm:block" />
          あなただけの旅行プランを作成するサービスです。
          <br />
          便利な機能と、かんたんな使い方をご紹介します。
        </motion.p>

        {/* Floating Icons decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 max-w-4xl"
        >
          <div className="absolute top-0 left-10 text-primary/10 animate-bounce duration-[3000ms]">
            <FaPlaneDeparture size={60} />
          </div>
          <div className="absolute bottom-10 right-10 text-primary/10 animate-pulse duration-[4000ms]">
            <FaMagic size={50} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
