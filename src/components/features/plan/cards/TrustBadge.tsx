"use client";

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
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    tooltip: string;
  }
> = {
  verified: {
    icon: Check,
    label: "検証済み",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
    tooltip: "Google Places等で存在を確認済み",
  },
  ai_generated: {
    icon: Bot,
    label: "AI生成",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    tooltip: "AIが生成した情報（未検証）",
  },
  needs_check: {
    icon: AlertTriangle,
    label: "要確認",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    tooltip: "存在が不確かな場合があります",
  },
  unverified: {
    icon: XCircle,
    label: "位置情報未確認",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    tooltip: "Google Placesで該当スポットが見つかりませんでした",
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
  const config = TRUST_CONFIG[level];
  const Icon = config.icon;

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
      title={config.tooltip}
    >
      <Icon className={sizes.icon} />
      {showLabel && (
        <span className={`font-medium ${sizes.text}`}>{config.label}</span>
      )}
    </div>
  );
}
