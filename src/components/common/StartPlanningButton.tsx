"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { usePlanModal } from "@/context/PlanModalContext";
import { resolveLanguageFromPathname } from "@/lib/i18n/navigation";

interface StartPlanningButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function StartPlanningButton({
  className,
  children,
}: StartPlanningButtonProps) {
  const { openModal } = usePlanModal();
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);

  return (
    <button
      onClick={() => openModal()}
      className={className || "inline-block bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full transition-all hover:scale-105 shadow-lg"}
    >
      {children || (language === "ja" ? "プランを作成する" : "Create a plan")}
    </button>
  );
}
