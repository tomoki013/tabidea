"use client";

import { useEffect, useState, useReducer } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Types
// ============================================================================

export type GenerationPhase = "outline" | "details" | "complete";

export interface GeneratingAnimationProps {
  /** Current generation phase */
  phase?: GenerationPhase;
  /** Destination name (if known) */
  destination?: string;
  /** Total days (if known) */
  totalDays?: number;
  /** Current day being generated (for details phase) */
  currentDay?: number;
  /** Use reduced motion */
  reducedMotion?: boolean;
}

// ============================================================================
// Messages Configuration
// ============================================================================

const OUTLINE_MESSAGES = [
  { icon: "🗺️", text: "目的地を分析中...", subtext: "最適なルートを探索しています" },
  { icon: "📝", text: "旅のコンセプトを考え中...", subtext: "あなたのリクエストを理解しています" },
  { icon: "🎯", text: "ベストなルートを探索中...", subtext: "効率的な旅程を設計しています" },
  { icon: "📍", text: "おすすめスポットを選定中...", subtext: "隠れた名所も含めて探しています" },
  { icon: "✨", text: "もうすぐ完成！", subtext: "最終調整をしています" },
];

const DETAILS_MESSAGES = [
  { icon: "🏛️", text: "観光スポットの詳細を追加中...", subtext: "営業時間や見どころを調査中" },
  { icon: "🍽️", text: "グルメ情報を収集中...", subtext: "地元の人気店を探しています" },
  { icon: "🚃", text: "アクセス情報を確認中...", subtext: "最適な移動ルートを計算中" },
  { icon: "⏰", text: "タイムスケジュールを調整中...", subtext: "無理のないペースで設計中" },
];

// ============================================================================
// Pin Animation Component
// ============================================================================

function PinAnimation({ reducedMotion = false }: { reducedMotion?: boolean }) {
  if (reducedMotion) {
    return (
      <div className="w-16 h-16 flex items-center justify-center">
        <span className="text-4xl">📍</span>
      </div>
    );
  }

  return (
    <div className="relative w-32 h-32">
      {/* Background circle */}
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-dashed border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner circle with pulse */}
      <motion.div
        className="absolute inset-4 rounded-full bg-primary/5"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating pins */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ originX: 0.5, originY: 0.5 }}
          animate={{
            x: [0, Math.cos((angle * Math.PI) / 180) * 40],
            y: [0, Math.sin((angle * Math.PI) / 180) * 40],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        >
          <span className="text-lg opacity-60">📍</span>
        </motion.div>
      ))}

      {/* Center pin */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-5xl drop-shadow-lg">📍</span>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Suitcase Animation Component
// ============================================================================

function SuitcaseAnimation({ reducedMotion = false }: { reducedMotion?: boolean }) {
  if (reducedMotion) {
    return (
      <div className="w-16 h-16 flex items-center justify-center">
        <span className="text-4xl">🧳</span>
      </div>
    );
  }

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Suitcase */}
      <motion.div
        className="text-5xl"
        animate={{
          rotate: [-5, 5, -5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🧳
      </motion.div>

      {/* Items floating into suitcase */}
      {["👕", "📷", "🗺️", "☂️", "🎫"].map((item, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          animate={{
            x: [80, 0],
            y: [-20 + i * 10, 0],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeInOut",
          }}
        >
          {item}
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function GeneratingAnimation({
  phase = "outline",
  destination,
  totalDays,
  currentDay,
  reducedMotion = false,
}: GeneratingAnimationProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Get messages based on phase
  const messages = phase === "outline" ? OUTLINE_MESSAGES : DETAILS_MESSAGES;

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const currentMessage = messages[messageIndex];

  // Build progress info
  const getProgressText = () => {
    if (phase === "outline") {
      return destination
        ? `${destination}への旅程を作成中...`
        : "あなただけの旅程を作成中...";
    }
    if (currentDay && totalDays) {
      return `Day ${currentDay}/${totalDays} の詳細を生成中`;
    }
    return "詳細プランを生成中...";
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 min-h-[500px] relative rounded-3xl overflow-hidden shadow-2xl bg-[#fcfbf9] border-8 border-white flex items-center justify-center">
      {/* Paper Overlay Texture */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-8 text-center max-w-md">
        {/* Animation */}
        {phase === "outline" ? (
          <PinAnimation reducedMotion={reducedMotion} />
        ) : (
          <SuitcaseAnimation reducedMotion={reducedMotion} />
        )}

        {/* Phase Label */}
        <div className="flex items-center gap-2">
          <span
            className={`
              px-3 py-1 rounded-full text-sm font-bold
              ${phase === "outline" ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"}
            `}
          >
            {phase === "outline" ? "Step 1: アウトライン作成" : "Step 2: 詳細生成"}
          </span>
        </div>

        {/* Progress Text */}
        <p className="text-lg font-medium text-stone-700">{getProgressText()}</p>

        {/* Animated Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={messageIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <p className="text-2xl font-serif text-foreground flex items-center justify-center gap-3">
              <span className="text-3xl">{currentMessage.icon}</span>
              {currentMessage.text}
            </p>
            <p className="text-sm text-stone-500 font-hand">
              {currentMessage.subtext}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="w-full max-w-xs">
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        {/* Day Progress (for details phase) */}
        {phase === "details" && totalDays && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalDays }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-8 h-2 rounded-full transition-colors duration-300
                  ${i + 1 < (currentDay || 0) ? "bg-green-500" : ""}
                  ${i + 1 === (currentDay || 0) ? "bg-primary animate-pulse" : ""}
                  ${i + 1 > (currentDay || 0) ? "bg-stone-200" : ""}
                `}
              />
            ))}
          </div>
        )}

        {/* Footer Message */}
        <motion.p
          className="text-sm font-hand text-muted-foreground"
          animate={reducedMotion ? {} : { rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          もうすぐ出発です ✈️
        </motion.p>
      </div>

      {/* Accessibility */}
      <div className="sr-only" role="status" aria-live="polite">
        {currentMessage.text}
      </div>
    </div>
  );
}
