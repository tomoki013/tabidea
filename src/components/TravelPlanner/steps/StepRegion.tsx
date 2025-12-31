"use client";

import { motion } from "framer-motion";

interface StepRegionProps {
  value?: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export default function StepRegion({ value, onChange, onNext }: StepRegionProps) {
  const regions = [
    { id: "domestic", label: "国内", sub: "Domestic", icon: "🗾" },
    { id: "overseas", label: "海外", sub: "Overseas", icon: "🗽" },
    { id: "anywhere", label: "指定なし", sub: "Anywhere", icon: "🎲" },
  ];

  const handleSelect = (id: string) => {
    onChange(id);
    // Removed auto-advance to prevent state race condition and keep consistency
  };

  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          どのエリアをご希望ですか？
        </h2>
        <p className="text-stone-600 font-hand">
          ざっくりとしたイメージで構いません
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-4xl mx-auto w-full px-4">
        {regions.map((region, i) => {
          const isSelected = value === region.id;
          return (
            <motion.button
              key={region.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleSelect(region.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex-1 flex flex-col items-center justify-center p-6 h-48 sm:h-64 rounded-xl border-2 transition-all duration-300
                ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-lg"
                    : "bg-white border-stone-200 hover:border-primary/50 hover:bg-orange-50/50"
                }
              `}
            >
              <span className="text-5xl mb-4 filter drop-shadow-sm">{region.icon}</span>
              <span className={`text-xl font-bold font-serif ${isSelected ? "text-white" : "text-stone-800"}`}>
                {region.label}
              </span>
              <span className={`text-xs uppercase tracking-wider mt-1 ${isSelected ? "text-white/80" : "text-stone-400"}`}>
                {region.sub}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
