"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FaCookieBite } from "react-icons/fa";
import { FaXmark, FaCheck } from "react-icons/fa6";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent_accepted");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem("cookie_consent_accepted", "true");
    setShowThankYou(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 2500);
  };

  const handleClose = () => {
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
          <AnimatePresence mode="wait">
            {!showThankYou ? (
              <motion.div
                key="consent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto relative"
              >
                <button
                  onClick={handleClose}
                  className="absolute -top-2 -right-2 md:-top-4 md:-right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors z-10"
                  aria-label="一時的に閉じる"
                >
                  <FaXmark size={20} />
                </button>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pr-6 md:pr-0">
                  <div className="flex items-start gap-4">
                    <div className="hidden md:block text-[#e67e22] mt-1 shrink-0">
                      <FaCookieBite size={24} />
                    </div>
                    <p className="text-sm md:text-base text-stone-700 leading-relaxed font-medium">
                      当サイトでは、サービスの向上とお客様により適したサービスを提供するためにクッキー（Cookie）を使用しています。
                      サイトの利用を継続することで、クッキーの使用に同意したものとみなされます。
                    </p>
                  </div>
                  <div className="flex gap-4 shrink-0 w-full md:w-auto justify-end">
                    <Link
                      href="/cookie-policy"
                      className="flex-1 md:flex-none py-2 px-6 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors text-center text-sm font-bold whitespace-nowrap"
                    >
                      詳細へ
                    </Link>
                    <button
                      onClick={handleAgree}
                      className="flex-1 md:flex-none py-2 px-6 rounded-full bg-[#e67e22] text-white hover:bg-[#d35400] transition-colors shadow-sm hover:shadow-md text-center text-sm font-bold whitespace-nowrap"
                    >
                      同意する
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="thankyou"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="max-w-6xl mx-auto flex flex-col items-center justify-center py-2"
              >
                <div className="flex items-center gap-3 text-[#e67e22]">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <FaCheck size={20} />
                  </div>
                  <span className="font-bold text-lg text-stone-800">
                    ご同意いただきありがとうございます！
                  </span>
                </div>
                <p className="text-stone-500 text-sm mt-1">
                  設定を保存しました。引き続き旅の計画をお楽しみください。
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
