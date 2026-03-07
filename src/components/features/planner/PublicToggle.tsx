"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { updatePlanVisibility } from "@/app/actions/travel-planner";
import { upsertPlanPublication } from "@/app/actions/plan-itinerary";
import { motion } from "framer-motion";
import { FaGlobe, FaLock } from "react-icons/fa";
import type { UserInput } from "@/types";
import { buildConditionsSnapshot } from "@/lib/plans/conditions";

interface PublicToggleProps {
  planId: string;
  initialIsPublic: boolean;
  userInput?: UserInput;
  durationDays?: number | null;
  className?: string;
}

export default function PublicToggle({
  planId,
  initialIsPublic,
  userInput,
  durationDays,
  className = "",
}: PublicToggleProps) {
  const t = useTranslations("components.features.planner.publicToggle");
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

  const handleToggle = async () => {
    if (isLoading) return;

    const newState = !isPublic;
    setIsPublic(newState); // Optimistic update
    setIsLoading(true);

    try {
      const result = await updatePlanVisibility(planId, newState);
      if (!result.success) {
        setIsPublic(!newState);
        console.error("Failed to update visibility:", result.error);
        return;
      }

      // When going public, also save conditions_snapshot to plan_publications
      if (newState && userInput) {
        const conditionsSnapshot = buildConditionsSnapshot(userInput, durationDays);
        await upsertPlanPublication({
          planId,
          destination: userInput.destinations[0] ?? null,
          visibility: 'public',
          publishJournal: true,
          publishBudget: false,
          conditionsSnapshot,
        });
      }
    } catch (e) {
      setIsPublic(!newState);
      console.error("Error toggling visibility:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center sm:items-start gap-2 ${className}`}>
      <span className="text-sm font-bold text-stone-600 dark:text-stone-400 flex items-center gap-2">
        {isPublic ? <FaGlobe /> : <FaLock />}
        {t("label")}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`
            relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
            ${isPublic ? "bg-primary" : "bg-stone-300 dark:bg-stone-600"}
            ${isLoading ? "opacity-70 cursor-wait" : "cursor-pointer"}
          `}
          aria-label={isPublic ? t("states.public") : t("states.private")}
        >
          <motion.div
            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-xs"
            initial={false}
            animate={{ x: isPublic ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {isLoading ? (
               <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : isPublic ? (
              <FaGlobe className="text-primary" size={12} />
            ) : (
              <FaLock className="text-stone-400" size={12} />
            )}
          </motion.div>
        </button>
        <span className="text-xs font-mono text-stone-500 dark:text-stone-400 min-w-[4rem]">
          {isPublic ? t("states.public") : t("states.private")}
        </span>
      </div>
    </div>
  );
}
