"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaCheck } from "react-icons/fa";

interface GeneratingOverlayProps {
  totalDays: number;
  completedDays: number;
  currentGeneratingDay?: number;
  onDismiss: () => void;
  isCompleted?: boolean;
}

export default function GeneratingOverlay({
  totalDays,
  completedDays,
  currentGeneratingDay,
  onDismiss,
  isCompleted = false,
}: GeneratingOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const wasCompletedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive showCompletedMessage from props instead of state
  const showCompletedMessage = isCompleted;

  // Auto-dismiss when completed
  useEffect(() => {
    if (isCompleted && !wasCompletedRef.current) {
      wasCompletedRef.current = true;
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 3000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isCompleted, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const progressPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div
            className={`
              relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border-2 overflow-hidden
              ${showCompletedMessage ? "border-green-300" : "border-primary/30"}
            `}
          >
            {/* Progress bar background */}
            <motion.div
              className={`absolute bottom-0 left-0 h-1 ${
                showCompletedMessage
                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                  : "bg-gradient-to-r from-primary to-primary/70"
              }`}
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />

            <div className="p-4 flex items-center gap-4">
              {/* Status Icon */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center shrink-0
                  ${
                    showCompletedMessage
                      ? "bg-green-100 text-green-600"
                      : "bg-primary/10 text-primary"
                  }
                `}
              >
                {showCompletedMessage ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <FaCheck className="text-lg" />
                  </motion.div>
                ) : (
                  <motion.div
                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {showCompletedMessage ? (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <p className="font-bold text-green-700">
                        プラン完成！
                      </p>
                      <p className="text-sm text-green-600">
                        すべての詳細が生成されました
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <p className="font-bold text-stone-700">
                        {currentGeneratingDay
                          ? `Day ${currentGeneratingDay} の詳細を生成中...`
                          : `詳細を生成中...`}
                      </p>
                      <p className="text-sm text-stone-500">
                        {completedDays}/{totalDays} 日完了 • スクロールして閲覧できます
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Day Progress Pills */}
              <div className="hidden sm:flex items-center gap-1 shrink-0">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                  <motion.div
                    key={day}
                    className={`
                      w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors
                      ${
                        day <= completedDays
                          ? showCompletedMessage
                            ? "bg-green-500 text-white"
                            : "bg-primary text-white"
                          : day === currentGeneratingDay
                          ? "bg-primary/20 text-primary border-2 border-primary animate-pulse"
                          : "bg-stone-100 text-stone-400"
                      }
                    `}
                    initial={day <= completedDays ? { scale: 0.8 } : {}}
                    animate={day <= completedDays ? { scale: 1 } : {}}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    {day}
                  </motion.div>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors shrink-0"
                title="閉じる"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
