"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaBookOpen, FaMapMarkedAlt } from "react-icons/fa";

interface HeroSectionProps {
  children: ReactNode;
}

export default function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative w-full flex flex-col items-center pt-32 sm:pt-40 pb-20 overflow-hidden bg-[#fcfbf9]">
      {/* Background Elements - Paper Texture */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-60 mix-blend-multiply pointer-events-none -z-10" />

      {/* Decorative Floating Elements (Stamps/Icons) - Adjusted for more subtle, analog feel */}
      <motion.div
        initial={{ opacity: 0, rotate: -20, x: -50 }}
        animate={{ opacity: 0.05, rotate: -15, x: 0 }}
        transition={{ duration: 1.5 }}
        className="absolute top-20 left-4 md:left-20 text-9xl text-stone-800 pointer-events-none select-none hidden lg:block font-serif tracking-widest"
      >
        Travel
      </motion.div>
      <motion.div
        initial={{ opacity: 0, rotate: 15, x: 50 }}
        animate={{ opacity: 0.05, rotate: 10, x: 0 }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="absolute bottom-40 right-4 md:right-20 text-9xl text-[#d35400] pointer-events-none select-none hidden lg:block font-hand"
      >
        Memories
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 w-full flex flex-col gap-10 items-center text-center relative z-10">
        <div className="space-y-6 max-w-3xl">
          {/* Badge - Paper scrap style */}
          <motion.div
             initial={{ opacity: 0, y: -10, rotate: -2 }}
             animate={{ opacity: 1, y: 0, rotate: -2 }}
             transition={{ duration: 0.8 }}
             className="inline-flex items-center gap-2 text-[#e67e22] font-serif font-bold tracking-wider text-sm sm:text-base bg-[#fffdf5] px-6 py-2 shadow-sm border border-stone-300 border-dashed transform -rotate-2"
          >
             <FaBookOpen className="text-sm" />
             <span>Story of your journey starts here</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-[#2c2c2c] leading-tight tracking-tight"
          >
            心の奥にある
            <span className="relative inline-block mx-2">
              <span className="relative z-10">『行きたい』</span>
              <span className="absolute bottom-3 left-0 w-full h-4 bg-orange-100/80 -z-0 -rotate-1 rounded-sm mix-blend-multiply"></span>
            </span>
            を、
            <br className="sm:hidden" />
            かたちに。
          </motion.h1>

          {/* Subtext */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative inline-block mt-4"
          >
             <p className="text-lg sm:text-2xl text-stone-600 font-hand leading-relaxed max-w-2xl mx-auto">
              まだ言葉にならない旅の種を、
              <br className="sm:hidden" />
              AIと一緒に育ててみませんか？
            </p>

            {/* Hand-drawn arrow decoration - More subtle */}
            <svg className="absolute -right-6 -bottom-6 w-12 h-12 text-stone-400 hidden sm:block rotate-12 opacity-80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 20 Q 60 40 40 80 M 30 70 L 40 80 L 55 70" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </div>

        {/* Planner Container - Journal/Scrapbook Style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="w-full relative z-10 mt-6"
        >
          {/* Backing paper (stacked look) */}
          <div className="absolute inset-0 bg-[#f0eee9] rounded-sm transform rotate-1 translate-y-2 translate-x-2 shadow-sm border border-stone-200 z-0" />

          {/* Main Container */}
          <div className="relative bg-white p-1 sm:p-2 rounded-sm shadow-xl border border-stone-200 z-10 transform -rotate-1">
             {/* Inner Texture Container */}
             <div className="bg-[#fdfdfd] border border-stone-100 overflow-hidden relative min-h-[400px]">
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-20 mix-blend-multiply pointer-events-none" />

                {/* Grid or Lined pattern for notebook feel */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:100%_2rem] pointer-events-none" />

                {/* Top decorative strip - Washi tape style */}
                <div className="absolute top-0 left-0 w-full h-3 bg-orange-100/50 mix-blend-multiply" />

                <div className="p-4 sm:p-8 relative z-20">
                  {children}
                </div>
             </div>

             {/* Tape decoration */}
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#e67e22]/20 rotate-1 backdrop-blur-[1px] shadow-sm transform skew-x-12 pointer-events-none" />
          </div>

          <div className="mt-12 text-center">
             <Link
              href="/usage"
              className="group inline-flex items-center gap-2 text-stone-500 hover:text-[#e67e22] transition-colors font-hand text-lg"
            >
              <FaMapMarkedAlt className="group-hover:rotate-12 transition-transform" />
              <span className="border-b border-dashed border-stone-400 group-hover:border-[#e67e22] pb-0.5">初めての方はこちら（使い方）</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
