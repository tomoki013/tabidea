"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  FaRobot,
  FaMapMarkedAlt,
  FaEdit,
  FaGlobeAsia,
  FaCalendarAlt,
  FaUsers,
  FaWallet,
  FaCompass,
  FaCloud,
} from "react-icons/fa";
import type { IconType } from "react-icons";

type FeatureIconKey =
  | "FaRobot"
  | "FaMapMarkedAlt"
  | "FaEdit"
  | "FaGlobeAsia"
  | "FaCalendarAlt"
  | "FaUsers"
  | "FaWallet"
  | "FaCompass"
  | "FaCloud";

interface FeatureItem {
  icon: FeatureIconKey;
  title: string;
  description: string;
  details: string[];
}

const ICON_MAP: Record<FeatureIconKey, IconType> = {
  FaRobot,
  FaMapMarkedAlt,
  FaEdit,
  FaGlobeAsia,
  FaCalendarAlt,
  FaUsers,
  FaWallet,
  FaCompass,
  FaCloud,
};

export default function FeaturesDetailSection() {
  const t = useTranslations("components.features.landing.featuresDetail");
  const features = t.raw("items") as FeatureItem[];

  return (
    <section className="w-full py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground">
            {t("title")}
          </h2>
          <p className="text-muted-foreground font-hand text-lg">
            {t("lead")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = ICON_MAP[feature.icon];

            return (
              <motion.div
                key={`${feature.icon}-${feature.title}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/50 border-2 border-dashed border-stone-200 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-3 bg-primary/10 rounded-xl text-primary">
                    <Icon size={28} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-serif font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-2 pt-2">
                      {feature.details.map((detail, idx) => (
                        <li
                          key={`${feature.title}-${idx}`}
                          className="flex items-start gap-2 text-sm text-stone-600"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
