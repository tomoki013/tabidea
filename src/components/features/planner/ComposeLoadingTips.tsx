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
        className={`rounded-[24px] border px-6 py-4 shadow-sm backdrop-blur ${
          embedded
            ? "border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,251,235,0.88),rgba(255,247,237,0.88))] dark:border-amber-800/45 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.22),rgba(69,26,3,0.18))]"
            : "border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,247,237,0.86))] dark:border-amber-800/35 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.2),rgba(69,26,3,0.16))]"
        }`}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-700/80 dark:text-amber-300/70">
          {t("label")}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={safeTipIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm leading-relaxed text-amber-900 dark:text-amber-100"
          >
            {tips[safeTipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
