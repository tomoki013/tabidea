"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaTag,
  FaMapMarkerAlt,
  FaGlobe,
  FaPlane,
  FaTrain,
} from "react-icons/fa";
import SamplePlanCard from "./SamplePlanCard";
import {
  SamplePlan,
  getAllTags,
  getAllRegions,
  getDays,
  getAreaFromRegion,
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
  自然: { category: "theme", icon: "🌲", color: "green" },
  絶景: { category: "theme", icon: "🏞️", color: "cyan" },
  ショッピング: { category: "theme", icon: "🛍️", color: "pink" },
  エンターテイメント: { category: "theme", icon: "🎡", color: "orange" },
  夜景: { category: "theme", icon: "🌃", color: "indigo" },
  街歩き: { category: "theme", icon: "🚶‍♀️", color: "gray" },
  歴史: { category: "theme", icon: "📜", color: "amber" },
  冒険: { category: "theme", icon: "🤠", color: "orange" },
  鉄道: { category: "theme", icon: "🚂", color: "slate" },
  写真: { category: "theme", icon: "📷", color: "teal" },
  動物: { category: "theme", icon: "🐨", color: "green" },
  スポーツ: { category: "theme", icon: "⚽", color: "red" },
  ダイビング: { category: "theme", icon: "🤿", color: "blue" },
  クルーズ: { category: "theme", icon: "🚢", color: "sky" },
  秘境: { category: "theme", icon: "🏜️", color: "amber" },
  建築: { category: "theme", icon: "🏛️", color: "gray" },
  雑貨: { category: "theme", icon: "🧺", color: "orange" },
  おしゃれ: { category: "theme", icon: "👗", color: "pink" },
  ドライブ: { category: "theme", icon: "🚗", color: "sky" },
  山: { category: "theme", icon: "⛰️", color: "green" },
  城めぐり: { category: "theme", icon: "🏰", color: "amber" },
  テーマパーク: { category: "theme", icon: "🎢", color: "purple" },
  子供: { category: "theme", icon: "👶", color: "orange" },
  屋台: { category: "theme", icon: "🍜", color: "red" },
  神社仏閣: { category: "theme", icon: "⛩️", color: "red" },
  初夏: { category: "season", icon: "🍃", color: "green" },
  離島: { category: "theme", icon: "🏝️", color: "cyan" },
  フォトジェニック: { category: "theme", icon: "📸", color: "pink" },
  北米: { category: "theme", icon: "🌎", color: "blue" },
  南米: { category: "theme", icon: "🌎", color: "green" },
  アジア: { category: "theme", icon: "🌏", color: "red" },
  ヨーロッパ: { category: "theme", icon: "🌍", color: "blue" },
  アフリカ: { category: "theme", icon: "🌍", color: "orange" },
  オセアニア: { category: "theme", icon: "🌏", color: "cyan" },
  中東: { category: "theme", icon: "🕌", color: "amber" },
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
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    activeBg: "bg-green-500",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    activeBg: "bg-sky-500",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    activeBg: "bg-slate-500",
  },
};

// 地域のアイコンマップ
const regionIconMap: Record<string, string> = {
  北海道: "🗻",
  東京: "🗼",
  神奈川: "⛩️",
  栃木: "🙈",
  山梨: "🗻",
  石川: "🏯",
  京都: "⛩️",
  奈良: "🦌",
  広島: "🕊️",
  沖縄: "🌺",
  ハワイ: "🌺",
  アメリカ: "🇺🇸",
  カナダ: "🇨🇦",
  メキシコ: "🇲🇽",
  ペルー: "🇵🇪",
  フランス: "🇫🇷",
  イギリス: "🇬🇧",
  ドイツ: "🇩🇪",
  イタリア: "🇮🇹",
  スペイン: "🇪🇸",
  オーストリア: "🇦🇹",
  オランダ: "🇳🇱",
  スイス: "🇨🇭",
  ポルトガル: "🇵🇹",
  クロアチア: "🇭🇷",
  フィンランド: "🇫🇮",
  ギリシャ: "🇬🇷",
  トルコ: "🇹🇷",
  台湾: "🇹🇼",
  韓国: "🇰🇷",
  香港: "🇭🇰",
  中国: "🇨🇳",
  タイ: "🇹🇭",
  ベトナム: "🇻🇳",
  フィリピン: "🇵🇭",
  マレーシア: "🇲🇾",
  シンガポール: "🇸🇬",
  インドネシア: "🇮🇩",
  モルディブ: "🇲🇻",
  カンボジア: "🇰🇭",
  インド: "🇮🇳",
  ネパール: "🇳🇵",
  ラオス: "🇱🇦",
  ミャンマー: "🇲🇲",
  スリランカ: "🇱🇰",
  オーストラリア: "🇦🇺",
  ニュージーランド: "🇳🇿",
  フィジー: "🇫🇯",
  タヒチ: "🏝️",
  ニューカレドニア: "🇳🇨",
  パラオ: "🇵🇼",
  UAE: "🇦🇪",
  ヨルダン: "🇯🇴",
  エジプト: "🇪🇬",
  モロッコ: "🇲🇦",
  南アフリカ: "🇿🇦",
  ケニア: "🇰🇪",
  マダガスカル: "🇲🇬",
  チェコ: "🇨🇿",
  ハンガリー: "🇭🇺",
  ベルギー: "🇧🇪",
  マルタ: "🇲🇹",
  アイスランド: "🇮🇸",
  ノルウェー: "🇳🇴",
  スウェーデン: "🇸🇪",
  デンマーク: "🇩🇰",
  アイルランド: "🇮🇪",
  ポーランド: "🇵🇱",
  ボリビア: "🇧🇴",
  ブラジル: "🇧🇷",
  アルゼンチン: "🇦🇷",
  チリ: "🇨🇱",
  キューバ: "🇨🇺",
  ジャマイカ: "🇯🇲",
  岐阜: "🏯",
  香川: "🎨",
  長崎: "⛪",
  鹿児島: "🌲",
  島根: "⛩️",
};

export default function SamplePlanList({ plans }: SamplePlanListProps) {
  const [selectedTab, setSelectedTab] = useState<"all" | "domestic" | "overseas">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const allTags = useMemo(() => getAllTags(), []);
  const allRegions = useMemo(() => getAllRegions(), []);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Tab Filter
      if (selectedTab === "domestic") {
        if (plan.input.region !== "domestic" && !plan.tags.includes("国内")) return false;
      } else if (selectedTab === "overseas") {
        if (plan.input.region !== "overseas" && !plan.tags.includes("海外")) return false;
      }

      // Tag filter
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
  }, [plans, selectedTags, selectedRegions, selectedDays, selectedTab]);

  // Group regions by area for display
  const groupedRegions = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const visibleRegions = allRegions.filter(region => {
      if (selectedTab === "all") return true;
      const area = getAreaFromRegion(region);
      // Determine if domestic based on area
      const domesticAreas = [
        "北海道",
        "東北",
        "関東",
        "甲信越",
        "北陸",
        "東海",
        "関西",
        "中国",
        "四国",
        "九州",
        "沖縄",
      ];
      const isDomestic = domesticAreas.includes(area);
      return selectedTab === "domestic" ? isDomestic : !isDomestic;
    });

    visibleRegions.forEach(region => {
      const area = getAreaFromRegion(region);
      if (!groups[area]) groups[area] = [];
      groups[area].push(region);
    });
    return groups;
  }, [allRegions, selectedTab]);

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
          inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all whitespace-nowrap
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
          inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all whitespace-nowrap
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
      {/* Main Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-stone-100 p-1.5 rounded-2xl">
          {(['all', 'domestic', 'overseas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setSelectedTab(tab); setSelectedRegions([]); }}
              className={`
                px-4 sm:px-8 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2
                ${selectedTab === tab
                  ? 'bg-white text-[#e67e22] shadow-sm'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'}
              `}
            >
              {tab === 'all' && <FaGlobe />}
              {tab === 'domestic' && <FaTrain />}
              {tab === 'overseas' && <FaPlane />}
              <span className="hidden sm:inline">
                {tab === 'all' ? 'すべて' : tab === 'domestic' ? '国内旅行' : '海外旅行'}
              </span>
              <span className="sm:hidden">
                {tab === 'all' ? 'すべて' : tab === 'domestic' ? '国内' : '海外'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toggle Button (Mobile) */}
      <div className="lg:hidden">
        <motion.button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-stone-200 rounded-xl shadow-sm text-stone-600 hover:bg-stone-50 transition-colors w-full justify-center"
        >
          <FaFilter className="text-[#e67e22]" />
          <span className="font-bold">条件を絞り込む</span>
          {hasActiveFilters && (
            <span className="ml-2 px-2.5 py-0.5 text-xs font-bold bg-[#e67e22] text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Filters Area */}
      <AnimatePresence>
        {(isFilterOpen || typeof window !== "undefined") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`${isFilterOpen ? "block" : "hidden lg:block"}`}
          >
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-8">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <h3 className="text-lg font-bold text-[#2c2c2c] flex items-center gap-2">
                  <FaFilter className="text-[#e67e22]" />
                  条件検索
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

              {/* Region Filter (Grouped) */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-[#e67e22]" />
                  エリア
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(groupedRegions).map(([area, regions]) => (
                     regions.length > 0 && (
                      <div key={area} className="space-y-2">
                        <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pl-1">{area}</h5>
                        <div className="flex flex-wrap gap-2">
                          {regions.map(region => renderRegionButton(region, selectedRegions.includes(region)))}
                        </div>
                      </div>
                     )
                  ))}
                </div>
              </div>

              {/* Tag Filters */}
              <div className="space-y-6 pt-4 border-t border-stone-100">
                <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <FaTag className="text-[#e67e22]" />
                  タグ
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Theme */}
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

                  {/* Companion & Season */}
                  <div className="space-y-6">
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
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Summary (Chips) */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 bg-white/50 p-4 rounded-xl border border-stone-200/50 backdrop-blur-sm"
        >
          <span className="text-sm text-stone-500 font-bold mr-2">
            選択中:
          </span>
          {selectedRegions.map((region) => (
            <motion.button
              key={`active-${region}`}
              onClick={() => toggleRegion(region)}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-[#e67e22] text-white shadow-sm hover:bg-[#d35400]"
            >
              {regionIconMap[region] || "📍"} {region}
              <FaTimes className="ml-1 opacity-80" />
            </motion.button>
          ))}
          {selectedDays !== null && (
            <motion.button
              onClick={() => setSelectedDays(null)}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-[#e67e22] text-white shadow-sm hover:bg-[#d35400]"
            >
              📅 {dayOptions.find((d) => d.value === selectedDays)?.label}
              <FaTimes className="ml-1 opacity-80" />
            </motion.button>
          )}
          {selectedTags.map((tag) => {
            const info = tagCategoryMap[tag];
            return (
              <motion.button
                key={`active-${tag}`}
                onClick={() => toggleTag(tag)}
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-stone-700 text-white shadow-sm hover:bg-stone-900"
              >
                {info?.icon} {tag}
                <FaTimes className="ml-1 opacity-80" />
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Results Count & Grid */}
      <div className="space-y-4">
        <div className="flex items-end justify-between border-b border-stone-200 pb-2">
          <div className="text-stone-600 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#e67e22]">
              {filteredPlans.length}
            </span>
            <span className="text-sm font-medium text-stone-500">件のプラン</span>
          </div>
          {/* Optional: Sort order could go here */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredPlans.map((plan, index) => (
              <SamplePlanCard key={plan.id} plan={plan} index={index} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Empty State */}
      {filteredPlans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm"
        >
          <div className="text-7xl mb-6 opacity-80">🗺️</div>
          <h3 className="text-xl font-bold text-stone-700 mb-2">
            プランが見つかりませんでした
          </h3>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">
            選択した条件に一致する旅のプランがありませんでした。<br/>
            条件を少し緩めて、もう一度探してみてください。
          </p>
          <motion.button
            onClick={clearFilters}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-[#e67e22] text-white rounded-xl font-bold hover:bg-[#d35400] transition-colors shadow-lg flex items-center gap-2 mx-auto"
          >
            <FaTimes />
            すべてのフィルタを解除
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
