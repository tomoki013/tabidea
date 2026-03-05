"use client";

import { motion, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrinityCircle } from "@/components/features/landing";
import StartPlanningButton from "@/components/common/StartPlanningButton";
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPathname,
  localizePath,
} from "@/lib/i18n/locales";
import {
  FaRobot,
  FaLightbulb,
  FaGlobeAmericas,
  FaUsers,
  FaShieldAlt,
  FaPenFancy,
} from "react-icons/fa";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function AboutContent() {
  const pathname = usePathname();
  const language = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const t = useTranslations("components.about.content");

  const missionParagraphs = t.raw("mission.paragraphs") as string[];
  const domainBullets = t.raw("domain.bullets") as string[];
  const noticeBullets = t.raw("notice.bullets") as string[];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] pt-32">
      <section className="relative w-full">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center space-y-6"
          >
            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl font-serif font-bold text-[#2c2c2c] leading-tight">
              {t("hero.title")}
            </motion.h1>
            <div className="max-w-3xl mx-auto space-y-4">
              <motion.p variants={fadeInUp} className="text-2xl sm:text-3xl font-serif font-bold text-[#e67e22] leading-relaxed">
                {t("hero.catchLine1")}
                <br className="sm:hidden" />
                {t("hero.catchLine2")}
              </motion.p>
              <motion.p variants={fadeInUp} className="text-lg text-stone-600 font-hand leading-relaxed">
                {t("hero.descriptionLine1")}
                <br className="hidden sm:block" />
                {t("hero.descriptionLine2")}
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        <div className="space-y-24">
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="bg-white rounded-3xl border-2 border-dashed border-stone-200 p-8 sm:p-12 shadow-sm"
          >
            <h2 className="text-3xl font-serif font-bold text-[#e67e22] mb-8 text-center sm:text-left">
              {t("mission.title")}
            </h2>
            <div className="space-y-6 text-stone-700 leading-loose font-serif text-lg">
              <div className="p-6 bg-stone-50 rounded-2xl border-l-4 border-[#e67e22] italic text-stone-600 mb-8">
                <p>{t("mission.quote")}</p>
              </div>
              {missionParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </motion.section>

          <section>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-serif font-bold text-[#2c2c2c] mb-4">
                {t("trinity.title")}
              </h2>
              <p className="text-stone-500">{t("trinity.subtitle")}</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <TrinityCircle />
              </div>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="order-1 lg:order-2 space-y-8"
              >
                <motion.div variants={cardVariant} className="relative pl-8 border-l-2 border-[#e67e22]">
                  <h3 className="text-2xl font-serif font-bold text-[#e67e22] mb-3">
                    {t("trinity.tabi.title")}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    {t("trinity.tabi.bodyLine1")}
                    <br />
                    {t("trinity.tabi.bodyLine2")}
                  </p>
                </motion.div>

                <motion.div variants={cardVariant} className="relative pl-8 border-l-2 border-[#27ae60]">
                  <h3 className="text-2xl font-serif font-bold text-[#27ae60] mb-3">
                    {t("trinity.idea.title")}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    {t("trinity.idea.bodyLine1")}
                    <br />
                    {t("trinity.idea.bodyLine2")}
                  </p>
                </motion.div>

                <motion.div variants={cardVariant} className="relative pl-8 border-l-2 border-[#d35400]">
                  <h3 className="text-2xl font-serif font-bold text-[#d35400] mb-3">
                    {t("trinity.deai.title")}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">
                    {t("trinity.deai.bodyLine1")}
                    <br />
                    {t("trinity.deai.bodyLine2")}
                  </p>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="mt-12 p-6 bg-[#fdf2e9] rounded-2xl text-center max-w-3xl mx-auto"
            >
              <p className="text-[#d35400] font-bold">{t("trinity.valueStatement")}</p>
            </motion.div>
          </section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12"
          >
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2c2c2c] mb-6">
              {t("features.title")}
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-stone-700">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="font-bold text-[#2c2c2c] mb-2">{t("features.cards.plan.title")}</h3>
                <p className="text-sm leading-relaxed">{t("features.cards.plan.body")}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="font-bold text-[#2c2c2c] mb-2">{t("features.cards.save.title")}</h3>
                <p className="text-sm leading-relaxed">{t("features.cards.save.body")}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="font-bold text-[#2c2c2c] mb-2">{t("features.cards.info.title")}</h3>
                <p className="text-sm leading-relaxed">{t("features.cards.info.body")}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <h3 className="font-bold text-[#2c2c2c] mb-2">{t("features.cards.pricing.title")}</h3>
                <p className="text-sm leading-relaxed">
                  {t("features.cards.pricing.bodyPrefix")}
                  <a href={localizePath("/pricing", language)} className="ml-1 underline text-[#e67e22] hover:text-[#d35400]">
                    {t("features.cards.pricing.linkLabel")}
                  </a>
                  {t("features.cards.pricing.bodySuffix")}
                </p>
              </div>
            </div>
            <p className="text-xs text-stone-500 mt-6">{t("features.disclaimer")}</p>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2c2c2c] mb-6 flex items-center gap-3">
                <FaGlobeAmericas className="text-primary/40" />
                {t("domain.title")}
              </h2>
              <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 bg-stone-50 p-6 rounded-2xl text-center">
                  <span className="block text-2xl font-bold text-[#2c2c2c] mb-2">{t("domain.name")}</span>
                  <span className="text-sm text-stone-500">{t("domain.nameKana")}</span>
                </div>
                <div className="md:col-span-2 space-y-4 text-stone-700 leading-relaxed">
                  <p>
                    <span className="font-bold text-[#e67e22]">{t("domain.meaningPart1")}</span>
                    {t("domain.meaningConnector")}
                    <span className="font-bold text-[#e67e22]">{t("domain.meaningPart2")}</span>
                    {t("domain.meaningSuffix")}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-stone-600 ml-2">
                    {domainBullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                  <p className="pt-2 border-t border-stone-100 mt-4">{t("domain.closing")}</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto space-y-6"
          >
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">{t("vision.title")}</h2>
            <p className="text-lg text-stone-700 leading-relaxed">
              {t("vision.bodyLine1")}
              <br />
              {t("vision.bodyLine2")}
            </p>
            <div className="p-6 bg-white border border-stone-200 shadow-sm rounded-xl italic text-stone-600">
              <p className="mb-2">{t("vision.quoteLine1")}</p>
              <p>{t("vision.quoteLine2")}</p>
              <div className="mt-4 text-right text-sm font-bold text-[#e67e22]">{t("vision.signature")}</div>
            </div>
          </motion.section>

          <section className="space-y-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center"
            >
              <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">{t("mvvc.title")}</h2>
              <p className="text-stone-500 mt-2">{t("mvvc.subtitle")}</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariant}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-[#e67e22]">
                    <FaRobot />
                  </div>
                  <h3 className="text-xl font-bold text-[#2c2c2c]">{t("mvvc.missionCard.title")}</h3>
                </div>
                <p className="text-lg font-bold text-stone-800 mb-3">{t("mvvc.missionCard.catch")}</p>
                <p className="text-sm text-stone-600 leading-relaxed">{t("mvvc.missionCard.body")}</p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariant}
                transition={{ delay: 0.2 }}
                className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <FaLightbulb />
                  </div>
                  <h3 className="text-xl font-bold text-[#2c2c2c]">{t("mvvc.visionCard.title")}</h3>
                </div>
                <p className="text-lg font-bold text-stone-800 mb-3">{t("mvvc.visionCard.catch")}</p>
                <p className="text-sm text-stone-600 leading-relaxed">{t("mvvc.visionCard.body")}</p>
              </motion.div>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="bg-stone-50 rounded-3xl p-8 sm:p-12"
            >
              <motion.h3 variants={cardVariant} className="text-2xl font-serif font-bold text-[#2c2c2c] mb-8 text-center">
                {t("mvvc.values.title")}
              </motion.h3>
              <div className="grid md:grid-cols-3 gap-6">
                <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[#e67e22] text-2xl mb-2">
                    <FaUsers />
                  </div>
                  <h4 className="font-bold text-lg text-stone-800">
                    {t("mvvc.values.user.title")}
                    <span className="block text-xs font-normal text-stone-500 mt-1">{t("mvvc.values.user.subtitle")}</span>
                  </h4>
                  <p className="text-sm text-stone-600">{t("mvvc.values.user.body")}</p>
                </motion.div>

                <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[#e67e22] text-2xl mb-2">
                    <FaShieldAlt />
                  </div>
                  <h4 className="font-bold text-lg text-stone-800">
                    {t("mvvc.values.safety.title")}
                    <span className="block text-xs font-normal text-stone-500 mt-1">{t("mvvc.values.safety.subtitle")}</span>
                  </h4>
                  <p className="text-sm text-stone-600">{t("mvvc.values.safety.body")}</p>
                </motion.div>

                <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-sm space-y-3">
                  <div className="text-[#e67e22] text-2xl mb-2">
                    <FaPenFancy />
                  </div>
                  <h4 className="font-bold text-lg text-stone-800">
                    {t("mvvc.values.story.title")}
                    <span className="block text-xs font-normal text-stone-500 mt-1">{t("mvvc.values.story.subtitle")}</span>
                  </h4>
                  <p className="text-sm text-stone-600">{t("mvvc.values.story.body")}</p>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-[#2c2c2c] text-white rounded-3xl p-8 sm:p-12 text-center"
            >
              <h3 className="text-2xl font-serif font-bold mb-4">{t("mvvc.culture.title")}</h3>
              <p className="text-xl font-bold text-[#e67e22] mb-4">{t("mvvc.culture.catch")}</p>
              <p className="text-stone-300 max-w-2xl mx-auto">
                {t("mvvc.culture.bodyLine1")}
                <br />
                {t("mvvc.culture.bodyLine2")}
              </p>
            </motion.div>
          </section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="bg-orange-50 border-2 border-orange-200 border-dashed rounded-3xl p-8 sm:p-12"
          >
            <h2 className="text-2xl font-serif font-bold text-orange-800 mb-4">{t("notice.title")}</h2>
            <div className="space-y-3 text-orange-900 leading-relaxed">
              <p>{t("notice.lead")}</p>
              <ul className="list-disc pl-6 space-y-2">
                {noticeBullets.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
              <p className="text-sm mt-4">
                {t("notice.policyPrefix")}{" "}
                <a
                  href={localizePath("/ai-policy", language)}
                  className="underline font-bold hover:text-orange-700"
                >
                  {t("notice.policyLink")}
                </a>{" "}
                {t("notice.policySuffix")}
              </p>
            </div>
          </motion.section>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center text-xs text-stone-400 font-hand opacity-70"
          >
            <p>
              {t("support.prefix")}{" "}
              <a
                href="https://travel.tomokichidiary.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-stone-500 underline decoration-dashed"
              >
                {t("support.linkLabel")}
              </a>
            </p>
          </motion.div>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center space-y-6 py-8"
          >
            <h2 className="text-3xl font-serif font-bold text-[#2c2c2c]">{t("cta.title")}</h2>
            <p className="text-stone-600 font-hand text-lg">{t("cta.lead")}</p>
            <StartPlanningButton />
          </motion.section>
        </div>
      </main>
    </div>
  );
}
