"use client";

import { useState } from "react";
import {
  FaMapMarkerAlt,
  FaRegLightbulb,
  FaShieldAlt,
  FaQuestionCircle,
  FaTools,
} from "react-icons/fa";
import { faqCategories } from "@/lib/data/faq";
import FAQCard from "./FAQCard";

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
                  <FAQCard
                    key={index}
                    question={item.q}
                    answer={item.a}
                    isOpen={isOpen}
                    onClick={() => toggleAccordion(uniqueId)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
