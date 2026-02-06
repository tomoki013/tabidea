"use client";

import { useState, useEffect, useCallback, KeyboardEvent, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserInput, TransitInfo } from "@/types";
import { ChevronDown, Check, X, Plus, Minus } from "lucide-react";
import {
  FaUtensils,
  FaLandmark,
  FaMountain,
  FaCoffee,
  FaSearch,
  FaShoppingBag,
  FaPalette,
  FaRunning,
  FaHotTub,
  FaCamera,
  FaCompass,
  FaQuestion,
  FaPlus,
  FaTrash,
  FaPlane,
  FaTrain,
  FaBus,
  FaCar,
  FaShip,
} from "react-icons/fa";

// ============================================================================
// Constants
// ============================================================================

const COMPANION_OPTIONS = [
  { id: "solo", label: "一人旅", icon: "👤" },
  { id: "couple", label: "カップル", icon: "💑" },
  { id: "family", label: "家族", icon: "👨‍👩‍👧‍👦" },
  { id: "friends", label: "友人", icon: "👯" },
  { id: "male_trip", label: "男旅", icon: "🍻" },
  { id: "female_trip", label: "女旅", icon: "💅" },
  { id: "backpacker", label: "バックパッカー", icon: "🎒" },
  { id: "business", label: "ビジネス", icon: "💼" },
  { id: "pet", label: "ペットと", icon: "🐕" },
];

const THEME_OPTIONS = [
  { label: "グルメ", icon: FaUtensils, id: "グルメ" },
  { label: "歴史・文化", icon: FaLandmark, id: "歴史・文化" },
  { label: "自然・絶景", icon: FaMountain, id: "自然・絶景" },
  { label: "リラックス", icon: FaCoffee, id: "リラックス" },
  { label: "穴場スポット", icon: FaSearch, id: "穴場スポット" },
  { label: "ショッピング", icon: FaShoppingBag, id: "ショッピング" },
  { label: "アート", icon: FaPalette, id: "アート" },
  { label: "体験・アクティビティ", icon: FaRunning, id: "体験・アクティビティ" },
  { label: "温泉・サウナ", icon: FaHotTub, id: "温泉・サウナ" },
  { label: "写真映え", icon: FaCamera, id: "写真映え" },
  { label: "冒険", icon: FaCompass, id: "冒険" },
  { label: "その他", icon: FaQuestion, id: "その他" },
];

const BUDGET_PRESETS = [
  { id: "saving", label: "なるべく安く", icon: "💸", desc: "お財布に優しく" },
  { id: "standard", label: "普通", icon: "💰", desc: "一般的な予算" },
  { id: "high", label: "少し贅沢に", icon: "✨", desc: "良いホテル・食事" },
  { id: "luxury", label: "リッチに", icon: "💎", desc: "最高級の体験" },
];

const PACE_OPTIONS = [
  { id: "relaxed", label: "ゆったり", icon: "☕" },
  { id: "balanced", label: "バランスよく", icon: "⚖️" },
  { id: "active", label: "アクティブ", icon: "👟" },
  { id: "packed", label: "詰め込み", icon: "🔥" },
];

const DURATION_OPTIONS = [
  { value: 0, label: "未定" },
  { value: 1, label: "日帰り" },
  { value: 2, label: "1泊2日" },
  { value: 3, label: "2泊3日" },
  { value: 4, label: "3泊4日" },
  { value: 5, label: "4泊5日" },
  { value: 6, label: "5泊6日" },
  { value: 7, label: "6泊7日" },
];

const TRANSPORT_OPTIONS = [
  { id: "flight", label: "飛行機", icon: FaPlane },
  { id: "shinkansen", label: "新幹線", icon: FaTrain },
  { id: "train", label: "電車", icon: FaTrain },
  { id: "bus", label: "バス", icon: FaBus },
  { id: "car", label: "車・レンタカー", icon: FaCar },
  { id: "ferry", label: "フェリー", icon: FaShip },
];

const BUDGET_CONFIG = {
  domestic: { min: 10000, max: 500000, step: 10000, defaultMin: 30000, defaultMax: 100000, unit: "円" },
  overseas: { min: 50000, max: 2000000, step: 10000, defaultMin: 100000, defaultMax: 500000, unit: "円" },
} as const;

// ============================================================================
// Types
// ============================================================================

interface SimplifiedInputFlowProps {
  input: UserInput;
  onChange: (update: Partial<UserInput>) => void;
  onGenerate: (inputOverride?: UserInput) => void;
  isGenerating?: boolean;
  isInModal?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

const parseDuration = (str: string): number => {
  if (str === "未定") return 0;
  if (str.includes("日帰り")) return 1;
  const nightsMatch = str.match(/(\d+)泊(\d+)日/);
  if (nightsMatch) {
    return parseInt(nightsMatch[2]) || 3;
  }
  const daysMatch = str.match(/(\d+)日間/);
  if (daysMatch) {
    return parseInt(daysMatch[1]) || 3;
  }
  return 3;
};

const formatDuration = (days: number): string => {
  if (days === 0) return "未定";
  if (days === 1) return "日帰り";
  return `${days - 1}泊${days}日`;
};

function formatBudget(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

function parseBudgetRange(value: string): { min: number; max: number } | null {
  if (!value || !value.startsWith("range:")) return null;
  const parts = value.split(":");
  if (parts.length >= 3) {
    return { min: parseInt(parts[1], 10), max: parseInt(parts[2], 10) };
  }
  return null;
}

function encodeBudgetRange(min: number, max: number): string {
  return `range:${min}:${max}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  isComplete: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

function AccordionSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  isComplete,
  children,
  icon,
}: AccordionSectionProps) {
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-stone-300 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="text-left">
            <span className="font-bold text-stone-800">{title}</span>
            {subtitle && (
              <span className="ml-2 text-sm text-stone-500">{subtitle}</span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-stone-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-4 border-t border-stone-200">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SimplifiedInputFlow({
  input,
  onChange,
  onGenerate: parentOnGenerate,
  isGenerating = false,
  isInModal = false,
}: SimplifiedInputFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Accordion state
  const [phase2Open, setPhase2Open] = useState(false);
  const [phase3Open, setPhase3Open] = useState(false);

  // Local state for destination input
  const [destinationInput, setDestinationInput] = useState("");

  // Local state for must-visit places
  const [placeInput, setPlaceInput] = useState("");

  // Derived state
  const duration = parseDuration(input.dates);
  const isOmakase = input.isDestinationDecided === false;

  // Parse date state
  const dateMatch = input.dates?.match(/(\d{4}-\d{2}-\d{2})/);
  const currentStartDate = dateMatch ? dateMatch[1] : "";
  const isDateUndecided = !currentStartDate && !input.dates.includes("から");

  // Local state for dates
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(() => {
    if (currentStartDate && duration) {
      const d = new Date(currentStartDate);
      d.setDate(d.getDate() + (duration - 1));
      return d.toISOString().split('T')[0];
    }
    return "";
  });
  // Default to calendar view unless explicitly explicitly duration-only (and not just the default)
  // カレンダーの方はデフォルトで未定という扱い (Default to undecided for Calendar)
  // This means if I pick calendar but haven't selected dates, it is treated as "Undecided"
  const [useCalendar, setUseCalendar] = useState(!!currentStartDate);

  // Budget Slider State
  // Determine if using overseas config (default to overseas if region is unknown or overseas)
  // "Domestic" only if region is explicitly domestic
  const isOverseas = input.region !== "domestic";
  const budgetConfig = isOverseas ? BUDGET_CONFIG.overseas : BUDGET_CONFIG.domestic;

  const existingBudgetRange = parseBudgetRange(input.budget);
  const [useBudgetSlider, setUseBudgetSlider] = useState(!!existingBudgetRange);
  const [budgetMin, setBudgetMin] = useState(existingBudgetRange?.min ?? budgetConfig.defaultMin);
  const [budgetMax, setBudgetMax] = useState(existingBudgetRange?.max ?? budgetConfig.defaultMax);

  // Sync slider logic
  const handleBudgetMinChange = useCallback((newMin: number) => {
    const clampedMin = Math.min(newMin, budgetMax - budgetConfig.step);
    setBudgetMin(clampedMin);
    onChange({ budget: encodeBudgetRange(clampedMin, budgetMax) });
  }, [budgetMax, budgetConfig.step, onChange]);

  const handleBudgetMaxChange = useCallback((newMax: number) => {
    const clampedMax = Math.max(newMax, budgetMin + budgetConfig.step);
    setBudgetMax(clampedMax);
    onChange({ budget: encodeBudgetRange(budgetMin, clampedMax) });
  }, [budgetMin, budgetConfig.step, onChange]);

  const toggleBudgetSlider = (enable: boolean) => {
    setUseBudgetSlider(enable);
    if (enable) {
      // Switch to slider mode, use current slider values
      onChange({ budget: encodeBudgetRange(budgetMin, budgetMax) });
    } else {
      // Switch to preset mode (default to empty or 'standard' if needed, but let user pick)
      onChange({ budget: "" });
    }
  };

  // Sync local date state when input changes externally
  useEffect(() => {
    const match = input.dates?.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
        setStartDate(match[1]);
        const dur = parseDuration(input.dates);
        if (dur > 0) {
            const d = new Date(match[1]);
            d.setDate(d.getDate() + (dur - 1));
            setEndDate(d.toISOString().split('T')[0]);
        }
    }
  }, [input.dates]);

  // Phase completion checks
  const isPhase1Complete =
    (input.isDestinationDecided === true && input.destinations.length > 0) ||
    (input.isDestinationDecided === false && (input.region || input.travelVibe?.trim())) ||
    input.destinations.length > 0 ||
    input.isDestinationDecided !== undefined;

  const hasDestinationOrOmakase =
    (input.isDestinationDecided === true && input.destinations.length > 0) ||
    input.isDestinationDecided === false;

  const hasCompanion = !!input.companions;
  const hasDates = !!input.dates;

  // Fix: Ensure canGenerate is true if mandatory fields are filled
  // We also consider the pending destinationInput as valid if the user hasn't pressed Enter yet
  const hasDest = (input.destinations && input.destinations.length > 0) ||
                  input.isDestinationDecided === false ||
                  (destinationInput.trim().length > 0);

  // Date validation must respect the current mode
  // If useCalendar is true but dates are empty, we treat it as "Undecided" (Valid)
  const hasValidDates = useCalendar
    ? true // Always valid in Calendar mode (empty = undecided)
    : (input.dates === "未定" || !!input.dates);

  const canGenerate = hasDest && hasCompanion && hasValidDates;

  const hasPhase3Input = (input.mustVisitPlaces?.length ?? 0) > 0 || !!input.freeText || (input.preferredTransport?.length ?? 0) > 0;

  const hasDetailedInput = input.theme.length > 0 ||
                         !!input.budget ||
                         !!input.pace ||
                         hasPhase3Input;

  // Phase 1 is strictly just destination/date/companion.
  // We used to shift button position, but now we keep it at the bottom.
  // const showIntermediateButton = canGenerate && !hasDetailedInput;
  // const showBottomButton = canGenerate && hasDetailedInput;

  const isPhase2Complete =
    input.theme.length > 0 && !!input.budget && !!input.pace;

  const isPhase3Complete =
    input.hasMustVisitPlaces !== undefined || (input.preferredTransport?.length ?? 0) > 0;

  // Handlers
  const handleDestinationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && destinationInput.trim()) {
      e.preventDefault();
      addDestination();
    } else if (e.key === "Backspace" && !destinationInput && input.destinations.length > 0) {
      removeDestination(input.destinations.length - 1);
    }
  };

  const addDestination = () => {
    const trimmed = destinationInput.trim();
    if (trimmed && !input.destinations.includes(trimmed)) {
      onChange({
        destinations: [...input.destinations, trimmed],
        isDestinationDecided: true,
      });
      setDestinationInput("");
    }
  };

  const handleGenerateClick = () => {
    // Scroll to top to ensure loading animation is visible
    // Modified to scroll to the container instead of window top
    if (containerRef.current?.scrollIntoView) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Handle "Undecided" date logic for Calendar Mode
    // If in calendar mode and dates are missing, explicitly set dates to "未定"
    let finalInput = { ...input };
    if (useCalendar && (!startDate || !endDate)) {
        finalInput.dates = "未定";
        onChange({ dates: "未定" });
    }

    // If there is pending destination input, add it before generating
    const trimmed = destinationInput.trim();
    if (trimmed && !input.destinations.includes(trimmed)) {
        const updatedDestinations = [...input.destinations, trimmed];
        // Update local state first to clear input
        setDestinationInput("");

        // Update parent state
        onChange({
            destinations: updatedDestinations,
            isDestinationDecided: true,
        });
        finalInput.destinations = updatedDestinations;
        finalInput.isDestinationDecided = true;
    }

    // Pass the updated input state to the generation function to avoid race conditions
    parentOnGenerate(finalInput);
  };

  const removeDestination = (index: number) => {
    const newDestinations = input.destinations.filter((_, i) => i !== index);
    onChange({
      destinations: newDestinations,
      isDestinationDecided: newDestinations.length > 0 ? true : undefined,
    });
  };

  const toggleOmakase = () => {
    if (isOmakase) {
      // Turning off omakase
      onChange({
        isDestinationDecided: input.destinations.length > 0 ? true : undefined,
        region: "",
        travelVibe: "",
      });
    } else {
      // Turning on omakase
      onChange({
        isDestinationDecided: false,
        destinations: [],
      });
    }
  };

  const handleDurationChange = (newDuration: number) => {
    if (useCalendar && startDate) {
        // Update end date based on new duration
        const d = new Date(startDate);
        d.setDate(d.getDate() + (newDuration - 1));
        const newEndDate = d.toISOString().split('T')[0];
        setEndDate(newEndDate);

        const nights = newDuration - 1;
        const dateString = `${startDate}から${nights}泊${newDuration}日`;
        onChange({ dates: dateString });
    } else {
        onChange({ dates: formatDuration(newDuration) });
    }
  };

  const handleDateRangeChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);

    if (newStart && newEnd) {
        const s = new Date(newStart);
        const e = new Date(newEnd);
        const diffTime = e.getTime() - s.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0) {
            const durationDays = diffDays + 1;
            const nights = durationDays - 1;
            const dateString = `${newStart}から${nights}泊${durationDays}日`;
            onChange({ dates: dateString });
        }
    }
  };

  const toggleTheme = (themeId: string) => {
    if (input.theme.includes(themeId)) {
      onChange({ theme: input.theme.filter((t) => t !== themeId) });
    } else {
      onChange({ theme: [...input.theme, themeId] });
    }
  };

  const toggleTransport = (transportId: string) => {
    const current = input.preferredTransport || [];
    if (current.includes(transportId)) {
      onChange({ preferredTransport: current.filter(t => t !== transportId) });
    } else {
      onChange({ preferredTransport: [...current, transportId] });
    }
  };

  const addPlace = () => {
    const trimmed = placeInput.trim();
    if (trimmed) {
      onChange({
        mustVisitPlaces: [...(input.mustVisitPlaces || []), trimmed],
        hasMustVisitPlaces: true,
      });
      setPlaceInput("");
    }
  };

  const removePlace = (index: number) => {
    const newPlaces = (input.mustVisitPlaces || []).filter((_, i) => i !== index);
    onChange({
      mustVisitPlaces: newPlaces,
      hasMustVisitPlaces: newPlaces.length > 0 ? true : input.hasMustVisitPlaces,
    });
  };

  // Calculate percentages for slider visualization
  const minPercent = ((budgetMin - budgetConfig.min) / (budgetConfig.max - budgetConfig.min)) * 100;
  const maxPercent = ((budgetMax - budgetConfig.min) / (budgetConfig.max - budgetConfig.min)) * 100;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 scroll-mt-24"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-2">
          旅行プランを作成
        </h1>
        <p className="text-stone-500 font-hand">
          必要な情報を入力して、AIがあなただけのプランを作成します
        </p>
      </div>

      {/* ================================================================== */}
      {/* Phase 1: Essential (Always Visible) */}
      {/* ================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-lg p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
            1
          </div>
          <h2 className="font-bold text-lg text-stone-800">基本情報</h2>
          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
            必須
          </span>
        </div>

        {/* Destination Mode Selector */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-stone-700">
            目的地はどうしますか？
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Specific Destination Tile */}
            <button
              type="button"
              onClick={() => {
                if (isOmakase) toggleOmakase();
              }}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all group ${
                !isOmakase
                  ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                  : "border-stone-200 bg-white hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📍</span>
                {!isOmakase && (
                  <div className="bg-primary text-white p-1 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
              <div className="font-bold text-stone-800 mb-1">目的地を入力</div>
              <div className="text-xs text-stone-500 leading-relaxed">
                京都、ハワイなど特定の場所が決まっている場合
              </div>
            </button>

            {/* Omakase Tile */}
            <button
              type="button"
              onClick={() => {
                if (!isOmakase) toggleOmakase();
              }}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all group ${
                isOmakase
                  ? "border-secondary bg-secondary/5 ring-4 ring-secondary/10"
                  : "border-stone-200 bg-white hover:border-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎲</span>
                {isOmakase && (
                  <div className="bg-secondary text-white p-1 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
              <div className="font-bold text-stone-800 mb-1">おまかせで決める</div>
              <div className="text-xs text-stone-500 leading-relaxed">
                まだ未定！AIにぴったりの行き先を提案してほしい場合
              </div>
            </button>
          </div>

          {/* Input Fields (Omakase or Direct) */}
          <AnimatePresence mode="wait">
            {isOmakase ? (
              <motion.div
                key="omakase-input"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pt-2"
              >
                <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 space-y-3">
                  <label className="block text-sm font-bold text-secondary">
                    どんな旅にしたいですか？
                  </label>
                  <textarea
                    value={input.travelVibe || ""}
                    onChange={(e) => onChange({ travelVibe: e.target.value })}
                    placeholder="例：南の島でリゾート、ヨーロッパの古い街並み、温泉でゆっくり..."
                    className="w-full h-28 bg-white border border-secondary/30 rounded-xl p-3 text-foreground placeholder:text-stone-400 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-colors resize-none text-sm"
                  />
                  <p className="text-[10px] text-secondary/70">
                    ※入力した内容をもとに、AIが最適な目的地とプランをセットで提案します。
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="direct-input"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3 pt-2"
              >
                {/* Tags */}
                {input.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {input.destinations.map((dest, index) => (
                      <span
                        key={dest}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium"
                      >
                        {dest}
                        <button
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onKeyDown={handleDestinationKeyDown}
                    placeholder={input.destinations.length === 0 ? "京都、パリ、ハワイ..." : "次の行き先を追加..."}
                    className="flex-1 min-w-0 px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addDestination}
                    disabled={!destinationInput.trim()}
                    className={`px-4 py-2 rounded-xl transition-colors ${
                      destinationInput.trim()
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-stone-200 text-stone-400 cursor-not-allowed"
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-stone-700">
              日程
            </label>

            {/* Toggle Switch */}
            <div className="bg-stone-100 p-1 rounded-lg flex text-xs font-bold">
                <button
                    type="button"
                    onClick={() => {
                        setUseCalendar(false);
                        onChange({ dates: formatDuration(duration || 3) });
                        setStartDate("");
                        setEndDate("");
                    }}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                        !useCalendar
                            ? "bg-white text-primary shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                    }`}
                >
                    日数のみ
                </button>
                <button
                    type="button"
                    onClick={() => setUseCalendar(true)}
                    className={`px-3 py-1.5 rounded-md transition-all ${
                        useCalendar
                            ? "bg-white text-primary shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                    }`}
                >
                    カレンダー
                </button>
            </div>
          </div>

          {useCalendar ? (
            <div className="bg-orange-50/50 p-4 rounded-xl border-2 border-dashed border-primary/20 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-stone-500">出発日</span>
                        <input
                            type="date"
                            value={startDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                                const newStart = e.target.value;
                                if (newStart && duration) {
                                    const d = new Date(newStart);
                                    d.setDate(d.getDate() + (duration - 1));
                                    const newEnd = d.toISOString().split('T')[0];
                                    handleDateRangeChange(newStart, newEnd);
                                } else {
                                    handleDateRangeChange(newStart, endDate);
                                }
                            }}
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-stone-500">帰着日</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none shadow-sm"
                        />
                    </div>
                </div>
                <div className="text-center">
                    {startDate && endDate ? (
                        <p className="text-sm font-bold text-primary bg-white inline-block px-4 py-1.5 rounded-full border border-primary/20 shadow-sm">
                           🗓️ {startDate} 〜 {endDate} ({duration - 1}泊{duration}日)
                        </p>
                    ) : (
                        <p className="text-xs text-stone-400 font-medium">日付を選択してください</p>
                    )}
                </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
                {/* Custom Duration (Top) */}
                <div className="flex items-center justify-center gap-6 py-2 bg-stone-50 rounded-xl border border-stone-200">
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.max(1, duration - 1))}
                        className="w-12 h-12 rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 flex items-center justify-center transition-all shadow-sm active:scale-95"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-xl font-bold text-stone-800 min-w-[100px] text-center font-serif">
                        {formatDuration(duration)}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.min(30, duration + 1))}
                        className="w-12 h-12 rounded-full bg-primary text-white hover:bg-primary/90 flex items-center justify-center transition-all shadow-md active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Preset Buttons (Bottom) */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDurationChange(opt.value)}
                        className={`py-2 px-2 text-xs sm:text-sm font-medium rounded-lg border-2 transition-all ${
                        duration === opt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-stone-200 bg-white hover:border-primary/50 text-stone-700"
                        }`}
                    >
                        {opt.label}
                    </button>
                    ))}
                </div>
            </div>
          )}
        </div>

        {/* Companion Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-stone-700">
            誰と行く？
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMPANION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ companions: opt.id })}
                className={`py-2.5 px-3 text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  input.companions === opt.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-stone-200 bg-white hover:border-primary/50 text-stone-700"
                }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intermediate Generate Button Removed - Unified at bottom */}


      {/* ================================================================== */}
      {/* Phase 2: Recommended (Accordion) */}
      {/* ================================================================== */}
      <AccordionSection
        title="詳細を設定"
        subtitle={isPhase2Complete ? "設定済み" : "推奨"}
        isOpen={phase2Open}
        onToggle={() => setPhase2Open(!phase2Open)}
        isComplete={isPhase2Complete}
        icon={<span className="text-xs">2</span>}
      >
        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-stone-700">
              テーマ（複数選択可）
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEME_OPTIONS.map((theme) => {
                const Icon = theme.icon;
                const isSelected = input.theme.includes(theme.id);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => toggleTheme(theme.id)}
                    className={`py-2.5 px-2 text-xs font-medium rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-stone-200 bg-white hover:border-primary/50 text-stone-600"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-stone-700">
              予算感
            </label>

            {/* Mode Switch (Slider vs Presets) */}
            {!useBudgetSlider ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUDGET_PRESETS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ budget: opt.id })}
                      className={`py-3 px-3 text-sm font-medium rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 h-24 ${
                        input.budget === opt.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-stone-200 bg-white hover:border-primary/50 text-stone-700"
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[10px] text-stone-500 font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toggleBudgetSlider(true)}
                  className="w-full py-2 text-xs text-stone-500 hover:text-primary underline flex items-center justify-center gap-1"
                >
                  <span>🎚️</span>
                  <span>具体的な金額で指定する</span>
                </button>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500">金額範囲を指定</span>
                  <button
                    type="button"
                    onClick={() => toggleBudgetSlider(false)}
                    className="text-xs text-stone-400 hover:text-stone-600 underline"
                  >
                    選択式に戻す
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-xl font-bold text-primary font-mono">
                    {formatBudget(budgetMin)} 〜 {formatBudget(budgetMax)}
                  </span>
                </div>

                {/* Slider UI */}
                <div className="relative pt-2 pb-6 px-2">
                   <div className="relative h-2 bg-stone-200 rounded-full">
                     <div
                        className="absolute h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
                        style={{
                          left: `${minPercent}%`,
                          width: `${maxPercent - minPercent}%`,
                        }}
                     />
                   </div>
                   {/* Inputs */}
                   <input
                      type="range"
                      min={budgetConfig.min}
                      max={budgetConfig.max}
                      step={budgetConfig.step}
                      value={budgetMin}
                      onChange={(e) => handleBudgetMinChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-20 pointer-events-auto top-2"
                   />
                   <input
                      type="range"
                      min={budgetConfig.min}
                      max={budgetConfig.max}
                      step={budgetConfig.step}
                      value={budgetMax}
                      onChange={(e) => handleBudgetMaxChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-20 pointer-events-auto top-2"
                   />
                   {/* Thumb Indicators */}
                   <div
                      className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10 top-0.5 pointer-events-none"
                      style={{ left: `${minPercent}%` }}
                   />
                   <div
                      className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10 top-0.5 pointer-events-none"
                      style={{ left: `${maxPercent}%` }}
                   />
                </div>
              </div>
            )}
          </div>

          {/* Pace Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-stone-700">
              旅のペース
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PACE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ pace: opt.id })}
                  className={`py-3 px-3 text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                    input.pace === opt.id
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-stone-200 bg-white hover:border-teal-300 text-stone-700"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Button below Phase 2 Removed - Unified at bottom */}

      {/* ================================================================== */}
      {/* Phase 3: Optional (Accordion) */}
      {/* ================================================================== */}
      <AccordionSection
        title="さらに詳しく"
        subtitle="任意"
        isOpen={phase3Open}
        onToggle={() => setPhase3Open(!phase3Open)}
        isComplete={isPhase3Complete}
        icon={<span className="text-xs">3</span>}
      >
        <div className="space-y-6">
          {/* Preferred Transport */}
          <div className="space-y-3">
             <label className="block text-sm font-bold text-stone-700">
                希望する移動手段（複数選択可）
             </label>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TRANSPORT_OPTIONS.map((opt) => {
                   const isSelected = input.preferredTransport?.includes(opt.id) || false;
                   const Icon = opt.icon;
                   return (
                      <button
                         key={opt.id}
                         type="button"
                         onClick={() => toggleTransport(opt.id)}
                         className={`py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all flex items-center gap-2 ${
                            isSelected
                               ? "border-sky-500 bg-sky-50 text-sky-700"
                               : "border-stone-200 bg-white hover:border-sky-300 text-stone-600"
                         }`}
                      >
                         <Icon />
                         <span>{opt.label}</span>
                         {isSelected && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                   );
                })}
             </div>
          </div>

          {/* Must-Visit Places */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-stone-700">
              絶対行きたい場所
            </label>

            {/* Added Places */}
            {(input.mustVisitPlaces?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {input.mustVisitPlaces?.map((place, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium"
                  >
                    📍 {place}
                    <button
                      type="button"
                      onClick={() => removePlace(index)}
                      className="p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={placeInput}
                onChange={(e) => setPlaceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPlace();
                  }
                }}
                placeholder="場所名を入力（例：清水寺）"
                className="flex-1 min-w-0 px-4 py-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors text-sm"
              />
              {placeInput.trim() && (
                <button
                  type="button"
                  onClick={addPlace}
                  className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                >
                  <FaPlus />
                </button>
              )}
            </div>
          </div>

          {/* Free Text */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-stone-700">
              その他のリクエスト
            </label>
            <textarea
              value={input.freeText || ""}
              onChange={(e) => onChange({ freeText: e.target.value })}
              placeholder="美術館巡りがしたい、夜景が綺麗なレストランに行きたい、など自由に入力してください..."
              className="w-full h-24 bg-stone-50 border border-stone-300 rounded-xl p-3 text-foreground placeholder:text-stone-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none text-sm"
            />
          </div>

        </div>
      </AccordionSection>

      {/* Unified Generate Button (Always visible at bottom) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2"
      >
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={isGenerating || !canGenerate}
          className="w-full py-4 px-6 bg-primary text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⏳</span>
              プランを作成中...
            </>
          ) : !canGenerate ? (
            <>
              <span>⚠️</span>
              必須項目を入力してください
            </>
          ) : hasDetailedInput ? (
            <>
              <span>✨</span>
              詳細条件でプランを作成
            </>
          ) : (
            <>
              <span>✨</span>
              とりあえず生成する
            </>
          )}
        </button>
        {canGenerate && !hasDetailedInput && (
          <p className={`text-center text-xs mt-2 ${isInModal ? "text-stone-300" : "text-stone-500"}`}>
            詳細設定を追加すると、より精度の高いプランが作成されます✨
          </p>
        )}
      </motion.div>

      {/* Bottom spacer for sticky button */}
      <div className="h-20" />
    </div>
  );
}
