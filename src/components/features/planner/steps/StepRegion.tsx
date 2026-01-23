"use client";

import { motion } from "framer-motion";

interface StepRegionProps {
  value?: string;
  vibe?: string;
  onChange: (value: string) => void;
  onVibeChange: (value: string) => void;
  onNext: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

export default function StepRegion({
  value,
  vibe,
  onChange,
  onVibeChange,
  onNext,
  canComplete,
  onComplete,
}: StepRegionProps) {
  const regions = [
    { id: "domestic", label: "国内", sub: "Domestic", icon: "🗾" },
    { id: "overseas", label: "海外", sub: "Overseas", icon: "🗽" },
    { id: "anywhere", label: "指定なし", sub: "Anywhere", icon: "🎲" },
  ];

  const handleSelect = (id: string) => {
    onChange(id);
  };

  return (
    // Changed: Removed h-full and justify-center to prevent clipping when content is taller than container.
    // Added min-h-full to ensure it takes up space if short, but expands if tall.
    // Added py-8 for vertical spacing.
    <div className="flex flex-col min-h-full justify-start space-y-12 animate-in fade-in slide-in-from-right-8 duration-500 py-4">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          どんな旅行に行きたいですか？
        </h2>
        <p className="text-stone-600 font-hand">
          ざっくりとしたイメージや、やりたいことを教えてください
        </p>
      </div>

      <div className="w-full max-w-lg mx-auto px-4">
        <div className="relative">
          <textarea
            value={vibe || ""}
            onChange={(e) => onVibeChange(e.target.value)}
            placeholder="例：南の島、リゾートでゆっくり、温泉があるところ..."
            className="w-full h-32 bg-white border border-stone-300 rounded-lg p-4 text-foreground placeholder:text-stone-300 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none text-base leading-relaxed font-hand shadow-sm"
            style={{
              backgroundImage:
                "linear-gradient(transparent, transparent 29px, #e5e7eb 30px)",
              backgroundSize: "100% 30px",
              lineHeight: "30px",
            }}
          />
          <div className="absolute top-2 right-2 p-1 pointer-events-none">
            <span className="text-2xl opacity-20 block">🏝️</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-stone-500 font-bold text-center text-sm uppercase tracking-widest">
          エリアで絞り込む（任意）
        </label>
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
                  flex-1 flex flex-col items-center justify-center p-4 h-32 sm:h-40 rounded-xl border-2 transition-all duration-300
                  ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-lg"
                      : "bg-white border-stone-200 hover:border-primary/50 hover:bg-orange-50/50"
                  }
                `}
              >
                <span className="text-3xl mb-2 filter drop-shadow-sm">
                  {region.icon}
                </span>
                <span
                  className={`text-lg font-bold font-serif ${
                    isSelected ? "text-white" : "text-stone-800"
                  }`}
                >
                  {region.label}
                </span>
                <span
                  className={`text-xs uppercase tracking-wider ${
                    isSelected ? "text-white/80" : "text-stone-400"
                  }`}
                >
                  {region.sub}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Proceed hint when region is selected or vibe is entered */}
      {(value || vibe?.trim()) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-4 space-y-4"
        >
          <button
            onClick={onNext}
            className="text-primary font-medium hover:underline font-hand text-lg"
          >
            次へ進む →
          </button>

          {/* Skip & Create Plan Button */}
          {canComplete && onComplete && (
              <div className="pt-2">
                <button
                  onClick={onComplete}
                  className="text-stone-400 hover:text-stone-600 text-xs sm:text-sm font-medium hover:underline transition-colors"
                >
                  任意項目をスキップしてプランを作成
                </button>
              </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
