"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaCalendarAlt, FaUsers, FaMapMarkerAlt } from "react-icons/fa";
import { SamplePlan, regionTags } from "@/lib/sample-plans";

interface SamplePlanCardProps {
  plan: SamplePlan;
  index: number;
}

// タグの装飾情報
const tagDecorations: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  // 同行者
  家族旅行: { icon: "👨‍👩‍👧‍👦", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  カップル: { icon: "💑", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  友人旅行: { icon: "👫", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  一人旅: { icon: "🚶", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  // 季節
  春: { icon: "🌸", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  夏: { icon: "☀️", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  秋: { icon: "🍁", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  冬: { icon: "❄️", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  通年: { icon: "📅", bg: "bg-stone-50", text: "text-stone-700", border: "border-stone-200" },
  // テーマ
  グルメ: { icon: "🍽️", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  文化体験: { icon: "🏛️", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  アート: { icon: "🎨", bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  ビーチ: { icon: "🏖️", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  リゾート: { icon: "🌴", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  温泉: { icon: "♨️", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  リラックス: { icon: "🧘", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  世界遺産: { icon: "🏰", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  // 地域
  北海道: { icon: "🗻", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  東京: { icon: "🗼", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  神奈川: { icon: "⛩️", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  石川: { icon: "🏯", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  京都: { icon: "⛩️", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  奈良: { icon: "🦌", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  広島: { icon: "🕊️", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  沖縄: { icon: "🌺", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

const defaultTagStyle = {
  icon: "🏷️",
  bg: "bg-stone-50",
  text: "text-stone-600",
  border: "border-stone-200",
};

export default function SamplePlanCard({ plan, index }: SamplePlanCardProps) {
  // 地域タグとその他のタグを分離して表示順序を整理
  const regionTag = plan.tags.find(tag => regionTags.includes(tag));
  const otherTags = plan.tags.filter(tag => !regionTags.includes(tag));
  const displayTags = regionTag ? [regionTag, ...otherTags] : otherTags;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group"
    >
      <Link href={`/samples/${plan.id}`}>
        <div className="h-full bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden transition-shadow duration-300 group-hover:shadow-lg">
          {/* Card Header */}
          <div className="relative p-5 pb-3 border-b border-stone-100">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e67e22] to-[#f39c12]" />
            <h3 className="text-lg font-serif font-bold text-[#2c2c2c] group-hover:text-[#e67e22] transition-colors line-clamp-2">
              {plan.title}
            </h3>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4">
            {/* Description */}
            <p className="text-stone-600 text-sm leading-relaxed line-clamp-3">
              {plan.description}
            </p>

            {/* Plan Info */}
            <div className="flex flex-wrap gap-3 text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <FaMapMarkerAlt className="text-[#e67e22]" />
                <span>{plan.input.destination}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FaCalendarAlt className="text-[#e67e22]" />
                <span>{plan.input.dates}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FaUsers className="text-[#e67e22]" />
                <span>{plan.input.companions}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {displayTags.slice(0, 4).map((tag, tagIndex) => {
                const decoration = tagDecorations[tag] || defaultTagStyle;
                return (
                  <span
                    key={tagIndex}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border ${decoration.bg} ${decoration.text} ${decoration.border}`}
                  >
                    <span className="text-sm">{decoration.icon}</span>
                    <span>{tag}</span>
                  </span>
                );
              })}
              {displayTags.length > 4 && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg bg-stone-100 text-stone-500 border border-stone-200">
                  +{displayTags.length - 4}
                </span>
              )}
            </div>
          </div>

          {/* Card Footer */}
          <div className="px-5 py-3 bg-stone-50 border-t border-stone-100">
            <span className="text-sm font-bold text-[#e67e22] group-hover:underline">
              詳細を見る &rarr;
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
