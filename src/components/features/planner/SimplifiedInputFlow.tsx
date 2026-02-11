"use client";

import { useState, useEffect, useCallback, KeyboardEvent, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserInput, FixedScheduleItem } from "@/types";
import { ChevronDown, Check, X, Plus, Minus, Calendar, Users, MapPin, DollarSign } from "lucide-react";
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
  FaPlane,
  FaTrain,
  FaBus,
  FaCar,
  FaShip,
  FaHotel,
  FaTicketAlt,
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
// UI Components (Clean Style)
// ============================================================================

const SectionTitle = ({ icon: Icon, title, required = false }: { icon: any, title: string, required?: boolean }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-stone-900">{title}</h2>
        {required && (
          <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">必須</span>
        )}
      </div>
    </div>
  </div>
);

const CardButton = ({
  selected,
  onClick,
  children,
  className = ""
}: {
  selected: boolean,
  onClick: () => void,
  children: React.ReactNode,
  className?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      relative w-full p-4 rounded-xl border-2 text-left transition-all duration-200
      ${selected
        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
      }
      ${className}
    `}
  >
    {children}
    {selected && (
      <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
        <Check className="w-4 h-4 text-white" />
      </div>
    )}
  </button>
);

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
  const [showDetailed, setShowDetailed] = useState(false);

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
    ? true // Simplification: assume if calendar mode is on, user will pick dates eventually or it's fine
    : (input.dates === "未定" || !!input.dates);

  const canGenerate = hasDest && hasCompanion && hasValidDates;

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
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-10 pb-32"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">
          旅行プラン作成
        </h1>
        <p className="text-stone-500 font-medium">
          あなたの理想をAIが形にします
        </p>
      </div>

      {/* STEP 1: Destination */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <SectionTitle icon={MapPin} title="どこに行きますか？" required />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <CardButton
            selected={!isOmakase}
            onClick={() => { if (isOmakase) toggleOmakase(); }}
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="text-3xl">📍</span>
              <span className="font-bold text-lg text-stone-900">目的地を指定</span>
              <span className="text-sm text-stone-500">行きたい場所が決まっている</span>
            </div>
          </CardButton>

          <CardButton
            selected={isOmakase}
            onClick={() => { if (!isOmakase) toggleOmakase(); }}
          >
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="text-3xl">🎲</span>
              <span className="font-bold text-lg text-stone-900">おまかせで決める</span>
              <span className="text-sm text-stone-500">AIに提案してほしい</span>
            </div>
          </CardButton>
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {isOmakase ? (
              <motion.div
                key="omakase"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <label className="block text-sm font-bold text-stone-700 mb-2">どんな旅にしたい？</label>
                <textarea
                  value={input.travelVibe || ""}
                  onChange={(e) => onChange({ travelVibe: e.target.value })}
                  placeholder="例：南の島でリゾート、ヨーロッパの古い街並み、温泉でゆっくり..."
                  className="w-full h-32 p-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none text-stone-900 placeholder:text-stone-400 font-medium"
                />
              </motion.div>
            ) : (
              <motion.div
                key="direct"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {input.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {input.destinations.map((dest, index) => (
                      <span key={dest} className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-full text-sm">
                        {dest}
                        <button onClick={() => removeDestination(index)} className="hover:text-primary/70">
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onKeyDown={handleDestinationKeyDown}
                    placeholder="場所を入力（例：京都、パリ...）"
                    className="flex-1 h-12 px-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all text-stone-900 font-medium"
                  />
                  <button
                    onClick={addDestination}
                    disabled={!destinationInput.trim()}
                    className="h-12 px-6 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    追加
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* STEP 2: Dates */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <SectionTitle icon={Calendar} title="いつ行きますか？" required />

        <div className="flex bg-stone-100 p-1 rounded-lg mb-6 max-w-sm mx-auto">
          <button
            onClick={() => {
              setUseCalendar(false);
              onChange({ dates: formatDuration(duration || 3) });
            }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
              !useCalendar ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            日数のみ
          </button>
          <button
            onClick={() => setUseCalendar(true)}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
              useCalendar ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            カレンダー
          </button>
        </div>

        {useCalendar ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-600">出発日</label>
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
                className="w-full h-12 px-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-primary focus:bg-white text-stone-900 font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-600">帰着日</label>
              <input
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                className="w-full h-12 px-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-primary focus:bg-white text-stone-900 font-medium"
              />
            </div>
            <div className="sm:col-span-2 text-center pt-2">
              {startDate && endDate ? (
                  <p className="text-base font-bold text-primary">
                      {startDate} 〜 {endDate} ({duration - 1}泊{duration}日)
                  </p>
              ) : (
                  <p className="text-sm text-stone-400">日付を選択してください</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => handleDurationChange(Math.max(1, duration - 1))}
                className="w-14 h-14 rounded-full border-2 border-stone-200 hover:border-primary hover:text-primary flex items-center justify-center transition-colors bg-white text-stone-400"
              >
                <Minus className="w-6 h-6" />
              </button>
              <div className="text-center w-32">
                <span className="block text-4xl font-bold text-stone-900">{formatDuration(duration)}</span>
              </div>
              <button
                onClick={() => handleDurationChange(Math.min(30, duration + 1))}
                className="w-14 h-14 rounded-full bg-stone-900 text-white hover:bg-stone-700 flex items-center justify-center transition-colors shadow-md"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleDurationChange(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                    duration === opt.value
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* STEP 3: Companions */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <SectionTitle icon={Users} title="誰と行きますか？" required />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COMPANION_OPTIONS.map((opt) => (
            <CardButton
              key={opt.id}
              selected={input.companions === opt.id}
              onClick={() => onChange({ companions: opt.id })}
              className="flex flex-col items-center justify-center gap-2 py-4 h-24"
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className="font-bold text-stone-800 text-sm">{opt.label}</span>
            </CardButton>
          ))}
        </div>
      </section>

      {/* STEP 4: Style */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
        <SectionTitle icon={DollarSign} title="旅のスタイル（任意）" />

        <div className="space-y-8">
          {/* Theme */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 block">テーマ（複数選択可）</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEME_OPTIONS.map((theme) => {
                const Icon = theme.icon;
                return (
                  <CardButton
                    key={theme.id}
                    selected={input.theme.includes(theme.id)}
                    onClick={() => toggleTheme(theme.id)}
                    className="flex flex-col items-center justify-center gap-2 h-20"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-bold text-xs">{theme.label}</span>
                  </CardButton>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 block">予算感</label>
            {!useBudgetSlider ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BUDGET_PRESETS.map((opt) => (
                  <CardButton
                    key={opt.id}
                    selected={input.budget === opt.id}
                    onClick={() => onChange({ budget: opt.id })}
                    className="flex flex-col items-center justify-center gap-1 h-24"
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-bold text-sm">{opt.label}</span>
                    <span className="text-xs text-stone-400">{opt.desc}</span>
                  </CardButton>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {formatBudget(budgetMinAmount)} 〜 {formatBudget(budgetMaxAmount)}
                  </span>
                </div>
                {/* Simplified Slider UI for Clean Style */}
                <div className="relative pt-6 pb-2 px-2">
                   <div className="h-2 bg-stone-200 rounded-full relative">
                      <div
                          className="absolute h-full bg-primary rounded-full"
                          style={{
                          left: `${minPercent}%`,
                          width: `${maxPercent - minPercent}%`,
                          }}
                      />
                   </div>
                   <input
                      type="range"
                      min={0}
                      max={SLIDER_MAX}
                      step={1}
                      value={minIndex}
                      onChange={(e) => handleBudgetMinIndexChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   />
                   <input
                      type="range"
                      min={0}
                      max={SLIDER_MAX}
                      step={1}
                      value={maxIndex}
                      onChange={(e) => handleBudgetMaxIndexChange(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   />
                </div>
              </div>
            )}
            <button
              onClick={() => toggleBudgetSlider(!useBudgetSlider)}
              className="text-xs font-bold text-primary hover:underline ml-1"
            >
              {useBudgetSlider ? "選択式に戻す" : "具体的な金額で指定する"}
            </button>
          </div>

          {/* Pace */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-stone-700 block">旅のペース</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PACE_OPTIONS.map((opt) => (
                <CardButton
                  key={opt.id}
                  selected={input.pace === opt.id}
                  onClick={() => onChange({ pace: opt.id })}
                  className="flex flex-col items-center justify-center gap-1 h-24"
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="font-bold text-sm">{opt.label}</span>
                  <span className="text-xs text-stone-400">{opt.desc}</span>
                </CardButton>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STEP 5: Detailed Options (Toggle) */}
      <section className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowDetailed(!showDetailed)}
          className="w-full flex items-center justify-between p-6 hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
               <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
               <h2 className="text-xl font-bold text-stone-900">詳細設定（任意）</h2>
               <p className="text-sm text-stone-500">行きたい場所、交通手段、予約など</p>
            </div>
          </div>
          <ChevronDown className={`w-6 h-6 text-stone-400 transition-transform ${showDetailed ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showDetailed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-stone-100"
            >
              <div className="p-6 space-y-8">
                {/* Must Visit */}
                <div className="space-y-3">
                   <label className="text-sm font-bold text-stone-700 block">絶対行きたい場所</label>
                   {input.mustVisitPlaces && input.mustVisitPlaces.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {input.mustVisitPlaces.map((place, index) => (
                          <span key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-lg text-sm font-bold text-stone-700">
                             📍 {place}
                             <button onClick={() => removePlace(index)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                   )}
                   <div className="flex gap-2">
                      <input
                        value={placeInput}
                        onChange={(e) => setPlaceInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPlace()}
                        placeholder="場所名を入力（例：清水寺）"
                        className="flex-1 h-10 px-4 bg-stone-50 border border-stone-200 rounded-lg focus:border-primary focus:bg-white transition-all text-sm"
                      />
                      <button onClick={addPlace} disabled={!placeInput.trim()} className="h-10 px-4 bg-stone-200 hover:bg-stone-300 rounded-lg text-stone-700 font-bold text-sm disabled:opacity-50">
                        追加
                      </button>
                   </div>
                </div>

                {/* Transport */}
                <div className="space-y-3">
                   <label className="text-sm font-bold text-stone-700 block">希望する移動手段</label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TRANSPORT_OPTIONS.map((opt) => {
                         const Icon = opt.icon;
                         return (
                            <CardButton
                               key={opt.id}
                               selected={input.preferredTransport?.includes(opt.id) || false}
                               onClick={() => toggleTransport(opt.id)}
                               className="flex items-center gap-3 py-3 px-4 h-auto justify-start"
                            >
                               <Icon className="w-4 h-4" />
                               <span className="font-bold text-xs">{opt.label}</span>
                            </CardButton>
                         )
                      })}
                   </div>
                </div>

                {/* Reservations */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-stone-700 block">予約済みの予定</label>

                  {input.fixedSchedule && input.fixedSchedule.length > 0 && (
                     <div className="grid gap-2 mb-3">
                        {input.fixedSchedule.map((item, index) => (
                           <div key={index} className="bg-stone-50 border border-stone-200 rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                    {item.type === 'flight' ? <FaPlane /> : <FaTicketAlt />}
                                 </div>
                                 <div>
                                    <div className="font-bold text-sm text-stone-800">{item.name}</div>
                                    <div className="text-xs text-stone-500">{item.date} {item.time}</div>
                                 </div>
                              </div>
                              <button onClick={() => removeReservation(index)} className="text-stone-400 hover:text-red-500">
                                 <X className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  )}

                  {isAddingReservation ? (
                     <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                           {RESERVATION_TYPES.map(type => (
                              <button
                                 key={type.id}
                                 onClick={() => setResType(type.id as any)}
                                 className={`p-2 text-xs font-bold rounded-md border ${
                                    resType === type.id ? 'bg-white border-primary text-primary shadow-sm' : 'bg-transparent border-transparent text-stone-500'
                                 }`}
                              >
                                 {type.label}
                              </button>
                           ))}
                        </div>
                        <input
                           placeholder="名前（例：JL123便）"
                           value={resName}
                           onChange={e => setResName(e.target.value)}
                           className="w-full p-2 text-sm border border-stone-300 rounded-md"
                        />
                        <div className="grid grid-cols-2 gap-2">
                           <input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className="p-2 text-sm border border-stone-300 rounded-md" />
                           <input type="time" value={resTime} onChange={e => setResTime(e.target.value)} className="p-2 text-sm border border-stone-300 rounded-md" />
                        </div>
                        <div className="flex justify-end gap-2">
                           <button onClick={() => setIsAddingReservation(false)} className="text-xs font-bold text-stone-500 px-3 py-2">キャンセル</button>
                           <button onClick={addReservation} disabled={!resName} className="text-xs font-bold bg-primary text-white px-4 py-2 rounded-md disabled:opacity-50">追加</button>
                        </div>
                     </div>
                  ) : (
                     <button
                        onClick={() => setIsAddingReservation(true)}
                        className="w-full py-3 border border-dashed border-stone-300 rounded-lg text-stone-500 font-bold text-sm hover:border-primary hover:text-primary hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                     >
                        <Plus className="w-4 h-4" /> 予定を追加
                     </button>
                  )}
                </div>

                 {/* Free Text */}
                <div className="space-y-3">
                   <label className="text-sm font-bold text-stone-700 block">その他のリクエスト</label>
                   <textarea
                      value={input.freeText || ""}
                      onChange={(e) => onChange({ freeText: e.target.value })}
                      placeholder="自由に入力してください..."
                      className="w-full h-24 p-3 bg-stone-50 border border-stone-200 rounded-lg focus:border-primary focus:bg-white text-sm"
                   />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Floating Action Button / Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-stone-200 z-50 sm:static sm:bg-transparent sm:border-0 sm:p-0">
        <div className="max-w-4xl mx-auto">
            <button
                onClick={handleGenerateClick}
                disabled={isGenerating || !canGenerate}
                className="w-full h-14 bg-primary text-white font-bold text-lg rounded-xl shadow-lg hover:bg-primary/90 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 transform active:scale-95"
            >
                {isGenerating ? (
                    <>
                        <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        プランを作成中...
                    </>
                ) : !canGenerate ? (
                    "必須項目を入力してください"
                ) : (
                    <>
                        <span>✨</span>
                        プランを作成する
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
