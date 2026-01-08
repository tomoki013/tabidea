"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaArrowRight, FaMapMarkedAlt, FaMagic, FaPencilAlt } from "react-icons/fa";

export default function UsageGuideHero() {
  return (
    <section className="w-full py-24 px-4 bg-[#fcfbf9] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-sm font-bold tracking-wide border border-orange-100">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                HOW TO USE
              </div>
              <h2 className="text-3xl sm:text-5xl font-serif font-bold text-foreground leading-tight">
                使い方は、<br />
                とてもシンプル。
              </h2>
              <p className="text-lg text-muted-foreground font-hand leading-relaxed">
                行き先を決めて、AIと話すだけ。<br />
                あなたのわがままを、素敵な旅のプランに変えましょう。
              </p>
            </div>

            <div className="space-y-6">
              {[
                { icon: FaMapMarkedAlt, text: "行き先と日程を入力" },
                { icon: FaMagic, text: "AIがプランを自動生成" },
                { icon: FaPencilAlt, text: "自由にカスタマイズ" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-white border-2 border-dashed border-stone-200 flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300 shadow-sm">
                    <item.icon size={20} />
                  </div>
                  <span className="text-lg font-bold text-stone-700">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/usage"
                className="inline-flex items-center gap-2 text-primary font-bold border-b-2 border-primary/30 hover:border-primary transition-colors pb-0.5 group"
              >
                <span>詳しい使い方を見る</span>
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Right Visual (Abstract representation of the UI or concept) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative aspect-square md:aspect-[4/3] rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden rotate-2 hover:rotate-0 transition-transform duration-700 ease-out-back">
              <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-20" />
              {/* Abstract UI composition */}
              <div className="absolute inset-0 p-8 flex flex-col gap-4">
                <div className="h-8 w-1/3 bg-stone-100 rounded-lg animate-pulse" />
                <div className="h-4 w-2/3 bg-stone-50 rounded-lg" />
                <div className="flex-1 bg-orange-50/30 rounded-2xl border-2 border-dashed border-orange-100 p-6 flex flex-col gap-4 justify-center items-center">
                   <FaMagic className="text-4xl text-orange-200" />
                   <p className="font-hand text-stone-400 text-center">AI is writing your plan...</p>
                </div>
                <div className="h-12 w-full bg-primary/10 rounded-xl" />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
