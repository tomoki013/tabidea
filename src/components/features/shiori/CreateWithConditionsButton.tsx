"use client";

import { useTranslations } from "next-intl";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { usePlanModal } from "@/context/PlanModalContext";
import { conditionsSnapshotToUserInput } from "@/lib/plans/conditions";
import type { PublicConditionsSnapshot } from "@/types/plans";
import type { UserInput } from "@/types";

interface CreateWithConditionsButtonProps {
  conditions: PublicConditionsSnapshot | null | undefined;
}

export default function CreateWithConditionsButton({ conditions }: CreateWithConditionsButtonProps) {
  const t = useTranslations("components.features.shiori.createWithConditionsButton");
  const { openModal } = usePlanModal();

  const handleClick = () => {
    if (conditions) {
      const partial = conditionsSnapshotToUserInput(conditions);
      openModal({ initialInput: partial as UserInput });
    } else {
      openModal();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      <FaWandMagicSparkles size={14} />
      {t("label")}
    </button>
  );
}
