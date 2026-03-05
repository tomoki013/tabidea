"use client";

import { useTranslations } from "next-intl";
import { Check, Bot, AlertTriangle, XCircle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type TrustLevel = "verified" | "ai_generated" | "needs_check" | "unverified";

export interface TrustBadgeProps {
  /** Trust level to display */
  level: TrustLevel;
  /** Size variant */
  size?: "sm" | "md";
  /** Show text label */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const TRUST_CONFIG: Record<
  TrustLevel,
  {
    icon: typeof Check;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  verified: {
    icon: Check,
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  ai_generated: {
    icon: Bot,
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  needs_check: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  unverified: {
    icon: XCircle,
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function TrustBadge({
  level,
  size = "sm",
  showLabel = false,
  className = "",
}: TrustBadgeProps) {
  const t = useTranslations("components.features.plan.cards.trustBadge");
  const config = TRUST_CONFIG[level];
  const Icon = config.icon;
  const label = t(`levels.${level}.label`);
  const tooltip = t(`levels.${level}.tooltip`);

  const sizeClasses = {
    sm: {
      wrapper: "px-1.5 py-0.5 gap-1",
      icon: "w-3 h-3",
      text: "text-xs",
    },
    md: {
      wrapper: "px-2 py-1 gap-1.5",
      icon: "w-4 h-4",
      text: "text-sm",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizes.wrapper}
        ${className}
      `}
      title={tooltip}
    >
      <Icon className={sizes.icon} />
      {showLabel && (
        <span className={`font-medium ${sizes.text}`}>{label}</span>
      )}
    </div>
  );
}
