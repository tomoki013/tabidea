"use client";

import { motion } from "framer-motion";
import { FaLightbulb, FaRoute, FaHeart } from "react-icons/fa";

export default function FeaturesHeroSection() {
  return (
    <section className="relative w-full bg-gradient-to-b from-primary/5 to-transparent">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        <div className="space-y-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-6xl font-serif font-bold text-foreground leading-tight">
              あなたの旅を、
              <br className="sm:hidden" />
              もっと自由に。
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-hand max-w-2xl mx-auto">
              Tabideaは、AIの力であなたの旅行プランを作成するサービスです。
              <br />
              まるで旅行ガイドと一緒に計画を立てているように、
              <br className="hidden sm:block" />
              対話しながら理想の旅を見つけましょう。
            </p>
          </motion.div>

          {/* Key Features Icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="flex flex-wrap justify-center gap-8 pt-8"
          >
            <div className="flex items-center gap-3 text-primary">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaLightbulb size={24} />
              </div>
              <span className="font-serif font-bold text-lg">AI提案</span>
            </div>
            <div className="flex items-center gap-3 text-primary">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaRoute size={24} />
              </div>
              <span className="font-serif font-bold text-lg">柔軟なプラン</span>
            </div>
            <div className="flex items-center gap-3 text-primary">
              <div className="p-3 bg-primary/10 rounded-full">
                <FaHeart size={24} />
              </div>
              <span className="font-serif font-bold text-lg">好みに合わせて</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
