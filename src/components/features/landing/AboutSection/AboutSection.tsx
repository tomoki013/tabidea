"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import { TrinityCircle } from "@/components/features/landing";

export default function AboutSection() {
  return (
    <section className="relative w-full py-24 sm:py-32 overflow-hidden bg-[#fcfbf9]">
      {/* Texture Overlays */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-40 mix-blend-multiply pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 z-10">

        {/* Header / Mission */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
           >
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2c2c2c] leading-tight mb-6">
                日常の境界線を越え、<br />
                新しい景色と自分に出会う。
              </h2>
              <p className="text-stone-600 font-hand text-lg leading-relaxed">
                Tabideaは、あなたの心の奥にある「なんとなく」をすくい上げ、<br className="hidden sm:block" />
                一生モノの体験へと変えるトラベルパートナーです。
              </p>
           </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-20 items-center">
          {/* Visual Elements */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <TrinityCircle />
          </motion.div>

          {/* Text Content - The 3 Pillars */}
          <div className="space-y-10">
            {/* Tabi */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="pl-6 border-l-4 border-[#e67e22]"
            >
              <h3 className="text-xl font-serif font-bold text-[#e67e22] mb-2">Tabi（旅）</h3>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                ただの移動ではありません。<br/>
                日常を離れ、心を開放する冒険の時間は、人生を彩る最も鮮やかなパレットです。
              </p>
            </motion.div>

            {/* Idea */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pl-6 border-l-4 border-[#27ae60]"
            >
              <h3 className="text-xl font-serif font-bold text-[#27ae60] mb-2">Idea（アイデア）</h3>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                「どこかに行きたい」という曖昧な願い。<br/>
                AIとの対話を通して、あなた自身も気づいていなかった本当の望みを形にします。
              </p>
            </motion.div>

            {/* Deai */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="pl-6 border-l-4 border-[#d35400]"
            >
              <h3 className="text-xl font-serif font-bold text-[#d35400] mb-2">Deai（出会い）</h3>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                完璧な計画の中に生まれる、予期せぬ喜び。<br/>
                偶然の景色や人々との出会いこそが、旅を特別な物語に変えてくれます。
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="pt-4"
            >
              <Link
                href="/about"
                className="group inline-flex items-center gap-2 text-[#2c2c2c] font-bold border-b-2 border-[#e67e22]/30 hover:border-[#e67e22] pb-1 transition-all duration-300"
              >
                <span>私たちの想い（Brand Story）</span>
                <FaArrowRight className="text-sm text-[#e67e22] transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
