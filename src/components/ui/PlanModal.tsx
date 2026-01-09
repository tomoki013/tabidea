"use client";

import { useEffect } from "react";
import TravelPlanner from "@/components/TravelPlanner";
import { UserInput } from "@/lib/types";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInput?: UserInput | null;
  initialStep?: number;
}

export default function PlanModal({
  isOpen,
  onClose,
  initialInput,
  initialStep,
}: PlanModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-[90vh] bg-transparent relative animate-in zoom-in-95 duration-300">
        <TravelPlanner
          initialInput={initialInput}
          initialStep={initialStep}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
