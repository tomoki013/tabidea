"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FaCompass,
  FaMapMarkedAlt,
  FaPenFancy,
  FaArrowRight,
} from "react-icons/fa";

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
            className="relative"
          >
            {/* Decorative Card 1 */}
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-white rounded-sm shadow-xl p-4 rotate-[-6deg] z-0 hidden sm:block">
              <div className="w-full h-full border-2 border-dashed border-stone-200 flex items-center justify-center bg-stone-50">
                <FaMapMarkedAlt className="text-6xl text-stone-200" />
              </div>
            </div>

            {/* Main Card */}
            <div className="relative bg-white p-6 sm:p-8 rounded-sm shadow-2xl rotate-2 z-10 max-w-md mx-auto">
              {/* Tape effect */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-orange-100/80 rotate-[-1deg] shadow-sm backdrop-blur-sm z-20"></div>

              <div className="border border-stone-100 p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-primary mb-2">
                  <FaPenFancy size={24} />
                </div>
                <h3 className="font-serif text-xl font-bold text-stone-800">
                  Your Journey, Your Story
                </h3>
                <p className="text-sm text-stone-500 font-hand leading-loose">
                  Tabideaは、あなたの「行きたい」という想いを形にします。
                  <br />
                  AIっぽさを感じさせない、
                  <br />
                  温かみのあるサポートを目指して。
                </p>
                <div className="w-full h-px bg-stone-200 my-2"></div>
                <div className="flex gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                  <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                  <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
