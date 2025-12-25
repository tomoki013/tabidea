"use client";

import { motion } from "framer-motion";

interface StepBudgetProps {
  value: string;
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
    <div className="space-y-4">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <motion.button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            whileHover={{ scale: 1.01, x: 5 }}
            whileTap={{ scale: 0.99 }}
            className={`
                            w-full p-4 rounded-xl border flex items-center gap-4 transition-all duration-300 group
                            ${
                              isSelected
                                ? "bg-white/10 border-primary/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                            }
                        `}
          >
            <div
              className={`
                            w-12 h-12 rounded-full flex items-center justify-center text-2xl
                            transition-colors duration-300
                            ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-white/10 text-white/60"
                            }
                        `}
            >
              {opt.icon}
            </div>
            <div className="text-left flex-1">
              <h3
                className={`font-bold transition-colors ${
                  isSelected ? "text-white" : "text-white/80"
                }`}
              >
                {opt.label}
              </h3>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            {isSelected && (
              <motion.div
                layoutId="check"
                className="w-5 h-5 rounded-full bg-primary flex items-center justify-center ml-2"
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
