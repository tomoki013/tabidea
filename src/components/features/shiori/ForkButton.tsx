"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FaCodeBranch } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import { forkPublicShiori } from "@/app/actions/shiori";

interface ForkButtonProps {
  slug: string;
  locale: string;
}

export default function ForkButton({ slug, locale }: ForkButtonProps) {
  const t = useTranslations("components.features.shiori.forkButton");
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!isAuthenticated) return;
    setError(null);
    setIsConfirming(true);
  };

  const handleConfirm = async () => {
    setIsForking(true);
    setIsConfirming(false);
    try {
      const result = await forkPublicShiori(slug);
      if (result.success && result.newPlanId) {
        router.push(`/${locale}/plan/id/${result.newPlanId}`);
      } else {
        setError(t("forkFailed"));
        setIsForking(false);
      }
    } catch {
      setError(t("forkFailed"));
      setIsForking(false);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  if (!isAuthenticated) {
    return (
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {t("loginRequired")}
      </p>
    );
  }

  if (isConfirming) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-4 space-y-3 max-w-sm">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{t("confirmTitle")}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{t("confirmBody")}</p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t("confirmYes")}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 py-2 px-3 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
          >
            {t("confirmNo")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isForking}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        <FaCodeBranch size={14} />
        {isForking ? t("forking") : t("fork")}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
