"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FaCompass,
  FaArrowRight,
} from "react-icons/fa";
import TrinityCircle from "@/components/ui/TrinityCircle";

export default function AboutSection() {
  return (
    <section className="relative w-full py-24 sm:py-32 overflow-hidden bg-[#fcfbf9]">
      {/* Texture Overlays */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-40 mix-blend-multiply" />

      <div className="relative max-w-6xl mx-auto px-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 mb-6 text-primary/80 font-bold tracking-widest text-sm uppercase border-b-2 border-primary/20 pb-1">
              <FaCompass />
              <span>About Tabidea</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-stone-800 leading-tight mb-8">
              旅のしおりを、
              <br />
              <span className="text-primary">もっと自由に、</span>
              <br />
              もっとあなたらしく。
            </h2>

            <div className="space-y-6 text-stone-600 leading-relaxed font-hand text-lg">
              <p>
                「Tabidea（タビデア）」は、旅（Tabi）とアイデア（Idea）を組み合わせた、
                新しい旅の計画パートナーです。
              </p>
              <p>
                AIが効率的なルートを提案するのはもちろんですが、私たちはそれ以上に
                「旅を計画する時間のワクワク感」を大切にしたいと考えています。
              </p>
              <p>
                真っ白な地図に行きたい場所を書き込むように。
                お気に入りの手帳にシールを貼るように。
                偶然の出会いや、ちょっとした寄り道も大切にしながら、
                世界に一つだけの物語を作ってみませんか？
              </p>

              <div className="pt-6">
                <Link
                  href="/about"
                  className="group inline-flex items-center gap-2 text-primary font-serif font-bold text-lg border-b-2 border-primary/20 pb-1 hover:border-primary transition-all duration-300"
                >
                  <span>Tabideaについて詳しく</span>
                  <FaArrowRight className="text-sm transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Visual Elements */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative flex justify-center items-center"
          >
            <TrinityCircle />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
