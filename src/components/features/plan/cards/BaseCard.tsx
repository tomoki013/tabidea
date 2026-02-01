"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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
  title: string;
  /** Subtitle or summary line */
  subtitle?: string;
  /** Time or duration display */
  time?: string;
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
// Color Theme Styles
// ============================================================================

const COLOR_THEMES = {
  orange: {
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    border: "border-orange-200",
    activeBorder: "border-orange-400",
    timeBg: "bg-orange-50",
    timeColor: "text-orange-700",
  },
  blue: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    border: "border-blue-200",
    activeBorder: "border-blue-400",
    timeBg: "bg-blue-50",
    timeColor: "text-blue-700",
  },
  purple: {
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    border: "border-purple-200",
    activeBorder: "border-purple-400",
    timeBg: "bg-purple-50",
    timeColor: "text-purple-700",
  },
  green: {
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    border: "border-green-200",
    activeBorder: "border-green-400",
    timeBg: "bg-green-50",
    timeColor: "text-green-700",
  },
  teal: {
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    border: "border-teal-200",
    activeBorder: "border-teal-400",
    timeBg: "bg-teal-50",
    timeColor: "text-teal-700",
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
  const currentState = onStateChange ? state : internalState;
  const isExpanded = currentState === "expanded";
  const isLoading = currentState === "loading";

  const theme = COLOR_THEMES[colorTheme];

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
    <motion.div
      layout
      className={`
        rounded-xl border-2 bg-white overflow-hidden transition-shadow
        ${isExpanded ? theme.activeBorder : theme.border}
        ${isExpanded ? "shadow-md" : "shadow-sm"}
        ${expandable ? "cursor-pointer" : ""}
        ${className}
      `}
      onClick={handleToggle}
    >
      {/* Collapsed Header */}
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0
            ${theme.iconBg} ${theme.iconColor}
          `}
        >
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-stone-800 truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-stone-500 truncate">{subtitle}</p>
          )}
        </div>

        {/* Time Display */}
        {time && (
          <div
            className={`
              px-2.5 py-1 rounded-lg text-sm font-medium shrink-0
              ${theme.timeBg} ${theme.timeColor}
            `}
          >
            {time}
          </div>
        )}

        {/* Expand Indicator */}
        {expandable && children && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-stone-400" />
          </motion.div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="px-4 pb-4">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-stone-200 rounded w-3/4"></div>
            <div className="h-4 bg-stone-200 rounded w-1/2"></div>
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-4 pt-1 border-t border-stone-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
