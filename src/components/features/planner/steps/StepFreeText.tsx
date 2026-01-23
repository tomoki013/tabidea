"use client";

import { motion } from "framer-motion";

interface StepFreeTextProps {
  value: string | undefined;
  onChange: (value: string) => void;
  onComplete?: () => void;
}

export default function StepFreeText({ value, onChange, onComplete }: StepFreeTextProps) {
  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 pt-2 md:pt-4">
      <div className="space-y-2 md:space-y-4 text-center">
        <h2 className="text-xl md:text-3xl font-serif font-bold text-foreground leading-snug">
          最後に、
          <br />
          特別なご要望は？
        </h2>
        <p className="text-stone-500 font-hand text-xs md:text-sm leading-relaxed">
          「美術館巡りをしたい」「静かなカフェに行きたい」など、
          <br />
          自由に入力してください。(任意)
        </p>
      </div>

      <div className="relative flex-1 min-h-[200px] md:min-h-[300px]">
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例: 古着屋巡りがしたい、夜景が綺麗なレストランに行きたい..."
          className="w-full h-full min-h-[200px] md:min-h-[300px] bg-white border border-stone-300 rounded-sm p-4 md:p-6 text-foreground placeholder:text-stone-300 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none text-base md:text-lg leading-relaxed font-hand shadow-sm"
        />
        <div className="absolute top-0 right-0 p-2 pointer-events-none">
           <span className="text-2xl md:text-4xl opacity-10 rotate-12 block">✏️</span>
        </div>
        <div className="text-right mt-1 md:mt-2 text-stone-400 text-xs md:text-sm font-mono">
            {(value || "").length}文字
        </div>
      </div>

      {/* Proceed hint for last step - optional so always visible */}
      {onComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <button
            onClick={onComplete}
            className="text-primary font-medium hover:underline font-hand text-lg"
          >
            プランを作成する →
          </button>
        </motion.div>
      )}
    </div>
  );
}
