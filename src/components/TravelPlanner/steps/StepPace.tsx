"use client";

import { motion } from "framer-motion";

interface StepPaceProps {
  value?: string;
  onChange: (val: string) => void;
}

export default function StepPace({ value, onChange }: StepPaceProps) {
  const options = [
    {
      id: "relaxed",
      label: "ゆったり",
      icon: "☕",
      desc: "1日1-2箇所、のんびりと",
    },
    {
      id: "balanced",
      label: "バランスよく",
      icon: "⚖️",
      desc: "観光と休息を程よく",
    },
    {
      id: "active",
      label: "アクティブ",
      icon: "👟",
      desc: "主要スポットを網羅",
    },
    { id: "packed", label: "詰め込み", icon: "🔥", desc: "朝から晩まで全力で" },
  ];

  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          旅のペースは？
        </h2>
        <p className="text-stone-600 font-hand">
          あなたのスタイルに合わせて
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto w-full px-4">
        {options.map((opt, i) => {
          const isSelected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onChange(opt.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all duration-300 text-left relative overflow-hidden group
                ${
                  isSelected
                    ? "bg-teal-50 border-teal-500 shadow-md"
                    : "bg-white border-stone-200 hover:bg-stone-50 hover:border-teal-300"
                }
              `}
            >
              <div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-xs shrink-0 z-10 transition-colors
                  ${
                    isSelected
                      ? "bg-teal-500 text-white"
                      : "bg-stone-100 text-stone-600 group-hover:bg-white group-hover:text-teal-500"
                  }
                `}
              >
                {opt.icon}
              </div>
              <div className="flex-1 z-10">
                <h3
                  className={`text-lg font-bold font-serif mb-1 ${
                    isSelected ? "text-teal-700" : "text-stone-800"
                  }`}
                >
                  {opt.label}
                </h3>
                <p className="text-xs text-stone-500 font-medium">{opt.desc}</p>
              </div>

               {isSelected && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
