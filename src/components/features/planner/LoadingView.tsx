"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

const STAMPS = ["🗺️", "✈️", "🏨", "🎫", "📸", "🌏"];

export default function LoadingView() {
  const t = useTranslations("components.features.planner.loadingView");
  const [step, setStep] = useState(0);
  const loadingMessages = [
    t("messages.guidebook"),
    t("messages.weather"),
    t("messages.hiddenSpots"),
    t("messages.journal"),
    t("messages.story"),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 h-[600px] relative rounded-3xl overflow-hidden shadow-2xl bg-[#fcfbf9] dark:bg-stone-900 border-8 border-white dark:border-stone-800 flex items-center justify-center">
      {/* Paper Overlay Texture */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none dark:opacity-10" />

      {/* Floating travel stamps in background */}
      {STAMPS.map((stamp, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl select-none pointer-events-none"
          style={{
            left: `${12 + (i * 16) % 72}%`,
            top: `${8 + (i * 23) % 72}%`,
          }}
          animate={{
            y: [0, -10, 0],
            rotate: [i % 2 === 0 ? -6 : 6, i % 2 === 0 ? 6 : -6, i % 2 === 0 ? -6 : 6],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        >
          {stamp}
        </motion.div>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-10 p-10 text-center max-w-sm">
        {/* Handwritten message with smooth transition */}
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-hand text-stone-800 dark:text-stone-200 leading-relaxed min-h-20"
          >
            {loadingMessages[step]}
          </motion.p>
        </AnimatePresence>

        {/* Wave-bouncing dots progress indicator */}
        <div className="flex gap-3 items-end h-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-primary"
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <p className="text-sm font-hand text-stone-400 dark:text-stone-500 -rotate-1">
          {t("footer")}
        </p>
      </div>
    </div>
  );
}
