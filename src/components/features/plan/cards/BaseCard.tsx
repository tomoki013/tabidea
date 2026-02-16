"use client";

import { useState, ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { JournalSheet, Tape } from "@/components/ui/journal";

// ============================================================================
// Types
// ============================================================================

export type CardState = "collapsed" | "expanded" | "loading";

export interface BaseCardProps {
  /** Card type identifier */
  cardType: "spot" | "transit" | "accommodation";
  /** Icon to display */
  icon: ReactNode;
  /** Main title/name */
  title: string | ReactNode;
  /** Subtitle or summary line */
  subtitle?: string | ReactNode;
  /** Time or duration display */
  time?: string | ReactNode;
  /** Children rendered when expanded */
  children?: ReactNode;
  /** Current card state */
  state?: CardState;
  /** Callback when state changes */
  onStateChange?: (state: CardState) => void;
  /** Custom class name */
  className?: string;
  /** Color theme based on card type */
  colorTheme?: "orange" | "blue" | "purple" | "green" | "teal";
  /** Whether card is clickable/expandable */
  expandable?: boolean;
  /** Badge or status indicator */
  badge?: ReactNode;
}

// ============================================================================
// Color Theme Styles (Mapped to Journal aesthetics)
// ============================================================================

const COLOR_THEMES = {
  orange: {
    tapeColor: "yellow",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
    borderColor: "border-orange-200",
  },
  blue: {
    tapeColor: "blue",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  purple: {
    tapeColor: "pink", // Using pink tape for purple theme
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  green: {
    tapeColor: "green",
    iconBg: "bg-green-100",
    iconColor: "text-green-700",
    borderColor: "border-green-200",
  },
  teal: {
    tapeColor: "blue",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    borderColor: "border-teal-200",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function BaseCard({
  cardType,
  icon,
  title,
  subtitle,
  time,
  children,
  state = "collapsed",
  onStateChange,
  className = "",
  colorTheme = "orange",
  expandable = true,
  badge,
}: BaseCardProps) {
  const [internalState, setInternalState] = useState<CardState>(state);
  const [isAnimating, setIsAnimating] = useState(false);
  const currentState = onStateChange ? state : internalState;
  const isExpanded = currentState === "expanded";
  const isLoading = currentState === "loading";

  const handleAnimationStart = useCallback(() => {
    setIsAnimating(true);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const theme = COLOR_THEMES[colorTheme] || COLOR_THEMES.orange;

  const handleToggle = () => {
    if (!expandable) return;
    const newState = isExpanded ? "collapsed" : "expanded";
    if (onStateChange) {
      onStateChange(newState);
    } else {
      setInternalState(newState);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Tape Decoration (Visual only, on top) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 group-hover:-translate-y-1 transition-transform duration-300">
         <Tape color={theme.tapeColor as "yellow" | "pink" | "blue" | "green" | "white" | "red"} className="w-20 h-6 opacity-90 shadow-sm" />
      </div>

      <motion.div
        layout
        className={`
          relative bg-white rounded-sm border shadow-sm transition-all duration-300
          ${isExpanded ? "shadow-md rotate-0 z-10" : "hover:shadow-md hover:-rotate-1 z-0"}
          ${theme.borderColor}
          ${expandable ? "cursor-pointer" : ""}
        `}
        onClick={handleToggle}
      >
        {/* Collapsed Header */}
        <div className="flex items-center gap-3 p-4 pt-5">
          {/* Icon */}
          <div
            className={`
              w-10 h-10 rounded-sm flex items-center justify-center shrink-0 border-2 border-dashed border-stone-300
              ${theme.iconBg} ${theme.iconColor}
            `}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-stone-800 font-hand text-lg leading-tight">{title}</h3>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-stone-500 truncate font-hand">{subtitle}</p>
            )}
          </div>

          {/* Time Display */}
          {time && (
            <div className="font-mono text-xs text-stone-400 shrink-0 bg-stone-50 px-2 py-1 rounded-sm border border-stone-100">
              {time}
            </div>
          )}

          {/* Expand Indicator */}
          {expandable && children && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 text-stone-400"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-4 pb-4">
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-stone-100 rounded w-3/4"></div>
              <div className="h-4 bg-stone-100 rounded w-1/2"></div>
            </div>
          </div>
        )}

        {/* Expanded Content */}
        <AnimatePresence initial={false}>
          {isExpanded && children && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={isAnimating ? "overflow-hidden" : "overflow-visible"}
              onAnimationStart={handleAnimationStart}
              onAnimationComplete={handleAnimationComplete}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pb-6 pt-2 border-t border-stone-100 border-dashed overflow-visible">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
