"use client";

import { useState, useEffect, useCallback, KeyboardEvent, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserInput } from "@/types";
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
import {
  JournalSheet,
  JournalInput,
  JournalButton,
  HandwrittenText,
  Tape,
  Stamp
} from "@/components/ui/journal";

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

// New Budget Logic
const BUDGET_MIN = 10000;
const BUDGET_MAX = 2000000;
const BREAKPOINT_AMOUNT = 500000;
const STEP_SMALL = 10000;
const STEP_LARGE = 100000;

// Calculate max index for slider
// Range 1: 10k to 500k (step 10k) -> (500k - 10k)/10k = 49 steps
const STEPS_RANGE_1 = (BREAKPOINT_AMOUNT - BUDGET_MIN) / STEP_SMALL; // 49
// Range 2: 500k to 2M (step 100k) -> (2M - 500k)/100k = 15 steps
const STEPS_RANGE_2 = (BUDGET_MAX - BREAKPOINT_AMOUNT) / STEP_LARGE; // 15
const SLIDER_MAX = STEPS_RANGE_1 + STEPS_RANGE_2; // 64

function getBudgetAmount(index: number): number {
  if (index <= STEPS_RANGE_1) {
    return BUDGET_MIN + (index * STEP_SMALL);
  } else {
    return BREAKPOINT_AMOUNT + ((index - STEPS_RANGE_1) * STEP_LARGE);
  }
}

function getBudgetIndex(amount: number): number {
  if (amount <= BREAKPOINT_AMOUNT) {
    return Math.round((amount - BUDGET_MIN) / STEP_SMALL);
  } else {
    return STEPS_RANGE_1 + Math.round((amount - BREAKPOINT_AMOUNT) / STEP_LARGE);
  }
}

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
    return `${(amount / 10000).toLocaleString()}万円`;
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
    <div className="border-b-2 border-stone-200 border-dashed pb-2 mb-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-2 py-3 flex items-center justify-between hover:bg-stone-50/50 transition-colors rounded-sm"
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center border border-primary/20">
              <Check className="w-3 h-3" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-stone-300 text-stone-400 flex items-center justify-center font-bold font-sans text-xs">
              {icon}
            </div>
          )}
          <div className="text-left flex items-baseline gap-2">
            <span className="font-bold text-lg text-stone-700 font-sans">{title}</span>
            {subtitle && (
              <span className="text-xs text-stone-400 font-sans">{subtitle}</span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-stone-400" />
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
            <div className="p-4 bg-white/40 rounded-sm mt-2">{children}</div>
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

  const [useCalendar, setUseCalendar] = useState(!!currentStartDate);

  // Budget Slider State
  const existingBudgetRange = parseBudgetRange(input.budget);
  const [useBudgetSlider, setUseBudgetSlider] = useState(!!existingBudgetRange);
  // Store actual amounts
  const [budgetMinAmount, setBudgetMinAmount] = useState(existingBudgetRange?.min ?? 30000);
  const [budgetMaxAmount, setBudgetMaxAmount] = useState(existingBudgetRange?.max ?? 100000);

  // Sync slider logic
  const handleBudgetMinIndexChange = useCallback((newIndex: number) => {
    const newAmount = getBudgetAmount(newIndex);
    // Clamp so min doesn't exceed max
    const clampedAmount = Math.min(newAmount, budgetMaxAmount); // Allow overlap or enforce step? Let's just clamp.
    setBudgetMinAmount(clampedAmount);
    onChange({ budget: encodeBudgetRange(clampedAmount, budgetMaxAmount) });
  }, [budgetMaxAmount, onChange]);

  const handleBudgetMaxIndexChange = useCallback((newIndex: number) => {
    const newAmount = getBudgetAmount(newIndex);
    const clampedAmount = Math.max(newAmount, budgetMinAmount);
    setBudgetMaxAmount(clampedAmount);
    onChange({ budget: encodeBudgetRange(budgetMinAmount, clampedAmount) });
  }, [budgetMinAmount, onChange]);

  const toggleBudgetSlider = (enable: boolean) => {
    setUseBudgetSlider(enable);
    if (enable) {
      onChange({ budget: encodeBudgetRange(budgetMinAmount, budgetMaxAmount) });
    } else {
      onChange({ budget: "" });
    }
  };

  // Sync local date state
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
  const hasDest = (input.destinations && input.destinations.length > 0) ||
                  input.isDestinationDecided === false ||
                  (destinationInput.trim().length > 0);

  const hasCompanion = !!input.companions;
  const hasValidDates = useCalendar
    ? true
    : (input.dates === "未定" || !!input.dates);

  const canGenerate = hasDest && hasCompanion && hasValidDates;

  const hasPhase3Input = (input.mustVisitPlaces?.length ?? 0) > 0 || !!input.freeText || (input.preferredTransport?.length ?? 0) > 0;

  const hasDetailedInput = input.theme.length > 0 ||
                         !!input.budget ||
                         !!input.pace ||
                         hasPhase3Input;

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
    if (containerRef.current?.scrollIntoView) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    let finalInput = { ...input };
    if (useCalendar && (!startDate || !endDate)) {
        finalInput.dates = "未定";
        onChange({ dates: "未定" });
    }

    const trimmed = destinationInput.trim();
    if (trimmed && !input.destinations.includes(trimmed)) {
        const updatedDestinations = [...input.destinations, trimmed];
        setDestinationInput("");
        onChange({
            destinations: updatedDestinations,
            isDestinationDecided: true,
        });
        finalInput.destinations = updatedDestinations;
        finalInput.isDestinationDecided = true;
    }

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
      onChange({
        isDestinationDecided: input.destinations.length > 0 ? true : undefined,
        region: "",
        travelVibe: "",
      });
    } else {
      onChange({
        isDestinationDecided: false,
        destinations: [],
      });
    }
  };

  const handleDurationChange = (newDuration: number) => {
    if (useCalendar && startDate) {
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

  // Calculate percentages for slider background
  const minIndex = getBudgetIndex(budgetMinAmount);
  const maxIndex = getBudgetIndex(budgetMaxAmount);
  const minPercent = (minIndex / SLIDER_MAX) * 100;
  const maxPercent = (maxIndex / SLIDER_MAX) * 100;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-6 scroll-mt-24"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2 font-sans">
          <span className="border-b-2 border-primary/30 pb-1">旅行プランを作成</span>
        </h1>
        <p className="text-stone-500 font-bold font-sans text-sm sm:text-base">
          必要な情報を入力して、AIがあなただけのプランを作成します
        </p>
      </div>

      <JournalSheet variant="notebook" className="shadow-xl relative overflow-visible">
         {/* Decorative Tape */}
         <Tape color="pink" position="top-right" rotation="right" className="opacity-80" />
         <Tape color="blue" position="bottom-left" rotation="left" className="opacity-80 -bottom-6 -left-2" />

      {/* ================================================================== */}
      {/* Phase 1: Essential (Always Visible) */}
      {/* ================================================================== */}
      <div className="space-y-8 p-1 sm:p-2">
        <div className="flex items-center gap-3 mb-4 border-b-2 border-stone-200 border-dashed pb-2">
          <Stamp color="red" size="sm" className="w-10 h-10 text-[0.6rem] border-2">step 1</Stamp>
          <div className="flex flex-col">
             <span className="font-bold text-xl text-stone-800 font-sans">基本情報</span>
             <span className="text-xs text-primary font-bold font-sans">
               ※ここは必ず書いてね
             </span>
          </div>
        </div>

        {/* Destination Mode Selector */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-stone-700 font-sans ml-1">
            ① 目的地はどうしますか？
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Specific Destination Tile */}
            <JournalButton
              variant={!isOmakase ? "primary" : "outline"}
              onClick={() => {
                if (isOmakase) toggleOmakase();
              }}
              className={`h-auto p-4 flex flex-col items-start gap-2 border-2 ${!isOmakase ? "border-primary" : "border-stone-300 border-dashed"}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl">📍</span>
                {!isOmakase && <Check className="w-4 h-4" />}
              </div>
              <div className="font-bold text-lg font-sans">目的地を入力</div>
              <div className="text-xs opacity-70 font-sans text-left">
                京都、ハワイなど<br/>行きたい場所が決まっている
              </div>
            </JournalButton>

            {/* Omakase Tile */}
            <JournalButton
              variant={isOmakase ? "primary" : "outline"}
              onClick={() => {
                if (!isOmakase) toggleOmakase();
              }}
              className={`h-auto p-4 flex flex-col items-start gap-2 border-2 ${isOmakase ? "border-primary" : "border-stone-300 border-dashed"}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-2xl">🎲</span>
                {isOmakase && <Check className="w-4 h-4" />}
              </div>
              <div className="font-bold text-lg font-sans">おまかせで決める</div>
              <div className="text-xs opacity-70 font-sans text-left">
                まだ未定！<br/>AIに提案してほしい
              </div>
            </JournalButton>
          </div>

          {/* Input Fields (Omakase or Direct) */}
          <AnimatePresence mode="wait">
            {isOmakase ? (
              <motion.div
                key="omakase-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2"
              >
                <div className="bg-white/50 border border-stone-200 rounded-sm p-4 space-y-3 relative">
                  <Tape color="green" position="top-right" className="w-16 h-4 opacity-70" />
                  <label className="block text-sm font-bold text-stone-600 font-sans">
                    どんな旅にしたい？
                  </label>
                  <textarea
                    value={input.travelVibe || ""}
                    onChange={(e) => onChange({ travelVibe: e.target.value })}
                    placeholder="例：南の島でリゾート、ヨーロッパの古い街並み、温泉でゆっくり..."
                    className="w-full h-28 bg-white border border-stone-300 rounded-sm p-3 text-base font-sans placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="direct-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-2"
              >
                {/* Tags */}
                {input.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {input.destinations.map((dest, index) => (
                      <span
                        key={dest}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-stone-300 rounded-sm text-stone-700 font-sans shadow-sm transform rotate-1"
                      >
                        {dest}
                        <button
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input Field */}
                <div className="flex gap-2 items-end">
                  <JournalInput
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onKeyDown={handleDestinationKeyDown}
                    placeholder={input.destinations.length === 0 ? "京都、パリ、ハワイ..." : "次の行き先を追加..."}
                    className="flex-1 text-lg"
                  />
                  <JournalButton
                    variant="secondary"
                    onClick={addDestination}
                    disabled={!destinationInput.trim()}
                    className="h-10 w-10 p-0 rounded-full"
                  >
                    <Plus className="w-5 h-5" />
                  </JournalButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-stone-700 font-sans ml-1">
              ② 日程
            </label>

            {/* Toggle Switch */}
            <div className="flex text-xs font-bold font-sans gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setUseCalendar(false);
                        onChange({ dates: formatDuration(duration || 3) });
                        setStartDate("");
                        setEndDate("");
                    }}
                    className={`px-3 py-1.5 border-b-2 transition-all ${
                        !useCalendar
                            ? "border-primary text-primary"
                            : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                >
                    日数のみ
                </button>
                <button
                    type="button"
                    onClick={() => setUseCalendar(true)}
                    className={`px-3 py-1.5 border-b-2 transition-all ${
                        useCalendar
                            ? "border-primary text-primary"
                            : "border-transparent text-stone-400 hover:text-stone-600"
                    }`}
                >
                    カレンダー
                </button>
            </div>
          </div>

          {useCalendar ? (
            <div className="bg-white/50 p-4 rounded-sm border-2 border-dashed border-stone-200 space-y-4 relative">
                <Tape color="white" position="top-center" className="w-16 h-4 opacity-50" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-stone-500 font-sans">出発日</span>
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
                            className="w-full p-2 bg-transparent border-b border-stone-300 font-sans text-lg focus:outline-none focus:border-primary"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-stone-500 font-sans">帰着日</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                            className="w-full p-2 bg-transparent border-b border-stone-300 font-sans text-lg focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
                <div className="text-center font-sans">
                    {startDate && endDate ? (
                        <p className="text-sm font-bold text-primary inline-block border-b-2 border-primary/20">
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
                <div className="flex items-center justify-center gap-6 py-4 bg-white/40 border-y border-stone-200 border-dashed">
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.max(1, duration - 1))}
                        className="w-10 h-10 rounded-full border-2 border-stone-300 text-stone-500 hover:border-primary hover:text-primary flex items-center justify-center transition-all"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold text-stone-800 min-w-[120px] text-center font-sans">
                        {formatDuration(duration)}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.min(30, duration + 1))}
                        className="w-10 h-10 rounded-full bg-primary text-white hover:bg-primary/90 flex items-center justify-center transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Preset Buttons (Bottom) */}
                <div className="flex flex-wrap justify-center gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDurationChange(opt.value)}
                        className={`py-1.5 px-2 text-xs font-sans font-bold rounded-sm border transition-all transform hover:-translate-y-0.5 ${
                        duration === opt.value
                            ? "border-primary bg-primary/10 text-primary -rotate-2 shadow-sm"
                            : "border-stone-200 bg-white hover:border-primary/50 text-stone-600 rotate-1"
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
          <label className="block text-sm font-bold text-stone-700 font-sans ml-1">
            ③ 誰と行く？
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            {COMPANION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ companions: opt.id })}
                className={`py-3 px-2 text-sm font-sans font-bold rounded-sm border transition-all flex flex-col items-center justify-center gap-1 ${
                  input.companions === opt.id
                    ? "border-primary bg-white text-stone-800 shadow-md transform -rotate-1 ring-2 ring-primary/20"
                    : "border-stone-200 bg-white/50 hover:bg-white text-stone-500 hover:text-stone-800"
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Phase 2: Recommended (Accordion) */}
      {/* ================================================================== */}
      <div className="mt-8">
        <AccordionSection
            title="詳細を設定"
            subtitle={isPhase2Complete ? "OK!" : "推奨"}
            isOpen={phase2Open}
            onToggle={() => setPhase2Open(!phase2Open)}
            isComplete={isPhase2Complete}
            icon={<span className="text-xs">2</span>}
        >
            <div className="space-y-8">
            {/* Theme Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
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
                        className={`py-2 px-2 text-xs font-bold rounded-sm border transition-all flex flex-col items-center gap-1 font-sans ${
                        isSelected
                            ? "border-primary bg-white text-primary shadow-sm transform -rotate-1"
                            : "border-stone-200 bg-white/50 hover:bg-white text-stone-500 hover:text-primary"
                        }`}
                    >
                        <Icon size={16} />
                        <span>{theme.label}</span>
                    </button>
                    );
                })}
                </div>
            </div>

            {/* Budget Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
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
                        className={`py-3 px-3 text-sm font-bold rounded-sm border transition-all flex flex-col items-center justify-center gap-1 h-24 font-sans ${
                            input.budget === opt.id
                            ? "border-primary bg-white text-primary shadow-sm -rotate-1"
                            : "border-stone-200 bg-white/50 hover:bg-white text-stone-600"
                        }`}
                        >
                        <span className="text-xl">{opt.icon}</span>
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-[10px] text-stone-400 font-sans font-normal">{opt.desc}</span>
                        </button>
                    ))}
                    </div>
                    <button
                    type="button"
                    onClick={() => toggleBudgetSlider(true)}
                    className="w-full py-3 px-4 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-stone-300"
                    >
                    <span>🎚️</span>
                    <span>具体的な金額で指定する</span>
                    </button>
                </div>
                ) : (
                <div className="bg-white/50 border border-stone-200 rounded-sm p-4 space-y-4 relative">
                    <Tape color="white" position="top-right" className="opacity-50 w-12 h-4" />
                    <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 font-sans">金額範囲を指定</span>
                    <button
                        type="button"
                        onClick={() => toggleBudgetSlider(false)}
                        className="text-xs text-stone-400 hover:text-stone-600 underline font-sans"
                    >
                        選択式に戻す
                    </button>
                    </div>

                    <div className="text-center">
                    <span className="text-xl font-bold text-primary font-mono">
                        {formatBudget(budgetMinAmount)} 〜 {formatBudget(budgetMaxAmount)}
                    </span>
                    </div>

                    {/* Slider UI */}
                    <div className="relative pt-2 pb-6 px-2">
                    <div className="relative h-2 bg-stone-200 rounded-full">
                        <div
                            className="absolute h-full bg-gradient-to-r from-primary/50 to-primary rounded-full"
                            style={{
                            left: `${minPercent}%`,
                            width: `${maxPercent - minPercent}%`,
                            }}
                        />
                    </div>
                    {/* Inputs using mapped values */}
                    <input
                        type="range"
                        min={0}
                        max={SLIDER_MAX}
                        step={1}
                        value={minIndex}
                        onChange={(e) => handleBudgetMinIndexChange(Number(e.target.value))}
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-20 pointer-events-auto top-2"
                    />
                    <input
                        type="range"
                        min={0}
                        max={SLIDER_MAX}
                        step={1}
                        value={maxIndex}
                        onChange={(e) => handleBudgetMaxIndexChange(Number(e.target.value))}
                        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-20 pointer-events-auto top-2"
                    />
                    {/* Thumb Indicators */}
                    <div
                        className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-sm -translate-x-1/2 z-10 top-0.5 pointer-events-none"
                        style={{ left: `${minPercent}%` }}
                    />
                    <div
                        className="absolute w-5 h-5 bg-white border-2 border-primary rounded-full shadow-sm -translate-x-1/2 z-10 top-0.5 pointer-events-none"
                        style={{ left: `${maxPercent}%` }}
                    />
                    </div>
                </div>
                )}
            </div>

            {/* Pace Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                旅のペース
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PACE_OPTIONS.map((opt) => (
                    <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ pace: opt.id })}
                    className={`py-3 px-3 text-sm font-bold rounded-sm border transition-all flex items-center justify-center gap-2 font-sans ${
                        input.pace === opt.id
                        ? "border-primary bg-white text-stone-800 shadow-sm -rotate-1"
                        : "border-stone-200 bg-white/50 hover:bg-white text-stone-600"
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
      </div>

      {/* ================================================================== */}
      {/* Phase 3: Optional (Accordion) */}
      {/* ================================================================== */}
      <div>
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
                <label className="block text-sm font-bold text-stone-700 font-sans">
                    希望する移動手段
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
                            className={`py-2 px-3 text-xs font-bold rounded-sm border transition-all flex items-center gap-2 font-sans ${
                                isSelected
                                ? "border-primary bg-white text-primary shadow-sm -rotate-1"
                                : "border-stone-200 bg-white/50 hover:bg-white text-stone-600"
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
                <label className="block text-sm font-bold text-stone-700 font-sans">
                絶対行きたい場所
                </label>

                {/* Added Places */}
                {(input.mustVisitPlaces?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                    {input.mustVisitPlaces?.map((place, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-stone-200 rounded-sm text-sm font-sans font-bold shadow-sm rotate-1"
                    >
                        📍 {place}
                        <button
                        type="button"
                        onClick={() => removePlace(index)}
                        className="hover:text-red-500 transition-colors"
                        >
                        <X className="w-3 h-3" />
                        </button>
                    </span>
                    ))}
                </div>
                )}

                <div className="flex gap-2 w-full items-end">
                <JournalInput
                    value={placeInput}
                    onChange={(e) => setPlaceInput(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        addPlace();
                    }
                    }}
                    placeholder="場所名を入力（例：清水寺）"
                    className="flex-1 text-sm"
                />
                {placeInput.trim() && (
                    <JournalButton
                    variant="secondary"
                    onClick={addPlace}
                    className="h-10 w-10 p-0 rounded-full"
                    >
                    <FaPlus />
                    </JournalButton>
                )}
                </div>
            </div>

            {/* Free Text */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                その他のリクエスト
                </label>
                <div className="bg-white/50 border border-stone-200 rounded-sm p-2 relative">
                    <textarea
                        value={input.freeText || ""}
                        onChange={(e) => onChange({ freeText: e.target.value })}
                        placeholder="美術館巡りがしたい、夜景が綺麗なレストランに行きたい、など自由に入力してください..."
                        className="w-full h-24 bg-transparent border-none p-2 text-sm font-sans placeholder:text-stone-300 focus:outline-none resize-none leading-relaxed"
                    />
                </div>
            </div>

            </div>
        </AccordionSection>
      </div>

      </JournalSheet>

      {/* Unified Generate Button (Always visible at bottom) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-6 px-2 pb-20 sm:pb-8"
      >
        <JournalButton
          variant="primary"
          size="lg"
          onClick={handleGenerateClick}
          disabled={isGenerating || !canGenerate}
          className="w-full h-16 text-lg font-bold shadow-lg hover:rotate-1 font-sans"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              プランを作成中...
            </>
          ) : !canGenerate ? (
            <>
              <span className="mr-2">⚠️</span>
              必須項目を入力してください
            </>
          ) : hasDetailedInput ? (
            <>
              <span className="mr-2">✨</span>
              詳細条件でプランを作成
            </>
          ) : (
            <>
              <span className="mr-2">✨</span>
              とりあえず生成する
            </>
          )}
        </JournalButton>
        {canGenerate && !hasDetailedInput && (
          <p className="text-center text-xs mt-3 text-stone-500 font-sans font-medium">
            詳細設定を追加すると、より精度の高いプランが作成されます✨
          </p>
        )}
      </motion.div>
    </div>
  );
}
