"use client";

import { motion } from "framer-motion";

interface StepBudgetProps {
  value?: string;
  onChange: (val: string) => void;
}

export default function StepBudget({ value, onChange }: StepBudgetProps) {
  const options = [
    {
      id: "saving",
      label: "なるべく安く",
      icon: "💸",
      desc: "お財布に優しく、賢く旅する",
    },
    { id: "standard", label: "普通", icon: "💰", desc: "一般的な予算で楽しむ" },
    {
      id: "high",
      label: "少し贅沢に",
      icon: "✨",
      desc: "良いホテルや食事をプラス",
    },
    {
      id: "luxury",
      label: "リッチに",
      icon: "💎",
      desc: "最高級の体験を味わう",
    },
  ];

  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          予算はどれくらい？
        </h2>
        <p className="text-stone-600 font-hand">
          無理のない範囲で、最高のプランを
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto w-full px-4">
        {options.map((opt, i) => {
          const isSelected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onChange(opt.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full p-6 rounded-xl border-2 flex items-center gap-4 transition-all duration-300 text-left relative overflow-hidden
                ${
                  isSelected
                    ? "bg-primary/5 border-primary shadow-lg"
                    : "bg-white border-stone-200 hover:bg-orange-50/50 hover:border-primary/30"
                }
              `}
            >
               {isSelected && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full -mr-8 -mt-8 z-0"></div>
              )}

              <div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-xs shrink-0 z-10
                  ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-stone-100 text-stone-600"
                  }
                `}
              >
                {opt.icon}
              </div>
              <div className="flex-1 z-10">
                <h3
                  className={`text-lg font-bold font-serif mb-1 ${
                    isSelected ? "text-primary" : "text-stone-800"
                  }`}
                >
                  {opt.label}
                </h3>
                <p className="text-xs text-stone-500 font-medium">{opt.desc}</p>
              </div>

              {isSelected && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
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
