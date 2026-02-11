"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  children: ReactNode;
}

export default function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative w-full flex flex-col items-center pt-28 sm:pt-36 pb-20 overflow-hidden bg-gradient-to-b from-stone-50 via-white to-white">
      {/* Subtle Background Accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent opacity-50" />

      <div className="max-w-5xl mx-auto px-4 w-full flex flex-col gap-10 items-center text-center relative z-10">
        <div className="space-y-6 max-w-3xl flex flex-col items-center">
          {/* Badge */}
          <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
          >
             <div className="inline-flex items-center gap-2 text-stone-600 font-medium tracking-wide text-sm bg-white px-4 py-1.5 rounded-full shadow-sm border border-stone-200/50 backdrop-blur-sm">
               <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <span>AI Travel Planner</span>
             </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold text-stone-900 leading-tight tracking-tight"
          >
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-stone-900 via-stone-700 to-stone-900 pb-2">
              行きたい場所を、
            </span>
            <span className="block text-primary">
              最高の体験に。
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-lg sm:text-xl text-stone-500 leading-relaxed max-w-2xl mx-auto font-medium"
          >
             AIが数秒であなただけの旅行プランを作成。<br className="hidden sm:block" />
             直感的な操作で、理想の旅を見つけましょう。
          </motion.p>
        </div>

        {/* Input Container - Modern Glassmorphism Style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="w-full relative z-10 mt-4"
        >
          {/* Main Content Container (No more Journal/Notebook styles) */}
          <div className="relative bg-white/50 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 p-1 sm:p-2 ring-1 ring-stone-900/5">
             <div className="bg-white/40 rounded-2xl w-full">
                {children}
             </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 mix-blend-multiply animate-blob" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl -z-10 mix-blend-multiply animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-stone-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply animate-blob animation-delay-4000" />
    </section>
  );
}
