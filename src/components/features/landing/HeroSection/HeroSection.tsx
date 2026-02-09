"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaBookOpen, FaMapMarkedAlt } from "react-icons/fa";
import { JournalSheet, Tape, HandwrittenText, Stamp } from "@/components/ui/journal";

interface HeroSectionProps {
  children: ReactNode;
}

export default function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative w-full flex flex-col items-center pt-28 sm:pt-36 pb-20 overflow-hidden bg-[#fcfbf9]">
      {/* Background Elements - Paper Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-60 mix-blend-multiply pointer-events-none -z-10" />

      {/* Dotted Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px] opacity-50 -z-20" />

      <div className="max-w-5xl mx-auto px-4 w-full flex flex-col gap-8 items-center text-center relative z-10">
        <div className="space-y-6 max-w-3xl flex flex-col items-center">
          {/* Badge - Paper scrap style */}
          <motion.div
             initial={{ opacity: 0, y: -10, rotate: -2 }}
             animate={{ opacity: 1, y: 0, rotate: -2 }}
             transition={{ duration: 0.8 }}
             className="relative"
          >
             <Tape color="yellow" position="top-center" className="w-32 -top-3 opacity-90" />
             <div className="inline-flex items-center gap-2 text-stone-600 font-hand font-bold tracking-wider text-sm sm:text-base bg-white px-6 py-2 shadow-sm border border-stone-200 border-dashed transform -rotate-1">
               <FaBookOpen className="text-primary text-sm" />
               <span>Story of your journey starts here</span>
             </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-stone-800 leading-tight tracking-tight relative"
          >
            心の奥にある
            <span className="relative inline-block mx-2">
              <span className="relative z-10">『行きたい』</span>
              <span className="absolute bottom-2 left-0 w-full h-4 bg-primary/20 -z-0 -rotate-1 rounded-sm mix-blend-multiply"></span>
            </span>
            を、
            <br className="sm:hidden" />
            かたちに。

            {/* Decorative Stamp */}
            <div className="absolute -right-8 -top-8 hidden md:block opacity-80 transform rotate-12">
               <Stamp color="red" size="md">
                  TABI<br/>DEA
               </Stamp>
            </div>
          </motion.h1>

          {/* Subtext */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative inline-block mt-2"
          >
             <HandwrittenText className="text-lg sm:text-2xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
              まだ言葉にならない旅の種を、
              <br className="sm:hidden" />
              AIと一緒に育ててみませんか？
            </HandwrittenText>

            {/* Hand-drawn arrow decoration */}
            <svg className="absolute -right-8 -bottom-8 w-16 h-16 text-stone-400 hidden sm:block rotate-12 opacity-60" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
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
          {/* Notebook Binding Effect */}
          <div className="absolute -left-3 top-4 bottom-4 w-6 flex flex-col justify-between z-20 pointer-events-none hidden md:flex">
             {[...Array(6)].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-stone-200 border border-stone-300 shadow-inner mb-8 relative">
                   <div className="absolute left-full top-1/2 -translate-y-1/2 w-4 h-2 bg-stone-300 transform -rotate-12 origin-left" />
                </div>
             ))}
          </div>

          <JournalSheet variant="notebook" className="relative transform rotate-1 min-h-[450px] shadow-2xl border-l-8 border-l-stone-300/50">
             {/* Decorative Tape */}
             <Tape color="green" position="top-right" rotation="right" className="opacity-80" />
             <Tape color="blue" position="bottom-left" rotation="left" className="opacity-80" />

             {/* Content */}
             <div className="relative z-10 pl-2 md:pl-8">
                {children}
             </div>
          </JournalSheet>

          <div className="mt-12 text-center">
             <Link
              href="/usage"
              className="group inline-flex items-center gap-2 text-stone-500 hover:text-primary transition-colors font-hand text-lg relative"
            >
              <FaMapMarkedAlt className="group-hover:rotate-12 transition-transform" />
              <span className="border-b-2 border-dashed border-stone-300 group-hover:border-primary pb-0.5 transition-colors">初めての方はこちら（使い方）</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
