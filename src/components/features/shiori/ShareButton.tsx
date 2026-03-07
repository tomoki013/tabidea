"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FaLink, FaCheck } from "react-icons/fa";

export default function ShareButton() {
  const t = useTranslations("components.features.shiori.shareButton");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the URL
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
    >
      {copied ? <FaCheck size={14} className="text-green-500" /> : <FaLink size={14} />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
