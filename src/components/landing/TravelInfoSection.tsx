"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  FaGlobeAsia,
  FaClock,
  FaMoneyBillWave,
  FaShieldAlt,
  FaArrowRight,
  FaPassport,
} from "react-icons/fa";

export default function TravelInfoSection() {
  return (
    <section className="relative w-full py-24 bg-[#fcfbf9] overflow-hidden border-t border-stone-100">
      {/* Background texture if needed, matching other sections */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 mb-6 text-orange-600 font-bold tracking-widest text-sm uppercase">
              <FaShieldAlt />
              <span>Travel Support</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-stone-800 leading-tight mb-6">
              安心も、
              <br />
              旅の一部です。
            </h2>

            <div className="space-y-6 text-stone-600 font-hand text-lg leading-relaxed mb-8">
              <p>
                知らない土地へ行くときは、誰でも少し不安になるもの。
                Tabideaなら、旅の計画と一緒に、現地に必要な情報もまとめてチェックできます。
              </p>
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-3">
                  <FaClock className="text-orange-400" />
                  <span>主要都市の現地時間を表示</span>
                </li>
                {/* <li className="flex items-center gap-3">
                  <FaMoneyBillWave className="text-orange-400" />
                  <span>最新の為替レートをかんたん計算</span>
                </li> */}
                <li className="flex items-center gap-3">
                  <FaShieldAlt className="text-orange-400" />
                  <span>外務省の安全情報へのダイレクトリンク</span>
                </li>
              </ul>
            </div>

            <Link
              href="/travel-info"
              className="inline-flex items-center gap-3 bg-[#e67e22] text-white px-8 py-4 rounded-full font-serif font-bold text-lg shadow-lg hover:bg-[#d35400] hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              <span>渡航情報・ツールを見る</span>
              <FaArrowRight />
            </Link>
          </motion.div>

          {/* Right Column: Visual Collage */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[400px] sm:h-[500px] w-full"
          >
            {/* Abstract Background Shape */}
            <div className="absolute inset-0 bg-orange-50 rounded-full blur-3xl opacity-50 transform scale-90" />

            {/* Elements Floating */}
            {/* Card 1: Time */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="absolute top-10 left-0 sm:left-10 bg-white p-6 rounded-xl shadow-lg border border-stone-100 rotate-[-3deg] w-48 z-20"
            >
              <div className="flex items-center gap-3 mb-2 text-stone-400 text-xs font-bold uppercase">
                <FaClock /> Local Time
              </div>
              <div className="text-3xl font-mono text-stone-800">10:42</div>
              <div className="text-xs text-stone-500 mt-1">in Paris</div>
            </motion.div>

            {/* Card 2: Currency */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="absolute bottom-20 right-0 sm:right-10 bg-white p-6 rounded-xl shadow-lg border border-stone-100 rotate-[3deg] w-52 z-30"
            >
              <div className="flex items-center gap-3 mb-2 text-stone-400 text-xs font-bold uppercase">
                <FaMoneyBillWave /> Currency
              </div>
              <div className="text-2xl font-mono text-stone-800">€ 125.00</div>
              <div className="text-xs text-stone-500 mt-1 border-t border-stone-100 pt-1 flex justify-between">
                <span>JPY</span>
                <span className="font-bold">¥20,350</span>
              </div>
            </motion.div>

            {/* Decorative Icon: Passport */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-40 h-52 bg-[#1a3c6e] rounded-lg shadow-xl flex flex-col items-center justify-center border-l-4 border-[#122a4d]">
                <FaPassport className="text-white/20 text-6xl mb-4" />
                <div className="text-white/40 font-serif tracking-widest text-xs">
                  PASSPORT
                </div>
              </div>
            </motion.div>

            {/* Sticker: Safety */}
            <div className="absolute top-0 right-10 w-24 h-24 bg-yellow-100 rounded-full shadow-md flex items-center justify-center rotate-12 z-0 opacity-80">
              <FaShieldAlt className="text-yellow-600 text-3xl" />
            </div>

            {/* Sticker: Plane */}
            <div className="absolute bottom-10 left-10 w-20 h-20 bg-blue-50 rounded-full shadow-md flex items-center justify-center -rotate-12 z-40 opacity-90">
              <FaGlobeAsia className="text-blue-400 text-3xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
