"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaRegLightbulb, FaShieldAlt, FaQuestionCircle, FaTools } from "react-icons/fa";
import { faqCategories, type FAQCategory } from "@/lib/data/faq";

// Map category IDs to icons for a richer UI
const iconMap: Record<string, React.ElementType> = {
  service: FaQuestionCircle,
  planning: FaMapMarkerAlt,
  trouble: FaTools,
  security: FaShieldAlt,
  others: FaRegLightbulb,
};

export default function FAQCategoryList() {
  // Track open state per question uniquely across all categories
  // Format: `${categoryId}-${itemIndex}`
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-16 pb-24">
      {faqCategories.map((category) => {
        const Icon = iconMap[category.id] || FaQuestionCircle;

        return (
          <div key={category.id} className="scroll-mt-24" id={category.id}>
            {/* Category Header */}
            <div className="flex items-center gap-4 mb-8 border-b-2 border-[#e67e22]/20 pb-4">
              <div className="w-12 h-12 rounded-full bg-[#fcfbf9] border-2 border-[#e67e22] flex items-center justify-center text-[#e67e22] shadow-sm">
                <Icon className="text-xl" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2c2c2c]">
                {category.title}
              </h2>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {category.items.map((item, index) => {
                const uniqueId = `${category.id}-${index}`;
                const isOpen = openId === uniqueId;

                return (
                  <div
                    key={index}
                    className="bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
                  >
                    <button
                      onClick={() => toggleAccordion(uniqueId)}
                      className="w-full flex items-start md:items-center justify-between p-5 md:p-6 text-left hover:bg-[#fffdfa] transition-colors gap-4"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e67e22]/10 text-[#e67e22] flex items-center justify-center font-serif font-bold text-sm mt-0.5 md:mt-0">
                          Q
                        </span>
                        <span className="font-bold text-lg text-[#2c2c2c] group-hover:text-[#e67e22] transition-colors leading-snug">
                          {item.q}
                        </span>
                      </div>
                      <span className="flex-shrink-0 mt-1 md:mt-0">
                        {isOpen ? (
                          <FaChevronUp className="text-[#e67e22]" />
                        ) : (
                          <FaChevronDown className="text-stone-400 group-hover:text-[#e67e22] transition-colors" />
                        )}
                      </span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? "auto" : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 pl-[4.5rem] md:pl-20 pr-6 text-stone-600 leading-relaxed border-t border-dashed border-stone-100 bg-[#fffdfa]">
                        <div className="flex gap-4">
                          <span className="flex-shrink-0 font-serif font-bold text-[#27ae60] mt-1">A.</span>
                          <span className="whitespace-pre-wrap">{item.a}</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
