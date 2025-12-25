"use client";

import { motion } from "framer-motion";

interface StepPaceProps {
  value: string;
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
    <div className="space-y-4">
      {options.map((opt, i) => {
        const isSelected = value === opt.id;
        return (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onChange(opt.id)}
            className={`
              w-full p-4 rounded-xl border flex items-center gap-4 transition-all duration-300 relative overflow-hidden
              ${
                isSelected
                  ? "bg-white/10 border-white/40 shadow-lg"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }
            `}
          >
            {/* Background Pace Indicator Animation */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}

            <div className="text-3xl filter drop-shadow-md z-10">
              {opt.icon}
            </div>
            <div className="text-left flex-1 z-10">
              <h3 className="font-bold text-white">{opt.label}</h3>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>

            <div className="z-10 w-6 h-6 rounded-full border border-white/30 flex items-center justify-center">
              {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
