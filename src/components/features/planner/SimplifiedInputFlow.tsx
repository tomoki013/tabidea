"use client";

import { useState, useEffect, KeyboardEvent } from "react";
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

const BUDGET_OPTIONS = [
  { id: "saving", label: "なるべく安く", icon: "💸" },
  { id: "standard", label: "普通", icon: "💰" },
  { id: "high", label: "少し贅沢に", icon: "✨" },
  { id: "luxury", label: "リッチに", icon: "💎" },
];

const PACE_OPTIONS = [
  { id: "relaxed", label: "ゆったり", icon: "☕" },
  { id: "balanced", label: "バランスよく", icon: "⚖️" },
  { id: "active", label: "アクティブ", icon: "👟" },
  { id: "packed", label: "詰め込み", icon: "🔥" },
];

const DURATION_OPTIONS = [
  { value: 1, label: "日帰り" },
  { value: 2, label: "1泊2日" },
  { value: 3, label: "2泊3日" },
  { value: 4, label: "3泊4日" },
  { value: 5, label: "4泊5日" },
  { value: 6, label: "5泊6日" },
  { value: 7, label: "6泊7日" },
];

// ============================================================================
// Types
// ============================================================================

interface SimplifiedInputFlowProps {
  input: UserInput;
  onChange: (update: Partial<UserInput>) => void;
  onGenerate: (inputOverride?: UserInput) => void;
  isGenerating?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

const parseDuration = (str: string): number => {
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
  if (days === 1) return "日帰り";
  return `${days - 1}泊${days}日`;
};

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
}: SimplifiedInputFlowProps) {
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
  const [useCalendar, setUseCalendar] = useState(!!currentStartDate);

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
  const hasValidDates = useCalendar
    ? (!!startDate && !!endDate)
    : !!input.dates;

  const canGenerate = hasDest && hasCompanion && hasValidDates;

  const hasDetailedInput = (useCalendar && !!startDate) ||
                         input.theme.length > 0 ||
                         !!input.budget ||
                         !!input.pace ||
                         (input.mustVisitPlaces?.length ?? 0) > 0 ||
                         !!input.freeText;

  // Phase 1 is strictly just destination/date/companion.
  // If we have detailed input, we shift to the bottom button mode.
  // If not, we show the intermediate button.
  const showIntermediateButton = canGenerate && !hasDetailedInput;
  const showBottomButton = canGenerate && hasDetailedInput;

  const isPhase2Complete =
    input.theme.length > 0 && !!input.budget && !!input.pace;

  const isPhase3Complete =
    input.hasMustVisitPlaces !== undefined;

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
    window.scrollTo({ top: 0, behavior: 'smooth' });

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

        // Pass the updated input state to the generation function to avoid race conditions
        const inputOverride = {
            ...input,
            destinations: updatedDestinations,
            isDestinationDecided: true,
        };
        parentOnGenerate(inputOverride);
    } else {
        parentOnGenerate();
    }
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

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
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

        {/* Destination Input */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-stone-700">
            行き先
          </label>

          {/* Omakase Toggle */}
          <button
            type="button"
            onClick={toggleOmakase}
            className={`w-full py-3 px-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
              isOmakase
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-stone-200 hover:border-stone-300 text-stone-600"
            }`}
          >
            <span className="text-2xl">🎲</span>
            <div className="flex-1">
              <span className={`font-bold ${isOmakase ? "text-secondary" : "text-stone-800"}`}>
                おまかせで決める
              </span>
              <span className="block text-xs text-stone-500">
                AIにお任せ！希望のイメージだけ伝えてください
              </span>
            </div>
            {isOmakase && (
              <Check className="w-5 h-5 text-secondary" />
            )}
          </button>

          {/* Omakase Input */}
          <AnimatePresence mode="wait">
            {isOmakase && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <textarea
                  value={input.travelVibe || ""}
                  onChange={(e) => onChange({ travelVibe: e.target.value })}
                  placeholder="例：南の島でリゾート、ヨーロッパの古い街並み、温泉でゆっくり..."
                  className="w-full h-24 bg-stone-50 border border-stone-300 rounded-lg p-3 text-foreground placeholder:text-stone-400 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-colors resize-none text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direct Destination Input */}
          {!isOmakase && (
            <>
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
                {destinationInput.trim() && (
                  <button
                    type="button"
                    onClick={addDestination}
                    className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </>
          )}
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
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-stone-500">出発日</span>
                        <input
                            type="date"
                            value={startDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-stone-500">帰着日</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                            className="w-full p-2 bg-white border border-stone-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                    </div>
                </div>
                <div className="text-center">
                    {startDate && endDate ? (
                        <p className="text-sm font-bold text-stone-700 bg-white inline-block px-4 py-1 rounded-full border border-stone-200 shadow-sm">
                           🗓️ {startDate} 〜 {endDate} ({duration - 1}泊{duration}日)
                        </p>
                    ) : (
                        <p className="text-xs text-stone-400">日付を選択してください</p>
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

      {/* Intermediate Generate Button (Phase 1 Only) */}
      <AnimatePresence>
        {showIntermediateButton && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="w-full py-4 px-6 bg-primary text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  プランを作成中...
                </>
              ) : (
                <>
                  <span>✨</span>
                  とりあえず生成する
                </>
              )}
            </button>
            <p className="text-center text-xs text-stone-500">
                👇 下の詳細設定を追加すると、より精度の高いプランが作成されます
            </p>
          </motion.div>
        )}
      </AnimatePresence>


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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ budget: opt.id })}
                  className={`py-3 px-3 text-sm font-medium rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                    input.budget === opt.id
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

      {/* Bottom Generate Button (Detailed Mode) */}
      <AnimatePresence>
        {showBottomButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full mt-8"
          >
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="w-full py-4 px-6 bg-primary text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  プランを作成中...
                </>
              ) : (
                <>
                  <span>✨</span>
                  詳細条件でプランを作成
                </>
              )}
            </button>
            <p className="text-center text-xs text-stone-500 mt-2">
              一緒に詳しく入力することで、よりあなた好みのプランが作成できます✨
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacer for sticky button */}
      <div className="h-20" />
    </div>
  );
}
