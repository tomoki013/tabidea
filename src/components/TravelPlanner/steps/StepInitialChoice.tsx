"use client";

import { motion } from "framer-motion";
import PolicyLink from "@/components/ui/PolicyLink";
import { FaPaperPlane } from "react-icons/fa6";

interface StepInitialChoiceProps {
  onDecide: (decided: boolean) => void;
}

export default function StepInitialChoice({ onDecide }: StepInitialChoiceProps) {
  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 py-4 relative">
      {/* Decorative Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-[#2c2c2c] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 tracking-widest uppercase border-2 border-white">
          <FaPaperPlane className="text-primary" />
          <span>Free Travel Planner</span>
        </div>
      </div>

      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white border-4 border-white ring-1 ring-stone-200/50">
        {/* Background Texture - lighter opacity on white */}
        <div
          className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: `url('/images/cream-paper.png')`,
            backgroundSize: 'cover'
          }}
        />

        <div className="relative z-10 flex flex-col justify-center space-y-8 p-8 sm:p-12">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 leading-tight">
              行き先は
              <br className="sm:hidden"/>
              決まっていますか？
            </h2>
            <p className="text-stone-500 text-base font-hand">
              AIがあなたにぴったりの旅をご提案します
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-2">
            {/* Yes: Decided */}
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDecide(true)}
              className="group relative flex flex-col items-center justify-center p-6 h-56 rounded-2xl border-2 border-stone-100 bg-white shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 p-4 bg-orange-50 rounded-full group-hover:bg-orange-100 transition-colors duration-300 ring-1 ring-orange-100">
                    <span className="text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 block">
                        ✈️
                    </span>
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-1 font-serif group-hover:text-primary transition-colors">
                    決まっている
                </h3>
                <p className="text-stone-400 text-xs font-bold tracking-wide mt-1">
                    I HAVE A PLAN
                </p>
              </div>
            </motion.button>

            {/* No: Not Decided */}
            <motion.button
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDecide(false)}
              className="group relative flex flex-col items-center justify-center p-6 h-56 rounded-2xl border-2 border-stone-100 bg-white shadow-lg hover:shadow-xl hover:border-teal-400/30 transition-all duration-300 overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                 <div className="mb-4 p-4 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors duration-300 ring-1 ring-teal-100">
                    <span className="text-5xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 block">
                        🌏
                    </span>
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-1 font-serif group-hover:text-teal-600 transition-colors">
                    決まっていない
                </h3>
                <p className="text-stone-400 text-xs font-bold tracking-wide mt-1">
                    INSPIRE ME
                </p>
              </div>
            </motion.button>
          </div>

          <div className="text-center space-y-1 mt-4 pt-4 border-t border-dashed border-stone-200">
            <p className="text-stone-400 text-[10px] font-sans">
              入力内容はAIの学習には使用されません
            </p>
            <p className="text-stone-400 text-[10px] font-sans">
              詳細は
              <PolicyLink href="/ai-policy" className="mx-1 font-bold hover:text-primary">
                AIポリシー
              </PolicyLink>
              をご確認ください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
