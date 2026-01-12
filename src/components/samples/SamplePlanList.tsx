"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaFilter, FaTimes } from "react-icons/fa";
import SamplePlanCard from "./SamplePlanCard";
import { SamplePlan, getAllTags, getDays } from "@/lib/sample-plans";

interface SamplePlanListProps {
  plans: SamplePlan[];
}

const dayOptions = [
  { value: null, label: "すべて" },
  { value: 2, label: "1泊2日" },
  { value: 3, label: "2泊3日" },
  { value: 4, label: "3泊4日" },
  { value: 5, label: "4泊5日以上" },
];

export default function SamplePlanList({ plans }: SamplePlanListProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const allTags = useMemo(() => getAllTags(), []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Tag filter
      const tagMatch =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => plan.tags.includes(tag));

      // Days filter
      const days = getDays(plan.input.dates);
      const daysMatch =
        selectedDays === null ||
        (selectedDays === 5 ? days >= 5 : days === selectedDays);

      return tagMatch && daysMatch;
    });
  }, [plans, selectedTags, selectedDays]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedDays(null);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedDays !== null;

  return (
    <div className="space-y-8">
      {/* Filter Toggle Button (Mobile) */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg shadow-sm text-stone-600 hover:bg-stone-50 transition-colors"
        >
          <FaFilter className="text-[#e67e22]" />
          <span className="font-medium">絞り込み</span>
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-[#e67e22] text-white rounded-full">
              {selectedTags.length + (selectedDays !== null ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {(isFilterOpen || typeof window !== "undefined") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`${isFilterOpen ? "block" : "hidden lg:block"}`}
          >
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2c2c2c] flex items-center gap-2">
                  <FaFilter className="text-[#e67e22]" />
                  絞り込み
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-sm text-stone-500 hover:text-[#e67e22] transition-colors"
                  >
                    <FaTimes />
                    クリア
                  </button>
                )}
              </div>

              {/* Days Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-600">日数</h4>
                <div className="flex flex-wrap gap-2">
                  {dayOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setSelectedDays(option.value)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        selectedDays === option.value
                          ? "bg-[#e67e22] text-white border-[#e67e22]"
                          : "bg-white text-stone-600 border-stone-200 hover:border-[#e67e22] hover:text-[#e67e22]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-600">タグ</h4>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        selectedTags.includes(tag)
                          ? "bg-[#e67e22] text-white border-[#e67e22]"
                          : "bg-white text-stone-600 border-stone-200 hover:border-[#e67e22] hover:text-[#e67e22]"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="text-stone-600">
        <span className="font-bold text-[#e67e22]">{filteredPlans.length}</span>{" "}
        件のプランが見つかりました
      </div>

      {/* Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPlans.map((plan, index) => (
            <SamplePlanCard key={plan.id} plan={plan} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredPlans.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-stone-500 text-lg">
            条件に一致するプランが見つかりませんでした。
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 px-6 py-2 bg-[#e67e22] text-white rounded-full font-bold hover:bg-[#d35400] transition-colors"
          >
            フィルタをクリア
          </button>
        </motion.div>
      )}
    </div>
  );
}
