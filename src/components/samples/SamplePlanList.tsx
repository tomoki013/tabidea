"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaTag,
  FaMapMarkerAlt,
} from "react-icons/fa";
import SamplePlanCard from "./SamplePlanCard";
import {
  SamplePlan,
  getAllTags,
  getAllRegions,
  getDays,
} from "@/lib/sample-plans";

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

// タグカテゴリ定義
type TagCategory = "companion" | "season" | "theme";

interface TagInfo {
  category: TagCategory;
  icon: string;
  color: string;
}

const tagCategoryMap: Record<string, TagInfo> = {
  // 同行者
  家族旅行: { category: "companion", icon: "👨‍👩‍👧‍👦", color: "blue" },
  カップル: { category: "companion", icon: "💑", color: "pink" },
  友人旅行: { category: "companion", icon: "👫", color: "purple" },
  一人旅: { category: "companion", icon: "🚶", color: "indigo" },
  // 季節
  春: { category: "season", icon: "🌸", color: "pink" },
  夏: { category: "season", icon: "☀️", color: "orange" },
  秋: { category: "season", icon: "🍁", color: "amber" },
  冬: { category: "season", icon: "❄️", color: "cyan" },
  通年: { category: "season", icon: "📅", color: "gray" },
  // テーマ
  グルメ: { category: "theme", icon: "🍽️", color: "red" },
  文化体験: { category: "theme", icon: "🏛️", color: "violet" },
  アート: { category: "theme", icon: "🎨", color: "fuchsia" },
  ビーチ: { category: "theme", icon: "🏖️", color: "cyan" },
  リゾート: { category: "theme", icon: "🌴", color: "emerald" },
  温泉: { category: "theme", icon: "♨️", color: "rose" },
  リラックス: { category: "theme", icon: "🧘", color: "teal" },
  世界遺産: { category: "theme", icon: "🏰", color: "amber" },
};

const colorStyles: Record<
  string,
  { bg: string; border: string; text: string; activeBg: string }
> = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    activeBg: "bg-blue-500",
  },
  pink: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    activeBg: "bg-pink-500",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    activeBg: "bg-purple-500",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    activeBg: "bg-indigo-500",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    activeBg: "bg-orange-500",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    activeBg: "bg-amber-500",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-700",
    activeBg: "bg-cyan-500",
  },
  gray: {
    bg: "bg-stone-50",
    border: "border-stone-200",
    text: "text-stone-700",
    activeBg: "bg-stone-500",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    activeBg: "bg-red-500",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    activeBg: "bg-violet-500",
  },
  fuchsia: {
    bg: "bg-fuchsia-50",
    border: "border-fuchsia-200",
    text: "text-fuchsia-700",
    activeBg: "bg-fuchsia-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    activeBg: "bg-emerald-500",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    activeBg: "bg-rose-500",
  },
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    activeBg: "bg-teal-500",
  },
};

// 地域のアイコンマップ
const regionIconMap: Record<string, string> = {
  北海道: "🗻",
  東京: "🗼",
  神奈川: "⛩️",
  石川: "🏯",
  京都: "⛩️",
  奈良: "🦌",
  広島: "🕊️",
  沖縄: "🌺",
};

export default function SamplePlanList({ plans }: SamplePlanListProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const allTags = useMemo(() => getAllTags(), []);
  const allRegions = useMemo(() => getAllRegions(), []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Tag filter（地域タグを除く）
      const tagMatch =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => plan.tags.includes(tag));

      // Region filter
      const regionMatch =
        selectedRegions.length === 0 ||
        selectedRegions.some((region) => plan.tags.includes(region));

      // Days filter
      const days = getDays(plan.input.dates);
      const daysMatch =
        selectedDays === null ||
        (selectedDays === 5 ? days >= 5 : days === selectedDays);

      return tagMatch && regionMatch && daysMatch;
    });
  }, [plans, selectedTags, selectedRegions, selectedDays]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedRegions([]);
    setSelectedDays(null);
  };

  const hasActiveFilters =
    selectedTags.length > 0 ||
    selectedRegions.length > 0 ||
    selectedDays !== null;

  const activeFilterCount =
    selectedTags.length +
    selectedRegions.length +
    (selectedDays !== null ? 1 : 0);

  // タグをカテゴリ別に分類
  const categorizedTags = useMemo(() => {
    const companions: string[] = [];
    const seasons: string[] = [];
    const themes: string[] = [];

    allTags.forEach((tag) => {
      const info = tagCategoryMap[tag];
      if (info) {
        switch (info.category) {
          case "companion":
            companions.push(tag);
            break;
          case "season":
            seasons.push(tag);
            break;
          case "theme":
            themes.push(tag);
            break;
        }
      }
    });

    return { companions, seasons, themes };
  }, [allTags]);

  const renderTagButton = (tag: string, isSelected: boolean) => {
    const info = tagCategoryMap[tag];
    const colorStyle = info ? colorStyles[info.color] : colorStyles.gray;

    return (
      <motion.button
        key={tag}
        onClick={() => toggleTag(tag)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all
          ${
            isSelected
              ? `${colorStyle.activeBg} text-white border-transparent shadow-md`
              : `${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} hover:shadow-sm`
          }
        `}
      >
        {info && <span className="text-base">{info.icon}</span>}
        <span className="font-medium">{tag}</span>
      </motion.button>
    );
  };

  const renderRegionButton = (region: string, isSelected: boolean) => {
    const icon = regionIconMap[region] || "📍";

    return (
      <motion.button
        key={region}
        onClick={() => toggleRegion(region)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all
          ${
            isSelected
              ? "bg-[#e67e22] text-white border-transparent shadow-md"
              : "bg-white text-stone-600 border-stone-200 hover:border-[#e67e22] hover:text-[#e67e22] hover:shadow-sm"
          }
        `}
      >
        <span className="text-base">{icon}</span>
        <span className="font-medium">{region}</span>
      </motion.button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Filter Toggle Button (Mobile) */}
      <div className="lg:hidden">
        <motion.button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-stone-200 rounded-xl shadow-sm text-stone-600 hover:bg-stone-50 transition-colors w-full justify-center"
        >
          <FaFilter className="text-[#e67e22]" />
          <span className="font-bold">絞り込み</span>
          {hasActiveFilters && (
            <span className="ml-2 px-2.5 py-0.5 text-xs font-bold bg-[#e67e22] text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
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
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2c2c2c] flex items-center gap-2">
                  <FaFilter className="text-[#e67e22]" />
                  絞り込み検索
                </h3>
                {hasActiveFilters && (
                  <motion.button
                    onClick={clearFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-500 hover:text-white hover:bg-red-500 rounded-lg transition-all"
                  >
                    <FaTimes />
                    <span className="font-medium">すべてクリア</span>
                  </motion.button>
                )}
              </div>

              {/* Region Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#e67e22]" />
                  エリア
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allRegions.map((region) =>
                    renderRegionButton(region, selectedRegions.includes(region))
                  )}
                </div>
              </div>

              {/* Days Filter */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <FaCalendarAlt className="text-[#e67e22]" />
                  日数
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dayOptions.map((option) => (
                    <motion.button
                      key={option.label}
                      onClick={() => setSelectedDays(option.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-2 text-sm rounded-xl border font-medium transition-all ${
                        selectedDays === option.value
                          ? "bg-[#e67e22] text-white border-[#e67e22] shadow-md"
                          : "bg-white text-stone-600 border-stone-200 hover:border-[#e67e22] hover:text-[#e67e22]"
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tag Filters */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <FaTag className="text-[#e67e22]" />
                  タグで絞り込み
                </h4>

                {/* 同行者 */}
                {categorizedTags.companions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      同行者
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categorizedTags.companions.map((tag) =>
                        renderTagButton(tag, selectedTags.includes(tag))
                      )}
                    </div>
                  </div>
                )}

                {/* 季節 */}
                {categorizedTags.seasons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      おすすめの季節
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categorizedTags.seasons.map((tag) =>
                        renderTagButton(tag, selectedTags.includes(tag))
                      )}
                    </div>
                  </div>
                )}

                {/* テーマ */}
                {categorizedTags.themes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      旅のテーマ
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {categorizedTags.themes.map((tag) =>
                        renderTagButton(tag, selectedTags.includes(tag))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-sm text-stone-500 font-medium">
            選択中のフィルタ:
          </span>
          {selectedRegions.map((region) => (
            <motion.button
              key={`active-${region}`}
              onClick={() => toggleRegion(region)}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-[#e67e22]/10 text-[#e67e22] border border-[#e67e22]/30 hover:bg-[#e67e22]/20"
            >
              {regionIconMap[region] || "📍"} {region}
              <FaTimes className="ml-1 opacity-60" />
            </motion.button>
          ))}
          {selectedDays !== null && (
            <motion.button
              onClick={() => setSelectedDays(null)}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-[#e67e22]/10 text-[#e67e22] border border-[#e67e22]/30 hover:bg-[#e67e22]/20"
            >
              📅 {dayOptions.find((d) => d.value === selectedDays)?.label}
              <FaTimes className="ml-1 opacity-60" />
            </motion.button>
          )}
          {selectedTags.map((tag) => {
            const info = tagCategoryMap[tag];
            return (
              <motion.button
                key={`active-${tag}`}
                onClick={() => toggleTag(tag)}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-[#e67e22]/10 text-[#e67e22] border border-[#e67e22]/30 hover:bg-[#e67e22]/20"
              >
                {info?.icon} {tag}
                <FaTimes className="ml-1 opacity-60" />
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Results Count */}
      <div className="text-stone-600 flex items-center gap-2">
        <span className="text-2xl font-bold text-[#e67e22]">
          {filteredPlans.length}
        </span>
        <span>件のプランが見つかりました</span>
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-white rounded-2xl border border-stone-200"
        >
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-stone-500 text-lg mb-2">
            条件に一致するプランが見つかりませんでした
          </p>
          <p className="text-stone-400 text-sm mb-6">
            フィルタ条件を変更してみてください
          </p>
          <motion.button
            onClick={clearFilters}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-[#e67e22] text-white rounded-xl font-bold hover:bg-[#d35400] transition-colors shadow-lg"
          >
            フィルタをクリア
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
