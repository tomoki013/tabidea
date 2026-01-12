"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FaCalendarAlt, FaUsers, FaMapMarkerAlt } from "react-icons/fa";
import { SamplePlan } from "@/lib/sample-plans";

interface SamplePlanCardProps {
  plan: SamplePlan;
  index: number;
}

export default function SamplePlanCard({ plan, index }: SamplePlanCardProps) {
  return (
    <motion.div
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
            <div className="flex flex-wrap gap-2">
              {plan.tags.slice(0, 4).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-[#e67e22]/10 text-[#e67e22] border border-[#e67e22]/20"
                >
                  {tag}
                </span>
              ))}
              {plan.tags.length > 4 && (
                <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-stone-100 text-stone-500">
                  +{plan.tags.length - 4}
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
