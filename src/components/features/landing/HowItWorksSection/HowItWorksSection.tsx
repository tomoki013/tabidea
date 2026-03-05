"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function HowItWorksSection() {
  const t = useTranslations("components.features.landing.howItWorksSection");
  const steps = [
    {
      step: "01",
      title: t("steps.0.title"),
      description: t("steps.0.description"),
    },
    {
      step: "02",
      title: t("steps.1.title"),
      description: t("steps.1.description"),
    },
    {
      step: "03",
      title: t("steps.2.title"),
      description: t("steps.2.description"),
    },
  ];

  return (
    <section className="w-full py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
            {t("title")}
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
            {t("lead")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 border-t-2 border-dashed border-gray-200 -z-10" />

          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col items-center text-center bg-[#fcfbf9] md:bg-transparent p-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold font-serif text-xl shadow-md mb-6 relative z-10">
                {item.step}
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
