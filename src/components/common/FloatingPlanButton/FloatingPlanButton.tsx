"use client";

import { useTranslations } from "next-intl";
import { FaPlus } from "react-icons/fa6";
import { usePlanModal } from "@/context/PlanModalContext";

export default function FloatingPlanButton() {
  const t = useTranslations("components.common.floatingPlanButton");
  const { openModal } = usePlanModal();

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => openModal()}
        className="fixed bottom-6 right-6 z-40 group bg-primary text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label={t("createNewPlan")}
      >
        <FaPlus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />

        {/* Tooltip */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-stone-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          {t("createNewPlan")}
        </span>
      </button>
    </>
  );
}
