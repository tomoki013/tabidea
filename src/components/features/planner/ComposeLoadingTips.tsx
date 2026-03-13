"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

/** Tip rotation interval (ms) */
const TIP_INTERVAL = 6000;

// ============================================
// Component
// ============================================

interface ComposeLoadingTipsProps {
  className?: string;
  embedded?: boolean;
}

export default function ComposeLoadingTips({
  className = "",
  embedded = false,
}: ComposeLoadingTipsProps) {
  const t = useTranslations("components.features.planner.composeLoadingTips");
  const [tipIndex, setTipIndex] = useState(0);
  const tips = useMemo(() => {
    const rawTips = t.raw("tips");
    return Array.isArray(rawTips)
      ? rawTips.filter((tip): tip is string => typeof tip === "string")
      : [];
  }, [t]);

  useEffect(() => {
    if (tips.length === 0) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, TIP_INTERVAL);
    return () => clearInterval(interval);
  }, [tips.length]);

  if (tips.length === 0) return null;
  const safeTipIndex = tipIndex % tips.length;

  return (
    <div className={`w-full ${embedded ? "" : "max-w-2xl mx-auto mt-4"} ${className}`}>
      <div
        className={`px-6 py-4 rounded-2xl border shadow-sm backdrop-blur ${
          embedded
            ? "bg-amber-50/75 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/45"
            : "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/60 dark:border-amber-800/35"
        }`}
      >
        <p className="text-xs font-mono uppercase tracking-widest text-amber-600/70 dark:text-amber-400/60 mb-1">
          {t("label")}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={safeTipIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed"
          >
            {tips[safeTipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
