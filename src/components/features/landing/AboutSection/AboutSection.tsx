"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";
import { TrinityCircle } from "@/components/features/landing";

export default function AboutSection() {
  const t = useTranslations("components.extraUi.landingAboutSection");

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
                {t("headlineLine1")}<br />
                {t("headlineLine2")}
              </h2>
              <p className="text-stone-600 font-hand text-lg leading-relaxed">
                {t("leadLine1")}<br className="hidden sm:block" />
                {t("leadLine2")}
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
              <h3 className="text-xl font-serif font-bold text-[#e67e22] mb-2">{t("tabiTitle")}</h3>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                {t("tabiLine1")}<br/>
                {t("tabiLine2")}
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
              <h3 className="text-xl font-serif font-bold text-[#27ae60] mb-2">{t("ideaTitle")}</h3>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                {t("ideaLine1")}<br/>
                {t("ideaLine2")}
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
              <h3 className="text-xl font-serif font-bold text-[#d35400] mb-2">{t("deaiTitle")}</h3>
              <p className="text-stone-600 leading-relaxed text-sm sm:text-base">
                {t("deaiLine1")}<br/>
                {t("deaiLine2")}
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
                <span>{t("storyLink")}</span>
                <FaArrowRight className="text-sm text-[#e67e22] transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
