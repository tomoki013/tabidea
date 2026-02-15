"use client";

import { motion } from "framer-motion";
import { FaCompass, FaMapMarkedAlt, FaPencilAlt } from "react-icons/fa";
import { JournalSheet, Tape, HandwrittenText, Stamp } from "@/components/ui/journal";

const features = [
  {
    icon: FaCompass,
    title: "あなただけのガイド",
    description: "AIがあなたの好みを理解し、世界に一つだけのプランを提案します。",
    delay: 0.1,
    tape: "pink",
    rotation: "-rotate-1"
  },
  {
    icon: FaMapMarkedAlt,
    title: "未知の場所へ",
    description: "ガイドブックには載っていない、隠れた名所を見つけましょう。",
    delay: 0.2,
    tape: "blue",
    rotation: "rotate-2"
  },
  {
    icon: FaPencilAlt,
    title: "物語を編集する",
    description: "提案されたプランは自由自在。あなたの旅の物語を完成させてください。",
    delay: 0.3,
    tape: "green",
    rotation: "-rotate-2"
  },
];

export default function FeatureSection() {
  return (
    <section className="w-full py-20 px-4 border-t border-dashed border-stone-200 relative overflow-hidden">
       {/* Background */}
       <div className="absolute inset-0 bg-[#f7f5f0]" />
       <div className="absolute inset-0 opacity-[0.4] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] mix-blend-multiply" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: feature.delay }}
              className={`flex flex-col h-full ${feature.rotation} hover:rotate-0 transition-transform duration-300`}
            >
              <JournalSheet className="h-full flex flex-col items-center gap-4 pt-10 pb-8 px-6 text-center relative hover:shadow-lg transition-shadow bg-white">
                <Tape color={feature.tape as "yellow" | "pink" | "blue" | "green" | "white" | "red"} position="top-center" className="w-24 -top-4 opacity-90" />

                <div className="p-4 bg-stone-100 rounded-full text-stone-600 border-2 border-stone-200 border-dashed mb-2 group-hover:scale-110 transition-transform">
                  <feature.icon size={28} />
                </div>

                <HandwrittenText tag="h3" className="text-xl font-bold text-stone-800 border-b border-stone-200 pb-2 w-full">
                  {feature.title}
                </HandwrittenText>

                <p className="text-stone-600 leading-relaxed font-hand text-sm flex-1">
                  {feature.description}
                </p>

                {/* Decorative corner stamp opacity */}
                <div className="absolute bottom-2 right-2 opacity-10 rotate-[-15deg] pointer-events-none">
                   <Stamp color="black" size="sm" className="w-12 h-12 text-[0.5rem] border-2">TABIDEA</Stamp>
                </div>
              </JournalSheet>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
