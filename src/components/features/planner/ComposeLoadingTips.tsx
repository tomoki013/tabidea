"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

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
    const rawTips = t.raw("tips");
    const allTips = Array.isArray(rawTips)
      ? rawTips.filter((tip): tip is string => typeof tip === "string")
      : [];
    const shuffled = [...allTips].sort(() => Math.random() - 0.5);
    setTipIndex(0);
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
