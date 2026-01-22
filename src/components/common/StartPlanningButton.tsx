"use client";

import React from "react";
import { usePlanModal } from "@/context/PlanModalContext";

interface StartPlanningButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function StartPlanningButton({
  className,
  children,
}: StartPlanningButtonProps) {
  const { openModal } = usePlanModal();

  return (
    <button
      onClick={() => openModal()}
      className={className || "inline-block bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full transition-all hover:scale-105 shadow-lg"}
    >
      {children || "プランを作成する"}
    </button>
  );
}
