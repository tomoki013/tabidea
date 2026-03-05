"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HandwrittenText, Tape, Stamp } from "@/components/ui/journal";
import { FaMapMarkedAlt, FaPenFancy, FaRegSmileBeam } from "react-icons/fa";

export default function FeaturesSection() {
  const t = useTranslations("components.features.landing.v2.featuresSection");
  const values = [
    {
      id: "freedom",
      title: t("values.freedom.title"),
      subtitle: t("values.freedom.subtitle"),
      desc: t("values.freedom.desc"),
      image: "https://images.unsplash.com/photo-1512413914633-b5043f4041ea?auto=format&fit=crop&w=500&q=80",
      icon: <FaMapMarkedAlt />,
      rotate: "rotate-2",
      tapeColor: "yellow",
      stamp: t("values.freedom.stamp")
    },
    {
      id: "story",
      title: t("values.story.title"),
      subtitle: t("values.story.subtitle"),
      desc: t("values.story.desc"),
      image: "https://images.unsplash.com/photo-1544367563-12123d8965cd?auto=format&fit=crop&w=500&q=80",
      icon: <FaPenFancy />,
      rotate: "-rotate-1",
      tapeColor: "blue",
      stamp: t("values.story.stamp")
    },
    {
      id: "serendipity",
      title: t("values.serendipity.title"),
      subtitle: t("values.serendipity.subtitle"),
      desc: t("values.serendipity.desc"),
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=80",
      icon: <FaRegSmileBeam />,
      rotate: "rotate-3",
      tapeColor: "red",
      stamp: t("values.serendipity.stamp")
    }
  ];

  return (
    <section className="w-full py-24 px-4 bg-stone-100 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-30 mix-blend-multiply pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 space-y-4"
        >
          <div className="inline-block px-4 py-1.5 bg-white border border-stone-300 shadow-sm rotate-[-2deg]">
            <span className="text-stone-600 font-hand font-bold text-lg tracking-wider">
              {t("badge")}
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800">
            {t("title")}
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto font-medium">
            {t("leadLine1")}<br/>
            {t("leadLine2")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 items-start">
          {values.map((value, index) => (
            <motion.div
              key={value.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              className={`relative bg-white p-6 pb-12 shadow-lg ${value.rotate} transition-transform hover:scale-105 hover:rotate-0 duration-300`}
            >
              {/* Tape Decoration */}
              <Tape
                color={value.tapeColor as "yellow" | "blue" | "red"}
                position="top-center"
                className="-top-4 w-32 opacity-90"
              />

              {/* Image Area */}
              <div className="w-full h-48 bg-stone-200 mb-6 overflow-hidden relative border border-stone-100">
                 <img
                   src={value.image}
                   alt={value.title}
                   className="w-full h-full object-cover sepia-[0.2]"
                 />
                 <div className="absolute bottom-2 right-2 opacity-80 rotate-[-12deg]">
                    <Stamp color={value.tapeColor as "red" | "blue"} size="sm">
                       {value.stamp}
                    </Stamp>
                 </div>
              </div>

              {/* Text Content */}
              <div className="space-y-3 text-center">
                 <div className="flex justify-center text-3xl text-stone-400 mb-2 opacity-50">
                    {value.icon}
                 </div>
                 <h3 className="text-2xl font-serif font-bold text-stone-800">
                    {value.title}
                 </h3>
                 <p className="text-sm font-bold text-primary tracking-wide uppercase">
                    {value.subtitle}
                 </p>
                 <div className="w-12 h-0.5 bg-stone-200 mx-auto my-3" />
                 <p className="text-stone-600 text-sm leading-relaxed font-medium">
                    {value.desc}
                 </p>
              </div>

              {/* Handwriting Note at bottom */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                 <HandwrittenText className="text-stone-400 text-xs">
                    {t("stepLabel", { step: index + 1 })}
                 </HandwrittenText>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Decorative Note */}
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           viewport={{ once: true }}
           transition={{ delay: 0.8 }}
           className="mt-20 text-center"
        >
           <div className="inline-block relative p-6 bg-[#fffdf5] border border-stone-200 shadow-sm rotate-1 max-w-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-stone-300 shadow-inner" /> {/* Pin hole */}
              <p className="font-hand text-lg text-stone-700 leading-relaxed">
                 {t("quoteLine1")}<br/>
                 {t("quoteLine2")}
              </p>
              <div className="mt-2 text-right text-xs font-bold text-stone-400 uppercase tracking-widest">
                 {t("quoteAuthor")}
              </div>
           </div>
        </motion.div>
      </div>
    </section>
  );
}
