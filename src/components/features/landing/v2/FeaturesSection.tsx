"use client";

import { motion } from "framer-motion";
import { FaMap, FaCloudDownloadAlt, FaShareAlt, FaCalendarCheck } from "react-icons/fa";

export default function FeaturesSection() {
  const features = [
    {
      icon: <FaMap />,
      title: "ルート最適化",
      desc: "複数のスポットを効率よく回るためのルートを自動で算出します。"
    },
    {
      icon: <FaCloudDownloadAlt />,
      title: "無制限のプラン保存",
      desc: "作成したプランはいくつでも保存可能。過去の旅も振り返れます。"
    },
    {
      icon: <FaShareAlt />,
      title: "シェア機能",
      desc: "URL一つで友人や家族にプランを共有。共同編集もスムーズです。"
    },
    {
      icon: <FaCalendarCheck />,
      title: "スケジュール調整",
      desc: "詳細なタイムスケジュールも自動生成。無理のない計画を立てられます。"
    }
  ];

  return (
    <section className="w-full py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 text-sm font-bold tracking-wider mb-4">
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800">
            旅をサポートする機能
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-8 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-white hover:shadow-md transition-all duration-300"
            >
              <div className="text-3xl text-primary mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-stone-800 mb-3">{feature.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
