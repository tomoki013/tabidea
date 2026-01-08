"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FaCookieBite } from "react-icons/fa";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent_accepted");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem("cookie_consent_accepted", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-[#fcfbf9] border-t-2 border-[#e67e22] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
        >
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="hidden md:block text-[#e67e22] mt-1">
                <FaCookieBite size={24} />
              </div>
              <p className="text-sm md:text-base text-stone-700 leading-relaxed font-medium">
                当サイトでは、サービスの向上とお客様により適したサービスを提供するためにクッキー（Cookie）を使用しています。
                サイトの利用を継続することで、クッキーの使用に同意したものとみなされます。
              </p>
            </div>
            <div className="flex gap-4 shrink-0 w-full md:w-auto">
              <Link
                href="/cookie-policy"
                className="flex-1 md:flex-none py-2 px-6 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors text-center text-sm font-bold"
              >
                詳細へ
              </Link>
              <button
                onClick={handleAgree}
                className="flex-1 md:flex-none py-2 px-6 rounded-full bg-[#e67e22] text-white hover:bg-[#d35400] transition-colors shadow-sm hover:shadow-md text-center text-sm font-bold"
              >
                同意する
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
