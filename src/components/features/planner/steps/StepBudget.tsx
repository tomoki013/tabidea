"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";

interface StepBudgetProps {
  value?: string;
  region?: string;
  onChange: (val: string) => void;
  onNext?: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

// Budget range configuration per region
const BUDGET_CONFIG = {
  domestic: { min: 10000, max: 500000, step: 10000, defaultMin: 30000, defaultMax: 100000, unit: "円" },
  overseas: { min: 50000, max: 2000000, step: 10000, defaultMin: 100000, defaultMax: 500000, unit: "円" },
} as const;

function formatBudget(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

function parseBudgetRange(value: string): { min: number; max: number } | null {
  if (!value.startsWith("range:")) return null;
  const parts = value.split(":");
  if (parts.length >= 3) {
    return { min: parseInt(parts[1], 10), max: parseInt(parts[2], 10) };
  }
  return null;
}

function encodeBudgetRange(min: number, max: number): string {
  return `range:${min}:${max}`;
}

export default function StepBudget({ value, region, onChange, onNext, canComplete, onComplete }: StepBudgetProps) {
  const presetOptions = [
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

  const isOverseas = region === "overseas";
  const config = isOverseas ? BUDGET_CONFIG.overseas : BUDGET_CONFIG.domestic;

  // Determine if we're in slider mode
  const existingRange = value ? parseBudgetRange(value) : null;
  const [useSlider, setUseSlider] = useState(!!existingRange);
  const [rangeMin, setRangeMin] = useState(existingRange?.min ?? config.defaultMin);
  const [rangeMax, setRangeMax] = useState(existingRange?.max ?? config.defaultMax);

  const isPresetSelected = value && !value.startsWith("range:") && presetOptions.some(o => o.id === value);

  const handlePresetSelect = useCallback((id: string) => {
    setUseSlider(false);
    onChange(id);
  }, [onChange]);

  const handleSliderToggle = useCallback(() => {
    setUseSlider(true);
    onChange(encodeBudgetRange(rangeMin, rangeMax));
  }, [onChange, rangeMin, rangeMax]);

  const handleMinChange = useCallback((newMin: number) => {
    const clampedMin = Math.min(newMin, rangeMax - config.step);
    setRangeMin(clampedMin);
    onChange(encodeBudgetRange(clampedMin, rangeMax));
  }, [rangeMax, config.step, onChange]);

  const handleMaxChange = useCallback((newMax: number) => {
    const clampedMax = Math.max(newMax, rangeMin + config.step);
    setRangeMax(clampedMax);
    onChange(encodeBudgetRange(rangeMin, clampedMax));
  }, [rangeMin, config.step, onChange]);

  const hasValue = !!value;

  // Progress percentage for the slider track visualization
  const minPercent = ((rangeMin - config.min) / (config.max - config.min)) * 100;
  const maxPercent = ((rangeMax - config.min) / (config.max - config.min)) * 100;

  return (
    <div className="flex flex-col h-full justify-center space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          予算はどれくらい？
        </h2>
        <p className="text-stone-600 font-hand">
          無理のない範囲で、最高のプランを
        </p>
      </div>

      {/* Preset Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto w-full px-4">
        {presetOptions.map((opt, i) => {
          const isSelected = !useSlider && value === opt.id;
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handlePresetSelect(opt.id)}
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

      {/* Divider with "or" */}
      <div className="flex items-center gap-4 max-w-3xl mx-auto w-full px-4">
        <div className="flex-1 border-t border-dashed border-stone-200" />
        <span className="text-sm text-stone-400 font-medium">または</span>
        <div className="flex-1 border-t border-dashed border-stone-200" />
      </div>

      {/* Budget Range Slider */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-3xl mx-auto w-full px-4"
      >
        <button
          onClick={handleSliderToggle}
          className={`w-full p-6 rounded-xl border-2 transition-all duration-300 ${
            useSlider
              ? "bg-primary/5 border-primary shadow-lg"
              : "bg-white border-stone-200 hover:bg-orange-50/50 hover:border-primary/30"
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-xs shrink-0 ${
              useSlider ? "bg-primary text-white" : "bg-stone-100 text-stone-600"
            }`}>
              🎚️
            </div>
            <div className="text-left flex-1">
              <h3 className={`text-lg font-bold font-serif mb-1 ${useSlider ? "text-primary" : "text-stone-800"}`}>
                金額で指定する
              </h3>
              <p className="text-xs text-stone-500 font-medium">スライダーで予算範囲を設定</p>
            </div>
          </div>

          {useSlider && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-6 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Budget display */}
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">
                  {formatBudget(rangeMin)} 〜 {formatBudget(rangeMax)}
                </span>
              </div>

              {/* Dual range slider */}
              <div className="relative pt-2 pb-4 px-2">
                {/* Track background */}
                <div className="relative h-2 bg-stone-200 rounded-full">
                  {/* Active range highlight */}
                  <div
                    className="absolute h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
                    style={{
                      left: `${minPercent}%`,
                      width: `${maxPercent - minPercent}%`,
                    }}
                  />
                </div>

                {/* Min slider */}
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={rangeMin}
                  onChange={(e) => handleMinChange(Number(e.target.value))}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-20 pointer-events-auto"
                  style={{ top: "8px" }}
                />

                {/* Max slider */}
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  value={rangeMax}
                  onChange={(e) => handleMaxChange(Number(e.target.value))}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-20 pointer-events-auto"
                  style={{ top: "8px" }}
                />

                {/* Min thumb indicator */}
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10"
                  style={{ left: `${minPercent}%`, top: "2px" }}
                />
                {/* Max thumb indicator */}
                <div
                  className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10"
                  style={{ left: `${maxPercent}%`, top: "2px" }}
                />

                {/* Min/Max labels */}
                <div className="flex justify-between mt-4 text-xs text-stone-400">
                  <span>{formatBudget(config.min)}</span>
                  <span>{formatBudget(config.max)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </button>
      </motion.div>

      {/* Proceed hint when budget is selected */}
      {hasValue && onNext && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
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
