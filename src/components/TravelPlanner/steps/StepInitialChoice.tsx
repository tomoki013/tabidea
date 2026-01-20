"use client";

import { motion } from "framer-motion";
import PolicyLink from "@/components/ui/PolicyLink";

interface StepInitialChoiceProps {
  onDecide: (decided: boolean) => void;
}

export default function StepInitialChoice({ onDecide }: StepInitialChoiceProps) {
  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 py-4">
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-[#fcfbf9] border-8 border-white">
        {/* Background Texture */}
        <div
          className="absolute inset-0 z-0 opacity-50 pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: `url('/images/cream-paper.png')`,
            backgroundSize: 'cover'
          }}
        />

        <div className="relative z-10 flex flex-col justify-center space-y-6 p-6 sm:p-10">
          <div className="space-y-3 text-center">
            <div className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold tracking-widest uppercase shadow-sm">
              Start Your Journey
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
              行き先は
              <br className="sm:hidden"/>
              決まっていますか？
            </h2>
            <p className="text-stone-600 text-base font-hand">
              旅の計画をはじめましょう
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {/* Yes: Decided */}
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDecide(true)}
              className="group relative flex flex-col items-center justify-center p-6 h-52 rounded-2xl border-4 border-stone-100 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
               {/* Texture Overlay - keep for consistency but on white it might look darker? */}
               <div
                className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-multiply"
                style={{
                  backgroundImage: `url('/images/cream-paper.png')`,
                  backgroundSize: 'cover'
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-3 p-3 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors duration-300">
                    <span className="text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 block">
                        ✈️
                    </span>
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-1 font-serif group-hover:text-primary transition-colors">
                    決まっている
                </h3>
                <p className="text-stone-500 text-sm font-hand">
                    すでに行きたい場所がある
                </p>
              </div>

              {/* Border Highlight on Hover */}
              <div className="absolute inset-0 border-4 border-primary/0 group-hover:border-primary/20 rounded-2xl transition-all duration-300" />
            </motion.button>

            {/* No: Not Decided */}
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDecide(false)}
              className="group relative flex flex-col items-center justify-center p-6 h-52 rounded-2xl border-4 border-stone-100 bg-white shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
               {/* Texture Overlay */}
               <div
                className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-multiply"
                style={{
                  backgroundImage: `url('/images/cream-paper.png')`,
                  backgroundSize: 'cover'
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                 <div className="mb-3 p-3 bg-teal-100 rounded-full group-hover:bg-teal-200 transition-colors duration-300">
                    <span className="text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 block">
                        🌏
                    </span>
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-1 font-serif group-hover:text-teal-600 transition-colors">
                    決まっていない
                </h3>
                <p className="text-stone-500 text-sm font-hand">
                    おすすめを提案してほしい
                </p>
              </div>

              {/* Border Highlight on Hover */}
              <div className="absolute inset-0 border-4 border-teal-400/0 group-hover:border-teal-400/20 rounded-2xl transition-all duration-300" />
            </motion.button>
          </div>

          <div className="text-center space-y-1 mt-2">
            <p className="text-stone-500 text-xs font-hand">
              入力内容はAIの学習には使われませんので、安心してご記入ください。
            </p>
            <p className="text-stone-500 text-xs font-hand">
              詳細は
              <PolicyLink href="/ai-policy" className="mx-1">
                AIポリシー
              </PolicyLink>
              にてご案内しています。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
