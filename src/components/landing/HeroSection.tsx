"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaBookOpen } from "react-icons/fa";

interface HeroSectionProps {
  children: ReactNode;
}

export default function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative w-full flex flex-col items-center pt-16 sm:pt-24 pb-12 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 to-transparent -z-10" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/cream-paper.png')] opacity-20 mix-blend-multiply -z-10" />

      <div className="max-w-5xl mx-auto px-4 w-full flex flex-col gap-10 items-center text-center">
        <div className="space-y-6">
          <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
             className="inline-flex items-center gap-2 text-[#e67e22] font-serif font-bold tracking-wider text-sm sm:text-base bg-white/80 px-4 py-1.5 rounded-full border border-orange-100 shadow-sm"
          >
             <FaBookOpen className="text-sm" />
             <span>Story of your journey starts here</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-[#2c2c2c] leading-tight tracking-tight drop-shadow-sm"
          >
            心の奥にある『行きたい』を、
            <br className="sm:hidden" />
            かたちに。
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-lg sm:text-2xl text-stone-600 font-hand leading-relaxed max-w-2xl mx-auto"
          >
            まだ言葉にならない旅の種を、
            <br className="sm:hidden" />
            AIと一緒に育ててみませんか？
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="w-full relative z-10"
        >
          {children}

          <div className="mt-8 text-center">
             <Link
              href="/usage"
              className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-[#e67e22] transition-colors border-b border-dashed border-stone-300 hover:border-[#e67e22] pb-0.5"
            >
              <span>初めての方はこちら</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
