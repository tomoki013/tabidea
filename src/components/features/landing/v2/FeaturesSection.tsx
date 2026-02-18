"use client";

import { motion } from "framer-motion";
import { FaMap, FaCloudDownloadAlt, FaShareAlt, FaCalendarCheck } from "react-icons/fa";

export default function FeaturesSection() {
  const features = [
    {
      icon: <FaMap />,
      title: "ルート最適化",
      desc: "複数のスポットを効率よく回るためのルートを自動で算出します。",
      color: "bg-blue-100 text-blue-600",
      gradient: "from-blue-100"
    },
    {
      icon: <FaCloudDownloadAlt />,
      title: "無制限のプラン保存",
      desc: "作成したプランはいくつでも保存可能。過去の旅も振り返れます。",
      color: "bg-orange-100 text-orange-600",
      gradient: "from-orange-100"
    },
    {
      icon: <FaShareAlt />,
      title: "シェア機能",
      desc: "URL一つで友人や家族にプランを共有。共同編集もスムーズです。",
      color: "bg-pink-100 text-pink-600",
      gradient: "from-pink-100"
    },
    {
      icon: <FaCalendarCheck />,
      title: "スケジュール調整",
      desc: "詳細なタイムスケジュールも自動生成。無理のない計画を立てられます。",
      color: "bg-green-100 text-green-600",
      gradient: "from-green-100"
    }
  ];

  return (
    <section className="w-full py-24 px-4 bg-stone-50 border-t border-stone-200">
      <div className="max-w-6xl mx-auto space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-white border border-stone-200 text-stone-600 text-sm font-bold tracking-wider mb-4 shadow-sm">
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-800">
            旅をサポートする機能
          </h2>
          <p className="text-stone-500 max-w-2xl mx-auto">
            Tabideaには、旅行計画をスムーズにするための機能がたくさん詰まっています。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-8 rounded-3xl bg-white border border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              {/* Hover Background Effect */}
              <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${feature.gradient} to-transparent rounded-full opacity-20 group-hover:opacity-40 transition-opacity blur-2xl`} />

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 ${feature.color} shadow-sm group-hover:scale-110 transition-transform`}>
                {feature.icon}
              </div>

              <h3 className="text-lg font-bold text-stone-800 mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
