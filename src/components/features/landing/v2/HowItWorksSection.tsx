"use client";

import { motion } from "framer-motion";
import { FaPen, FaRobot, FaSuitcase } from "react-icons/fa";

export default function HowItWorksSection() {
  const steps = [
    {
      icon: <FaPen />,
      title: "1. 入力",
      desc: "行きたい場所、日数、予算などを入力します。曖昧なイメージでも大丈夫です。",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: <FaRobot />,
      title: "2. 提案",
      desc: "AIが数秒であなたにぴったりの旅行プランを作成し、地図上にルートを描きます。",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: <FaSuitcase />,
      title: "3. 出発",
      desc: "気になったスポットを追加・削除してプランを保存。旅のしおりとして持ち歩けます。",
      color: "bg-green-100 text-green-600"
    }
  ];

  return (
    <section className="w-full py-24 px-4 bg-stone-50 border-y border-stone-200">
      <div className="max-w-6xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-white border border-stone-200 text-stone-600 text-sm font-bold tracking-wider mb-4">
            How It Works
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800">
            使い方は、とてもシンプル。
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-stone-200 -z-10 translate-y-4" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center text-center space-y-6 relative"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${step.color} shadow-sm transform rotate-3`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-stone-800">{step.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
