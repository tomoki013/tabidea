"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/lib/hooks";
import {
  FaFilter,
  FaTimes,
  FaCalendarAlt,
  FaTag,
  FaMapMarkerAlt,
  FaGlobe,
  FaPlane,
  FaTrain,
  FaSearch,
} from "react-icons/fa";
import SamplePlanCard from "./SamplePlanCard";
import SamplePlanSkeleton from "./SamplePlanSkeleton";
import {
  SamplePlan,
  getTagsFromPlans,
  getRegionsFromPlans,
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
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const allTags = useMemo(() => getTagsFromPlans(plans), [plans]);
  const allRegions = useMemo(() => getRegionsFromPlans(plans), [plans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Tab Filter
      if (selectedTab === "domestic") {
        if (plan.input.region !== "domestic" && !plan.tags.includes("国内")) return false;
      } else if (selectedTab === "overseas") {
        if (plan.input.region !== "overseas" && !plan.tags.includes("海外")) return false;
      }

      // Search Query Filter
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        const searchTargets = [
          plan.title,
          plan.description,
          ...plan.input.destinations,
          ...plan.tags,
        ].join(" ").toLowerCase();

        if (!searchTargets.includes(query)) return false;
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
  }, [plans, selectedTags, selectedRegions, selectedDays, selectedTab, debouncedSearchQuery]);

  // フィルタリング条件が変わったら表示件数をリセット
  useEffect(() => {
    setDisplayLimit(20);
  }, [filteredPlans]);

  const visiblePlans = useMemo(() => {
    return filteredPlans.slice(0, displayLimit);
  }, [filteredPlans, displayLimit]);

  const handleShowMore = () => {
    setIsLoadingMore(true);
    // スケルトンを表示するための擬似的な遅延
    setTimeout(() => {
      setDisplayLimit((prev) => prev + 20);
      setIsLoadingMore(false);
    }, 600);
  };

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
      {/* Sticky Header (Search & Tabs) */}
      <div className="sticky top-24 md:top-28 z-40">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md border border-stone-200/60 shadow-lg rounded-2xl p-2 flex flex-col md:flex-row gap-3 md:items-center max-w-5xl mx-auto"
        >
          {/* Search Input */}
          <div className="relative flex-1 group w-full">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#e67e22] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワード、目的地、気分で検索..."
              className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-transparent rounded-xl focus:bg-white focus:border-[#e67e22]/50 focus:ring-4 focus:ring-[#e67e22]/10 outline-none transition-all placeholder:text-stone-400 font-medium"
            />
          </div>

          {/* Desktop Divider */}
          <div className="hidden md:block w-px h-10 bg-stone-200" />

          {/* Controls Container */}
          <div className="flex gap-2 items-center w-full md:w-auto">
            {/* Tabs (Scrollable) */}
            <div className="flex-1 min-w-0 overflow-x-auto pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex bg-stone-100 p-1 rounded-xl w-max">
                {(["all", "domestic", "overseas"] as const).map((tab) => (
                  <button
                    key={tab}
                    data-testid={`tab-${tab}`}
                    onClick={() => {
                      setSelectedTab(tab);
                      setSelectedRegions([]);
                    }}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                      ${
                        selectedTab === tab
                          ? "bg-white text-[#e67e22] shadow-sm"
                          : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
                      }
                    `}
                  >
                    {tab === "all" && <FaGlobe />}
                    {tab === "domestic" && <FaTrain />}
                    {tab === "overseas" && <FaPlane />}
                    <span>
                      {tab === "all"
                        ? "すべて"
                        : tab === "domestic"
                        ? "国内"
                        : "海外"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Toggle (Fixed) */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              data-testid="filter-toggle"
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-sm whitespace-nowrap flex-none
                ${
                  isFilterOpen || hasActiveFilters
                    ? "bg-[#e67e22] text-white border-[#e67e22] shadow-md"
                    : "bg-white text-stone-600 border-stone-200 hover:border-[#e67e22] hover:text-[#e67e22]"
                }
              `}
            >
              <FaFilter />
              <span className="hidden sm:inline">絞り込み</span>
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-white rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Filters Modal */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />
            {/* Modal Content */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-white md:rounded-2xl rounded-t-3xl shadow-2xl w-full md:w-[90%] md:max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm p-6 border-b border-stone-100 flex items-center justify-between z-10">
                <h3 className="text-xl font-bold text-[#2c2c2c] flex items-center gap-2">
                  <FaFilter className="text-[#e67e22]" />
                  条件検索
                </h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <FaTimes size={20} className="text-stone-500" />
                </button>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto">
                <div className="flex justify-end">
                  {hasActiveFilters && (
                    <motion.button
                      onClick={clearFilters}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-500 hover:text-white hover:bg-red-500 rounded-lg transition-all border border-stone-200 hover:border-red-500"
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

              {/* Footer / Close Button */}
              <div className="p-4 border-t border-stone-100 sticky bottom-0 bg-white z-10">
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full py-3 bg-[#e67e22] text-white font-bold rounded-xl shadow-md hover:bg-[#d35400] transition-colors"
                >
                  条件を適用して閉じる
                </button>
              </div>
            </motion.div>
          </>
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
            {visiblePlans.map((plan, index) => (
              <SamplePlanCard key={plan.id} plan={plan} index={index} />
            ))}
          </AnimatePresence>
          {/* Skeletons when loading more */}
          {isLoadingMore &&
            Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SamplePlanSkeleton />
              </motion.div>
            ))}
        </div>

        {/* Show More Button */}
        {!isLoadingMore && filteredPlans.length > displayLimit && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleShowMore}
              className="px-8 py-3 bg-white text-stone-600 border border-stone-300 rounded-full font-bold hover:bg-stone-50 hover:border-stone-400 transition-all shadow-sm"
            >
              もっと見る ({filteredPlans.length - displayLimit}件)
            </button>
          </div>
        )}
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
            {debouncedSearchQuery
              ? `「${debouncedSearchQuery}」のプランは見つかりませんでした`
              : "プランが見つかりませんでした"}
          </h3>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">
            {debouncedSearchQuery
              ? "キーワードを変えて、もう一度探してみてください。"
              : "選択した条件に一致する旅のプランがありませんでした。\n条件を少し緩めて、もう一度探してみてください。"}
          </p>
          <motion.button
            onClick={() => {
              clearFilters();
              setSearchQuery("");
              setSelectedTab("all");
            }}
            data-testid="empty-state-clear-filters"
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
