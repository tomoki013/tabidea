"use client";

import { useState, useEffect, useCallback, KeyboardEvent, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserInput, FixedScheduleItem } from "@/types";
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
  FaHotel,
  FaTicketAlt,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";
import {
  JournalSheet,
  JournalInput,
  JournalButton,
  Tape,
  Stamp
} from "@/components/ui/journal";

// ============================================================================
// Constants (Same as before)
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
  { id: "relaxed", label: "ゆったり", icon: "☕", desc: "1日1〜2箇所" },
  { id: "balanced", label: "バランスよく", icon: "⚖️", desc: "1日3〜4箇所" },
  { id: "active", label: "アクティブ", icon: "👟", desc: "1日5箇所以上" },
  { id: "packed", label: "詰め込み", icon: "🔥", desc: "限界まで回る" },
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

const RESERVATION_TYPES = [
  { id: 'flight', label: '飛行機', icon: FaPlane },
  { id: 'train', label: '電車・新幹線', icon: FaTrain },
  { id: 'bus', label: 'バス', icon: FaBus },
  { id: 'hotel', label: '宿泊・ホテル', icon: FaHotel },
  { id: 'activity', label: 'アクティビティ', icon: FaTicketAlt },
  { id: 'other', label: 'その他', icon: FaQuestion },
];

// New Budget Logic
const BUDGET_MIN = 10000;
const BUDGET_MAX = 2000000;
const BREAKPOINT_AMOUNT = 500000;
const STEP_SMALL = 10000;
const STEP_LARGE = 100000;

// Calculate max index for slider
const STEPS_RANGE_1 = (BREAKPOINT_AMOUNT - BUDGET_MIN) / STEP_SMALL; // 49
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
    <div className="border border-stone-200 rounded-xl bg-white shadow-sm mb-6 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-5 py-5 flex items-center justify-between transition-colors ${isOpen ? 'bg-stone-50' : 'hover:bg-stone-50'}`}
      >
        <div className="flex items-center gap-4">
          {isComplete ? (
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center border border-primary/20 shadow-sm flex-shrink-0">
              <Check className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-stone-300 text-stone-500 flex items-center justify-center font-bold font-sans text-base bg-white flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="text-left flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-bold text-xl text-stone-800 font-sans">{title}</span>
            {subtitle && (
              <span className="text-sm text-stone-500 font-sans">{subtitle}</span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-6 h-6 text-stone-400" />
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
            <div className="p-5 border-t border-stone-100">{children}</div>
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

  // Reservation Input State
  const [isAddingReservation, setIsAddingReservation] = useState(false);
  const [resType, setResType] = useState<FixedScheduleItem['type']>('flight');
  const [resName, setResName] = useState('');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resNotes, setResNotes] = useState('');

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
    const clampedAmount = Math.min(newAmount, budgetMaxAmount);
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
        queueMicrotask(() => {
          setStartDate(match[1]);
          const dur = parseDuration(input.dates);
          if (dur > 0) {
              const d = new Date(match[1]);
              d.setDate(d.getDate() + (dur - 1));
              setEndDate(d.toISOString().split('T')[0]);
          }
        });
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

  const hasPhase3Input = (input.mustVisitPlaces?.length ?? 0) > 0 ||
                         !!input.freeText ||
                         (input.preferredTransport?.length ?? 0) > 0 ||
                         (input.fixedSchedule?.length ?? 0) > 0;

  const hasDetailedInput = input.theme.length > 0 ||
                         !!input.budget ||
                         !!input.pace ||
                         hasPhase3Input;

  const isPhase2Complete =
    input.theme.length > 0 && !!input.budget && !!input.pace;

  const isPhase3Complete =
    input.hasMustVisitPlaces !== undefined ||
    (input.preferredTransport?.length ?? 0) > 0 ||
    (input.fixedSchedule?.length ?? 0) > 0;

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

    const finalInput = { ...input };
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

  const addReservation = () => {
    if (!resName.trim()) return;

    const newItem: FixedScheduleItem = {
      type: resType,
      name: resName,
      date: resDate || undefined,
      time: resTime || undefined,
      notes: resNotes || undefined,
    };

    const current = input.fixedSchedule || [];
    onChange({ fixedSchedule: [...current, newItem] });

    // Reset form
    setResName('');
    setResDate('');
    setResTime('');
    setResNotes('');
    setIsAddingReservation(false);
  };

  const removeReservation = (index: number) => {
    const current = input.fixedSchedule || [];
    onChange({ fixedSchedule: current.filter((_, i) => i !== index) });
  };

  // Calculate percentages for slider background
  const minIndex = getBudgetIndex(budgetMinAmount);
  const maxIndex = getBudgetIndex(budgetMaxAmount);
  const minPercent = (minIndex / SLIDER_MAX) * 100;
  const maxPercent = (maxIndex / SLIDER_MAX) * 100;

  return (
    <div
      id="planner-input-section"
      ref={containerRef}
      className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-8 scroll-mt-24"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-800 mb-3 font-sans">
          旅行プランを作成
        </h1>
        <p className="text-stone-500 font-bold font-sans text-base">
          AIがあなただけのオリジナルプランを作成します
        </p>
      </div>

      <div className="space-y-12">

      {/* ================================================================== */}
      {/* Phase 1: Essential (Always Visible) */}
      {/* ================================================================== */}
      <div className="space-y-12">
        {/* Step Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-stone-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
            1
          </div>
          <div className="flex flex-col">
             <span className="font-extrabold text-2xl text-stone-800 font-sans">基本情報</span>
             <span className="text-sm text-stone-500 font-bold font-sans">
               まずはここからスタート
             </span>
          </div>
        </div>

        {/* Destination Mode Selector */}
        <div className="space-y-4">
          <label className="block text-lg font-extrabold text-stone-800 font-sans ml-1 mb-2">
            目的地を決める
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Specific Destination Tile */}
            <JournalButton
              variant={!isOmakase ? "primary" : "outline"}
              onClick={() => {
                if (isOmakase) toggleOmakase();
              }}
              className={`h-auto p-6 flex flex-col items-start gap-4 border-2 shadow-sm transition-all rounded-xl ${!isOmakase ? "border-primary bg-white ring-2 ring-primary/10 text-primary shadow-md" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-3xl ${!isOmakase ? "opacity-100" : "opacity-70"}`}>📍</span>
                {!isOmakase && <Check className="w-6 h-6 text-primary" />}
              </div>
              <div className="font-extrabold text-xl font-sans">目的地を入力</div>
              <div className="text-sm opacity-90 font-sans text-left text-stone-500 font-medium">
                行きたい場所が決まっている方はこちら
              </div>
            </JournalButton>

            {/* Omakase Tile */}
            <JournalButton
              variant={isOmakase ? "primary" : "outline"}
              onClick={() => {
                if (!isOmakase) toggleOmakase();
              }}
              className={`h-auto p-6 flex flex-col items-start gap-4 border-2 shadow-sm transition-all rounded-xl ${isOmakase ? "border-primary bg-white ring-2 ring-primary/10 text-primary shadow-md" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-3xl ${isOmakase ? "opacity-100" : "opacity-70"}`}>🎲</span>
                {isOmakase && <Check className="w-6 h-6 text-primary" />}
              </div>
              <div className="font-extrabold text-xl font-sans">おまかせで決める</div>
              <div className="text-sm opacity-90 font-sans text-left text-stone-500 font-medium">
                AIに提案してほしい方はこちら
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
                className="pt-4"
              >
                <div className="bg-white border-2 border-stone-200 rounded-xl p-5 space-y-3 relative shadow-sm">
                  <label className="block text-base font-bold text-stone-700 font-sans">
                    どんな旅にしたい？
                  </label>
                  <textarea
                    value={input.travelVibe || ""}
                    onChange={(e) => onChange({ travelVibe: e.target.value })}
                    placeholder="例：南の島でリゾート、ヨーロッパの古い街並み、温泉でゆっくり..."
                    className="w-full h-32 bg-stone-50 border border-stone-300 rounded-lg p-4 text-lg font-sans placeholder:text-stone-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors resize-none leading-relaxed text-stone-800"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="direct-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4"
              >
                {/* Tags */}
                {input.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {input.destinations.map((dest, index) => (
                      <span
                        key={dest}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-stone-200 rounded-full text-stone-800 font-bold font-sans shadow-sm text-base"
                      >
                        {dest}
                        <button
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="hover:text-red-500 transition-colors bg-stone-100 rounded-full p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input Field - HIGH VISIBILITY FIX */}
                <div className="flex gap-3 items-stretch">
                  <div className="flex-1 relative group">
                    <input
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      onKeyDown={handleDestinationKeyDown}
                      placeholder={input.destinations.length === 0 ? "例：京都、パリ、ハワイ..." : "次の行き先を追加..."}
                      className="w-full h-14 px-5 text-lg bg-white border-2 border-stone-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-stone-800 placeholder:text-stone-400 font-sans shadow-sm"
                    />
                  </div>
                  <JournalButton
                    variant="secondary"
                    onClick={addDestination}
                    disabled={!destinationInput.trim()}
                    className="h-14 w-14 p-0 rounded-xl shadow-md border-2 border-stone-200 hover:border-primary/50 bg-stone-800 text-white hover:bg-stone-700"
                  >
                    <Plus className="w-7 h-7" />
                  </JournalButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-lg font-extrabold text-stone-800 font-sans ml-1">
              日程
            </label>

            {/* Toggle Switch */}
            <div className="flex text-sm font-bold font-sans gap-2 bg-stone-100 p-1 rounded-full">
                <button
                    type="button"
                    onClick={() => {
                        setUseCalendar(false);
                        onChange({ dates: formatDuration(duration || 3) });
                        setStartDate("");
                        setEndDate("");
                    }}
                    className={`px-4 py-2 rounded-full transition-all ${
                        !useCalendar
                            ? "bg-white text-stone-800 shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                    }`}
                >
                    日数
                </button>
                <button
                    type="button"
                    onClick={() => setUseCalendar(true)}
                    className={`px-4 py-2 rounded-full transition-all ${
                        useCalendar
                            ? "bg-white text-stone-800 shadow-sm"
                            : "text-stone-500 hover:text-stone-700"
                    }`}
                >
                    カレンダー
                </button>
            </div>
          </div>

          {useCalendar ? (
            <div className="bg-white p-6 rounded-xl border-2 border-stone-200 space-y-5 relative shadow-sm">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                        <span className="text-sm font-bold text-stone-500 font-sans">出発日</span>
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
                            className="w-full p-4 bg-stone-50 border border-stone-300 font-sans text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-stone-800 rounded-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-bold text-stone-500 font-sans">帰着日</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                            className="w-full p-4 bg-stone-50 border border-stone-300 font-sans text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-stone-800 rounded-lg"
                        />
                    </div>
                </div>
                <div className="text-center font-sans pt-2">
                    {startDate && endDate ? (
                        <p className="text-lg font-bold text-primary inline-block bg-primary/5 px-4 py-2 rounded-full">
                           🗓️ {startDate} 〜 {endDate} ({duration - 1}泊{duration}日)
                        </p>
                    ) : (
                        <p className="text-sm text-stone-500 font-bold">日付を選択してください</p>
                    )}
                </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
                {/* Custom Duration (Top) */}
                <div className="flex items-center justify-center gap-8 py-8 bg-white border-2 border-stone-200 shadow-sm rounded-xl mx-1">
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.max(1, duration - 1))}
                        className="w-14 h-14 rounded-full border-2 border-stone-200 text-stone-500 hover:border-primary hover:text-primary flex items-center justify-center transition-all bg-white shadow-sm"
                    >
                        <Minus className="w-6 h-6" />
                    </button>
                    <span className="text-4xl font-extrabold text-stone-800 min-w-[160px] text-center font-sans">
                        {formatDuration(duration)}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.min(30, duration + 1))}
                        className="w-14 h-14 rounded-full bg-stone-800 text-white hover:bg-stone-700 flex items-center justify-center transition-all shadow-md"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                {/* Preset Buttons (Bottom) */}
                <div className="flex flex-wrap justify-center gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDurationChange(opt.value)}
                        className={`py-2 px-4 text-sm font-sans font-bold rounded-full border-2 transition-all ${
                        duration === opt.value
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-stone-200 bg-white hover:border-stone-300 text-stone-500"
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
        <div className="space-y-4">
          <label className="block text-lg font-extrabold text-stone-800 font-sans ml-1 mb-2">
            誰と行く？
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COMPANION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ companions: opt.id })}
                className={`py-5 px-3 text-sm font-sans font-bold rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 shadow-sm ${
                  input.companions === opt.id
                    ? "border-primary bg-white text-stone-800 shadow-md ring-2 ring-primary/20"
                    : "border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800 hover:border-stone-300"
                }`}
              >
                <span className="text-3xl">{opt.icon}</span>
                <span className="text-base">{opt.label}</span>
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
            subtitle={isPhase2Complete ? "入力完了" : "推奨"}
            isOpen={phase2Open}
            onToggle={() => setPhase2Open(!phase2Open)}
            isComplete={isPhase2Complete}
            icon={<span className="text-sm">2</span>}
        >
            <div className="space-y-10 py-2">
            {/* Theme Selection */}
            <div className="space-y-4">
                <label className="block text-base font-bold text-stone-700 font-sans">
                テーマ（複数選択可）
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEME_OPTIONS.map((theme) => {
                    const Icon = theme.icon;
                    const isSelected = input.theme.includes(theme.id);
                    return (
                    <button
                        key={theme.id}
                        type="button"
                        onClick={() => toggleTheme(theme.id)}
                        className={`py-4 px-3 text-sm font-bold rounded-xl border-2 transition-all flex flex-col items-center gap-2 font-sans shadow-sm min-h-[6rem] justify-center ${
                        isSelected
                            ? "border-primary bg-white text-primary shadow-md"
                            : "border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        <Icon size={24} />
                        <span>{theme.label}</span>
                    </button>
                    );
                })}
                </div>
            </div>

            {/* Budget Selection */}
            <div className="space-y-4">
                <label className="block text-base font-bold text-stone-700 font-sans">
                予算感
                </label>

                {/* Mode Switch (Slider vs Presets) */}
                {!useBudgetSlider ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BUDGET_PRESETS.map((opt) => (
                        <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange({ budget: opt.id })}
                        className={`py-4 px-3 text-sm font-bold rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 h-32 font-sans shadow-sm ${
                            input.budget === opt.id
                            ? "border-primary bg-white text-primary shadow-md"
                            : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                        }`}
                        >
                        <span className="text-3xl">{opt.icon}</span>
                        <span className="font-bold text-base">{opt.label}</span>
                        <span className="text-xs text-stone-400 font-sans font-medium text-center leading-tight">{opt.desc}</span>
                        </button>
                    ))}
                    </div>
                    <button
                    type="button"
                    onClick={() => toggleBudgetSlider(true)}
                    className="w-full py-4 px-4 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-600 text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-stone-200"
                    >
                    <span>🎚️</span>
                    <span>具体的な金額で指定する</span>
                    </button>
                </div>
                ) : (
                <div className="bg-white border-2 border-stone-200 rounded-xl p-6 space-y-6 relative shadow-sm">
                    <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-stone-500 font-sans">金額範囲を指定</span>
                    <button
                        type="button"
                        onClick={() => toggleBudgetSlider(false)}
                        className="text-sm text-stone-400 hover:text-stone-600 underline font-sans"
                    >
                        選択式に戻す
                    </button>
                    </div>

                    <div className="text-center py-2">
                    <span className="text-3xl font-bold text-stone-800 font-mono">
                        {formatBudget(budgetMinAmount)} <span className="text-stone-300 text-xl mx-2">〜</span> {formatBudget(budgetMaxAmount)}
                    </span>
                    </div>

                    {/* Slider UI */}
                    <div className="relative pt-2 pb-6 px-4">
                    <div className="relative h-3 bg-stone-200 rounded-full">
                        <div
                            className="absolute h-full bg-primary rounded-full"
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
                        className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer z-20 pointer-events-auto top-2"
                    />
                    <input
                        type="range"
                        min={0}
                        max={SLIDER_MAX}
                        step={1}
                        value={maxIndex}
                        onChange={(e) => handleBudgetMaxIndexChange(Number(e.target.value))}
                        className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer z-20 pointer-events-auto top-2"
                    />
                    {/* Thumb Indicators */}
                    <div
                        className="absolute w-7 h-7 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10 top-[-8px] pointer-events-none"
                        style={{ left: `${minPercent}%` }}
                    />
                    <div
                        className="absolute w-7 h-7 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10 top-[-8px] pointer-events-none"
                        style={{ left: `${maxPercent}%` }}
                    />
                    </div>
                </div>
                )}
            </div>

            {/* Pace Selection */}
            <div className="space-y-4">
                <label className="block text-base font-bold text-stone-700 font-sans">
                旅のペース
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PACE_OPTIONS.map((opt) => (
                    <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ pace: opt.id })}
                    className={`py-5 px-3 text-sm font-bold rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 font-sans shadow-sm min-h-[8rem] ${
                        input.pace === opt.id
                        ? "border-primary bg-white text-stone-800 shadow-md"
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                    }`}
                    >
                    <span className="text-3xl">{opt.icon}</span>
                    <span className="text-base">{opt.label}</span>
                    <span className="text-xs text-stone-400 font-medium text-center leading-tight">{opt.desc}</span>
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
            subtitle="任意設定"
            isOpen={phase3Open}
            onToggle={() => setPhase3Open(!phase3Open)}
            isComplete={isPhase3Complete}
            icon={<span className="text-sm">3</span>}
        >
            <div className="space-y-10 py-2">

            {/* Reservations (Fixed Schedule) */}
            <div className="space-y-4">
              <label className="block text-base font-bold text-stone-700 font-sans">
                予約済みの予定（飛行機・ホテル等）
              </label>

              {/* List of added reservations */}
              {input.fixedSchedule && input.fixedSchedule.length > 0 && (
                <div className="grid gap-3 mb-3">
                  {input.fixedSchedule.map((item, index) => (
                    <div key={index} className="bg-white border-2 border-stone-200 rounded-xl p-4 flex items-start gap-4 shadow-sm relative">
                       <button
                          onClick={() => removeReservation(index)}
                          className="absolute top-3 right-3 text-stone-400 hover:text-red-500 transition-colors p-2 bg-stone-50 rounded-full"
                        >
                          <X size={16} />
                        </button>
                      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 flex-shrink-0 border border-stone-200">
                         {item.type === 'flight' && <FaPlane size={20} />}
                         {item.type === 'train' && <FaTrain size={20} />}
                         {item.type === 'bus' && <FaBus size={20} />}
                         {item.type === 'hotel' && <FaHotel size={20} />}
                         {item.type === 'activity' && <FaTicketAlt size={20} />}
                         {item.type === 'other' && <FaQuestion size={20} />}
                      </div>
                      <div className="pt-1">
                        <div className="font-bold text-stone-800 font-sans text-lg">{item.name}</div>
                        <div className="text-sm text-stone-500 font-mono flex items-center gap-3 mt-1 font-bold">
                          {item.date && (
                            <span className="flex items-center gap-1"><FaCalendarAlt size={12} /> {item.date}</span>
                          )}
                          {item.time && (
                             <span className="flex items-center gap-1"><FaClock size={12} /> {item.time}</span>
                          )}
                        </div>
                        {item.notes && (
                           <div className="text-sm text-stone-500 mt-2 font-sans border-t border-stone-100 pt-2">{item.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Reservation Form */}
              {isAddingReservation ? (
                <div className="bg-stone-50 border-2 border-stone-200 rounded-xl p-5 space-y-4 shadow-inner relative animate-in fade-in zoom-in-95 duration-200">
                  <div className="font-bold text-base text-stone-700 font-sans mb-1">予定を追加</div>

                  {/* Type Selector */}
                  <div className="grid grid-cols-3 gap-2">
                     {RESERVATION_TYPES.map(type => (
                       <button
                         key={type.id}
                         onClick={() => setResType(type.id as FixedScheduleItem['type'])}
                         className={`p-3 text-xs font-bold rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                            resType === type.id
                            ? 'bg-white border-primary text-primary'
                            : 'bg-white border-stone-200 text-stone-400 hover:bg-stone-50'
                         }`}
                       >
                          <type.icon size={20} />
                          {type.label}
                       </button>
                     ))}
                  </div>

                  {/* Name */}
                  <input
                    type="text"
                    value={resName}
                    onChange={e => setResName(e.target.value)}
                    placeholder="名前（例：JL123便、ヒルトン東京）"
                    className="w-full h-12 px-4 border border-stone-300 rounded-lg text-base font-sans focus:outline-none focus:border-primary text-stone-800"
                  />

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={resDate}
                      onChange={e => setResDate(e.target.value)}
                      className="w-full h-12 px-3 border border-stone-300 rounded-lg text-base font-sans focus:outline-none focus:border-primary text-stone-800"
                    />
                    <input
                      type="time"
                      value={resTime}
                      onChange={e => setResTime(e.target.value)}
                      className="w-full h-12 px-3 border border-stone-300 rounded-lg text-base font-sans focus:outline-none focus:border-primary text-stone-800"
                    />
                  </div>

                  {/* Notes */}
                  <textarea
                    value={resNotes}
                    onChange={e => setResNotes(e.target.value)}
                    placeholder="メモ（任意）"
                    className="w-full p-3 border border-stone-300 rounded-lg text-base font-sans focus:outline-none focus:border-primary h-24 resize-none text-stone-800"
                  />

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setIsAddingReservation(false)}
                      className="px-5 py-3 text-sm font-bold text-stone-500 hover:bg-stone-200 rounded-lg transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={addReservation}
                      disabled={!resName.trim()}
                      className="px-8 py-3 text-sm font-bold bg-stone-800 text-white rounded-lg shadow-sm hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                      追加
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingReservation(true)}
                  className="w-full py-4 border-2 border-stone-300 rounded-xl text-stone-500 font-bold text-base hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-3 bg-white hover:bg-stone-50"
                >
                  <Plus size={20} /> 予約済みの予定を追加
                </button>
              )}
            </div>

            {/* Preferred Transport */}
            <div className="space-y-4">
                <label className="block text-base font-bold text-stone-700 font-sans">
                    希望する移動手段
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {TRANSPORT_OPTIONS.map((opt) => {
                    const isSelected = input.preferredTransport?.includes(opt.id) || false;
                    const Icon = opt.icon;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleTransport(opt.id)}
                            className={`py-3 px-4 text-xs font-bold rounded-xl border-2 transition-all flex items-center gap-3 font-sans shadow-sm h-14 ${
                                isSelected
                                ? "border-primary bg-white text-primary shadow-md"
                                : "border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800"
                            }`}
                        >
                            <Icon size={18} />
                            <span className="text-sm">{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                    );
                    })}
                </div>
            </div>

            {/* Must-Visit Places */}
            <div className="space-y-4">
                <label className="block text-base font-bold text-stone-700 font-sans">
                絶対行きたい場所
                </label>

                {/* Added Places */}
                {(input.mustVisitPlaces?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {input.mustVisitPlaces?.map((place, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-lg text-base font-sans font-bold shadow-sm"
                    >
                        📍 {place}
                        <button
                        type="button"
                        onClick={() => removePlace(index)}
                        className="hover:text-red-500 transition-colors bg-stone-100 rounded-full p-1"
                        >
                        <X className="w-3.5 h-3.5" />
                        </button>
                    </span>
                    ))}
                </div>
                )}

                <div className="flex gap-3 w-full items-stretch">
                  <div className="flex-1">
                    <input
                        value={placeInput}
                        onChange={(e) => setPlaceInput(e.target.value)}
                        onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addPlace();
                        }
                        }}
                        placeholder="場所名を入力（例：清水寺）"
                        className="w-full h-14 px-5 text-base bg-white border-2 border-stone-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-stone-800 placeholder:text-stone-400 font-sans shadow-sm"
                    />
                  </div>

                <JournalButton
                    variant="secondary"
                    onClick={addPlace}
                    disabled={!placeInput.trim()}
                    className="h-14 w-14 p-0 rounded-xl shadow-md border-2 border-stone-200 hover:border-primary/50 bg-stone-800 text-white hover:bg-stone-700"
                    >
                    <FaPlus className="w-6 h-6" />
                </JournalButton>
                </div>
            </div>

            {/* Free Text */}
            <div className="space-y-4">
                <label className="block text-base font-bold text-stone-700 font-sans">
                その他のリクエスト
                </label>
                <div className="bg-white border-2 border-stone-300 rounded-xl p-4 relative shadow-sm">
                    <textarea
                        value={input.freeText || ""}
                        onChange={(e) => onChange({ freeText: e.target.value })}
                        placeholder="美術館巡りがしたい、夜景が綺麗なレストランに行きたい、など自由に入力してください..."
                        className="w-full h-32 bg-transparent border-none p-1 text-base font-sans placeholder:text-stone-400 focus:outline-none resize-none leading-relaxed text-stone-800"
                    />
                </div>
            </div>

            </div>
        </AccordionSection>
      </div>

      </div>

      {/* Unified Generate Button (Always visible at bottom) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-10 px-2 pb-24 sm:pb-12"
      >
        <JournalButton
          variant="primary"
          size="lg"
          onClick={handleGenerateClick}
          disabled={isGenerating || !canGenerate}
          className="w-full h-20 text-xl font-bold shadow-xl hover:scale-[1.01] transition-transform font-sans rounded-2xl flex flex-col items-center justify-center gap-1"
        >
          {isGenerating ? (
            <div className="flex items-center">
              <span className="animate-spin mr-3 text-2xl">⏳</span>
              <span>プランを作成中...</span>
            </div>
          ) : !canGenerate ? (
            <div className="flex items-center text-stone-500">
              <span className="mr-3 text-2xl">⚠️</span>
              <span>必須項目を入力してください</span>
            </div>
          ) : hasDetailedInput ? (
            <>
              <div className="flex items-center">
                <span className="mr-3 text-2xl">✨</span>
                <span>詳細条件でプランを作成</span>
              </div>
              <span className="text-xs font-normal opacity-80">AIがすべての条件を考慮して作成します</span>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <span className="mr-3 text-2xl">✨</span>
                <span>とりあえず生成する</span>
              </div>
              <span className="text-xs font-normal opacity-80">詳細条件なしで手軽に作成します</span>
            </>
          )}
        </JournalButton>
      </motion.div>
    </div>
  );
}
