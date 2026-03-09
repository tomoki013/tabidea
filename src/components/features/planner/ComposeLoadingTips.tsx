"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

// ============================================
// Static tips data (no API needed)
// ============================================

const TIPS_JA = [
  "空港到着後、まず両替よりATMが手数料お得なことが多いです",
  "ホテルのフロントに現地おすすめスポットを聞くと穴場が見つかることも",
  "Tabideaの「旅のしおり」機能でプランを共有できます",
  "旅先の天気予報は1週間前からこまめにチェックがおすすめ",
  "スマホの充電器とモバイルバッテリーは旅の必需品です",
  "人気レストランは予約必須！特に週末は早めに押さえましょう",
  "現地SIMやeSIMを事前に用意すると到着後スムーズです",
  "旅行保険はクレジットカード付帯だけでなく別途加入がおすすめ",
  "地元のスーパーやコンビニはお土産の穴場スポットです",
  "朝イチの観光スポットは空いていて写真も撮りやすい！",
];

const TIPS_EN = [
  "ATMs often offer better exchange rates than currency exchange counters",
  "Ask hotel concierges for local recommendations — they know hidden gems",
  "Share your plan with travel companions using Tabidea's Shiori feature",
  "Check weather forecasts starting a week before your trip",
  "A portable charger is essential for keeping your phone alive all day",
  "Popular restaurants fill up fast — book ahead, especially on weekends",
  "Get a local SIM or eSIM before arrival for seamless connectivity",
  "Consider dedicated travel insurance beyond credit card coverage",
  "Local supermarkets and convenience stores are great for unique souvenirs",
  "Visit popular attractions first thing in the morning to avoid crowds",
];

/** Tip rotation interval (ms) */
const TIP_INTERVAL = 6000;

// ============================================
// Component
// ============================================

interface ComposeLoadingTipsProps {
  className?: string;
}

export default function ComposeLoadingTips({
  className = "",
}: ComposeLoadingTipsProps) {
  const t = useTranslations("components.features.planner.composeLoadingTips");
  const [tipIndex, setTipIndex] = useState(0);
  const [tips, setTips] = useState<string[]>([]);

  useEffect(() => {
    // Determine language from translation key
    const label = t("label");
    const isEn = label === "Travel Tip";
    const allTips = isEn ? TIPS_EN : TIPS_JA;

    // Shuffle tips
    const shuffled = [...allTips].sort(() => Math.random() - 0.5);
    setTips(shuffled);
  }, [t]);

  useEffect(() => {
    if (tips.length === 0) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, TIP_INTERVAL);
    return () => clearInterval(interval);
  }, [tips.length]);

  if (tips.length === 0) return null;

  return (
    <div className={`w-full max-w-2xl mx-auto mt-4 ${className}`}>
      <div className="px-6 py-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60 mb-1">
          {t("label")}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed"
          >
            {tips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
