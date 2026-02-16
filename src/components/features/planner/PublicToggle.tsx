"use client";

import { useState, useTransition } from "react";
import { updatePlanVisibility } from "@/app/actions/travel-planner";
import { motion } from "framer-motion";
import { FaGlobe, FaLock } from "react-icons/fa";

interface PublicToggleProps {
  planId: string;
  initialIsPublic: boolean;
  className?: string;
}

export default function PublicToggle({
  planId,
  initialIsPublic,
  className = "",
}: PublicToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newState = !isPublic;
    setIsPublic(newState); // Optimistic update

    startTransition(async () => {
      const result = await updatePlanVisibility(planId, newState);
      if (!result.success) {
        // Revert on failure
        setIsPublic(!newState);
        console.error("Failed to update visibility:", result.error);
        // Minimal feedback, could be improved with a toast
      }
    });
  };

  return (
    <div className={`flex flex-col items-center sm:items-start gap-2 ${className}`}>
      <span className="text-sm font-bold text-stone-600 flex items-center gap-2">
        {isPublic ? <FaGlobe /> : <FaLock />}
        公開設定
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`
            relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
            ${isPublic ? "bg-primary" : "bg-stone-300"}
            ${isPending ? "opacity-70 cursor-wait" : "cursor-pointer"}
          `}
          aria-label={isPublic ? "公開中" : "非公開"}
        >
          <motion.div
            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-xs"
            initial={false}
            animate={{ x: isPublic ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {isPublic ? (
              <FaGlobe className="text-primary" size={12} />
            ) : (
              <FaLock className="text-stone-400" size={12} />
            )}
          </motion.div>
        </button>
        <span className="text-xs font-mono text-stone-500 min-w-[4rem]">
          {isPublic ? "Public" : "Private"}
        </span>
      </div>
    </div>
  );
}
