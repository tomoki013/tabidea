"use client";

import { motion } from "framer-motion";
import { FaPen, FaRobot, FaSuitcase, FaMapMarkedAlt } from "react-icons/fa";
import { Tape } from "@/components/ui/journal";

export default function HowItWorksSection() {
  const steps = [
    {
      id: "01",
      title: "Input",
      subtitle: "まずは、思いつくままに",
      desc: "「京都で紅葉が見たい」「美味しい抹茶スイーツが食べたい」。そんな漠然とした希望でOK。予算や日数も自由に設定できます。",
      image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=500&q=80",
      icon: <FaPen className="text-white" />,
      color: "bg-orange-400"
    },
    {
      id: "02",
      title: "Proposal",
      subtitle: "AIが数秒でプランを提案",
      desc: "あなたの好みに合わせて、AIが最適なルートとスポットを提案します。移動時間や混雑状況も考慮した、実現可能なプランです。",
      image: "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=500&q=80",
      icon: <FaMapMarkedAlt className="text-white" />,
      color: "bg-blue-400"
    },
    {
      id: "03",
      title: "Go",
      subtitle: "あなただけのしおりを持って",
      desc: "気になったスポットを追加・削除してプランを保存。スマホ一つで持ち歩ける「旅のしおり」の完成です。友達への共有もURL一つで。",
      image: "https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=500&q=80",
      icon: <FaSuitcase className="text-white" />,
      color: "bg-green-400"
    }
  ];

  return (
    <section className="w-full py-24 px-4 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-[#fcfbf9] to-white z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px] opacity-30 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 space-y-4"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-sm font-bold tracking-wider mb-4 shadow-sm">
            How It Works
          </span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800">
            使い方は、とてもシンプル。
          </h2>
          <p className="text-stone-500 mt-4">
            3つのステップで、あなたの旅が始まります。
          </p>
        </motion.div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-stone-200 -translate-x-1/2 hidden md:block" />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col md:flex-row gap-8 md:gap-16 items-center ${
                  index % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Image Side */}
                <div className="flex-1 w-full max-w-md relative group">
                   {/* Frame */}
                   <div className="absolute inset-0 bg-stone-800 rounded-sm translate-x-2 translate-y-2 -z-10 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform duration-300" />
                   <div className="relative bg-white p-2 border border-stone-200 shadow-lg rounded-sm overflow-hidden aspect-[4/3]">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <Tape
                        color={index % 2 === 0 ? "yellow" : "blue"}
                        position="top-center"
                        className="w-24 -top-3 opacity-90"
                      />
                   </div>

                   {/* Step Number Badge (Mobile) */}
                   <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full ${step.color} text-white flex items-center justify-center font-bold text-xl shadow-lg md:hidden z-20`}>
                      {step.id}
                   </div>
                </div>

                {/* Timeline Center Point (Desktop) */}
                <div className="hidden md:flex flex-col items-center justify-center relative z-10 w-12">
                   <div className={`w-12 h-12 rounded-full ${step.color} text-white flex items-center justify-center text-xl shadow-lg border-4 border-white`}>
                      {step.icon}
                   </div>
                </div>

                {/* Text Side */}
                <div className="flex-1 w-full text-center md:text-left space-y-4 px-4 md:px-0">
                   <div className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-500 font-bold text-xs tracking-wider mb-2">
                      STEP {step.id}
                   </div>
                   <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-800">
                      {step.subtitle}
                   </h3>
                   <p className="text-stone-600 leading-relaxed">
                      {step.desc}
                   </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
