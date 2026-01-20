"use client";

import { motion } from "framer-motion";

export default function TrinityCircle() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Circles Container */}
      <div className="relative flex items-center justify-center w-full max-w-[500px] h-[320px] sm:h-[400px]">

        {/* Top Center: Deai */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 sm:w-56 sm:h-56 rounded-full border-4 border-[#d35400] bg-[#d35400]/5 flex flex-col items-center justify-center text-center p-4 z-20"
        >
           <span className="font-serif text-2xl sm:text-3xl font-bold text-[#d35400]">Deai</span>
           <span className="text-[10px] sm:text-xs font-bold text-[#d35400]/80 mt-1 text-center leading-tight">未知との遭遇<br/>最高の瞬間</span>
        </motion.div>

        {/* Bottom Left: Tabi */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="absolute bottom-0 left-0 sm:left-4 w-40 h-40 sm:w-56 sm:h-56 rounded-full border-4 border-[#e67e22] bg-[#e67e22]/5 flex flex-col items-center justify-center text-center p-4 z-10"
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#e67e22]">Tabi</span>
          <span className="text-[10px] sm:text-xs font-bold text-[#e67e22]/80 mt-1">旅の実行</span>
        </motion.div>

        {/* Bottom Right: Idea */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute bottom-0 right-0 sm:right-4 w-40 h-40 sm:w-56 sm:h-56 rounded-full border-4 border-[#27ae60] bg-[#27ae60]/5 flex flex-col items-center justify-center text-center p-4 z-10"
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#27ae60]">Idea</span>
          <span className="text-[10px] sm:text-xs font-bold text-[#27ae60]/80 mt-1">一人一人に<br/>最適なプラン</span>
        </motion.div>

      </div>

      {/* Description Text */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-6 text-center max-w-md px-4"
      >
        <p className="text-stone-600 font-hand text-sm sm:text-base leading-relaxed">
          <span className="font-bold text-[#e67e22]">Tabidea</span>（タビデア）は、あなたの<span className="font-bold text-[#e67e22]">旅（Tabi）</span>を、
          <br />
          一生モノの体験へ変えるAIプランナーです。
        </p>
      </motion.div>
    </div>
  );
}
