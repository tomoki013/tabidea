"use client";

import { motion } from "framer-motion";

interface StepInitialChoiceProps {
  onDecide: (decided: boolean) => void;
}

export default function StepInitialChoice({ onDecide }: StepInitialChoiceProps) {
  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="space-y-6 text-center">
        <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-bold tracking-widest uppercase mb-4 shadow-sm">
          Start Your Journey
        </div>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-foreground leading-tight">
          行き先は
          <br />
          決まっていますか？
        </h2>
        <p className="text-stone-600 text-lg font-hand">
          旅の計画をはじめましょう
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto w-full px-4">
        {/* Yes: Decided */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDecide(true)}
          className="group relative flex flex-col items-center justify-center p-8 h-64 rounded-xl border-2 border-stone-200 bg-white hover:border-primary/50 hover:bg-orange-50/30 transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <span className="text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
            ✈️
          </span>
          <h3 className="text-2xl font-bold text-stone-800 mb-2 font-serif group-hover:text-primary transition-colors">
            決まっている
          </h3>
          <p className="text-sm text-stone-500 font-hand">
            すでに行きたい場所がある
          </p>
        </motion.button>

        {/* No: Not Decided */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDecide(false)}
          className="group relative flex flex-col items-center justify-center p-8 h-64 rounded-xl border-2 border-stone-200 bg-white hover:border-teal-400/50 hover:bg-teal-50/30 transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400/0 via-teal-400/50 to-teal-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <span className="text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            🌏
          </span>
          <h3 className="text-2xl font-bold text-stone-800 mb-2 font-serif group-hover:text-teal-600 transition-colors">
            決まっていない
          </h3>
          <p className="text-sm text-stone-500 font-hand">
            おすすめを提案してほしい
          </p>
        </motion.button>
      </div>
    </div>
  );
}
