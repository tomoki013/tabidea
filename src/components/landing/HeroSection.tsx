"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  children: ReactNode;
}

export default function HeroSection({ children }: HeroSectionProps) {
  return (
    <section className="relative w-full max-w-5xl mx-auto flex flex-col gap-12 items-center text-center py-16 sm:py-24 px-4">
      <div className="space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl sm:text-7xl font-serif font-bold text-foreground leading-tight drop-shadow-sm"
        >
          心が、どこへ
          <br className="sm:hidden" />
          行きたがっている？
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-xl sm:text-2xl text-muted-foreground font-hand -rotate-2"
        >
          AIと一緒に、次の冒険の物語を書き始めよう。
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </section>
  );
}
