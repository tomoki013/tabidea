"use client";

import { motion } from "framer-motion";

interface StepInitialChoiceProps {
  onDecide: (decided: boolean) => void;
}

export default function StepInitialChoice({ onDecide }: StepInitialChoiceProps) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-[500px] py-12">
      <div className="space-y-6 text-center">
        <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-bold tracking-widest uppercase mb-4 shadow-sm">
          Start Your Journey
        </div>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-foreground leading-tight">
          行き先は
          <br className="sm:hidden"/>
          決まっていますか？
        </h2>
        <p className="text-stone-600 text-lg font-hand">
          旅の計画をはじめましょう
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-4">
        {/* Yes: Decided */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDecide(true)}
          className="group relative flex flex-col items-center justify-center p-10 h-72 rounded-3xl border-4 border-white bg-[#fcfbf9] shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
        >
           {/* Texture Overlay */}
           <div
            className="absolute inset-0 z-0 opacity-50 pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: `url('/images/cream-paper.png')`,
              backgroundSize: 'cover'
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6 p-4 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors duration-300">
                <span className="text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 block">
                    ✈️
                </span>
            </div>
            <h3 className="text-2xl font-bold text-stone-800 mb-2 font-serif group-hover:text-primary transition-colors">
                決まっている
            </h3>
            <p className="text-stone-500 font-hand">
                すでに行きたい場所がある
            </p>
          </div>

          {/* Border Highlight on Hover */}
          <div className="absolute inset-0 border-4 border-primary/0 group-hover:border-primary/20 rounded-3xl transition-all duration-300" />
        </motion.button>

        {/* No: Not Decided */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onDecide(false)}
          className="group relative flex flex-col items-center justify-center p-10 h-72 rounded-3xl border-4 border-white bg-[#fcfbf9] shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
        >
           {/* Texture Overlay */}
           <div
            className="absolute inset-0 z-0 opacity-50 pointer-events-none mix-blend-multiply"
            style={{
              backgroundImage: `url('/images/cream-paper.png')`,
              backgroundSize: 'cover'
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
             <div className="mb-6 p-4 bg-teal-100 rounded-full group-hover:bg-teal-200 transition-colors duration-300">
                <span className="text-6xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 block">
                    🌏
                </span>
            </div>
            <h3 className="text-2xl font-bold text-stone-800 mb-2 font-serif group-hover:text-teal-600 transition-colors">
                決まっていない
            </h3>
            <p className="text-stone-500 font-hand">
                おすすめを提案してほしい
            </p>
          </div>

          {/* Border Highlight on Hover */}
          <div className="absolute inset-0 border-4 border-teal-400/0 group-hover:border-teal-400/20 rounded-3xl transition-all duration-300" />
        </motion.button>
      </div>
    </div>
  );
}
