"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { JournalSheet, Tape, HandwrittenText, JournalButton } from "@/components/ui/journal";

export default function ExampleSection() {
  const t = useTranslations("components.features.landing.exampleSection");
  const examples = [
    {
      location: t("examples.0.location"),
      theme: t("examples.0.theme"),
      note: t("examples.0.note"),
      tapeColor: "green",
      rotate: "rotate-1",
    },
    {
      location: t("examples.1.location"),
      theme: t("examples.1.theme"),
      note: t("examples.1.note"),
      tapeColor: "blue",
      rotate: "-rotate-1",
    },
    {
      location: t("examples.2.location"),
      theme: t("examples.2.theme"),
      note: t("examples.2.note"),
      tapeColor: "yellow",
      rotate: "rotate-2",
    },
  ];

  return (
    <section className="w-full py-24 px-4 border-t border-dashed border-stone-200 relative overflow-hidden bg-[#fcfbf9]">
       {/* Background Pattern */}
       <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        <div className="text-center space-y-4">
          <HandwrittenText tag="h2" className="text-3xl sm:text-4xl font-bold text-stone-800">
            {t("title")}
          </HandwrittenText>
          <p className="text-stone-500 font-hand text-lg">
            {t("lead")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {examples.map((ex, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`h-full ${ex.rotate} hover:rotate-0 transition-transform duration-300`}
            >
              <JournalSheet className="h-full relative pt-10 pb-6 px-6 bg-white hover:shadow-xl transition-all border-l-0">
                 <Tape color={ex.tapeColor as "yellow" | "pink" | "blue" | "green" | "white" | "red"} position="top-center" className="opacity-90 w-24" />

                <div className="flex justify-between items-baseline mb-4 border-b-2 border-stone-100 border-dashed pb-2">
                  <h3 className="text-2xl font-serif font-bold text-stone-800">
                    {ex.location}
                  </h3>
                  <span className="text-xs font-bold font-sans uppercase tracking-wider text-stone-400">
                    {ex.theme}
                  </span>
                </div>
                <HandwrittenText className="text-stone-700 leading-relaxed text-lg">
                  &quot;{ex.note}&quot;
                </HandwrittenText>
              </JournalSheet>
            </motion.div>
          ))}
        </div>

        {/* CTA to Sample Plans Page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <div className="inline-block relative">
            <div className="mb-3 font-hand text-stone-600 text-base">
              {t("ctaPrompt")}
            </div>
            <Link href="/samples">
              <JournalButton variant="outline" size="lg" className="border-primary/50 text-primary hover:bg-primary/5">
                 {t("ctaButton")}
                 <span className="ml-2 font-hand">→</span>
              </JournalButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
