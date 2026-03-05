"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FaArrowRight } from "react-icons/fa";
import StartPlanningButton from "@/components/common/StartPlanningButton";

interface StepItem {
  number: string;
  title: string;
  description: string;
  tips: string[];
}

interface UsageTipItem {
  title: string;
  description: string;
}

export default function HowToUseSection() {
  const t = useTranslations("components.features.landing.howToUse");
  const steps = t.raw("steps") as StepItem[];
  const usageTips = t.raw("usageTips") as UsageTipItem[];

  return (
    <section className="w-full py-20 px-4 bg-white/50 border-t border-dashed border-gray-200">
      <div className="max-w-6xl mx-auto space-y-20">
        {/* Step by step guide */}
        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground">
              {t("guideTitle")}
            </h2>
            <p className="text-muted-foreground font-hand text-lg">
              {t("guideLead")}
            </p>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={`${step.number}-${step.title}`}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 bg-white rounded-2xl p-6 border-2 border-dashed border-stone-200 hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center font-bold font-serif text-2xl shadow-lg">
                    {step.number}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-2xl font-serif font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-bold text-primary">
                      {t("tipLabel")}
                    </p>
                    <ul className="space-y-1">
                      {step.tips.map((tip, idx) => (
                        <li
                          key={`${step.title}-${idx}`}
                          className="flex items-start gap-2 text-sm text-stone-600"
                        >
                          <span className="text-primary mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Usage Tips */}
        <div className="space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground">
              {t("tipsTitle")}
            </h2>
            <p className="text-muted-foreground font-hand text-lg">
              {t("tipsLead")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {usageTips.map((tip, index) => (
              <motion.div
                key={`${tip.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-white to-primary/5 rounded-2xl p-6 border-2 border-dashed border-stone-200"
              >
                <h3 className="text-xl font-serif font-bold text-foreground mb-3">
                  {tip.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {tip.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-6 pt-8"
        >
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {t("ctaTitle")}
          </h3>
          <p className="text-muted-foreground font-hand text-lg">
            {t("ctaLead")}
          </p>
          <StartPlanningButton
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group"
          >
            <span>{t("ctaButton")}</span>
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </StartPlanningButton>
        </motion.div>
      </div>
    </section>
  );
}
