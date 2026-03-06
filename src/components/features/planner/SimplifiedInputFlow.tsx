"use client";

import { useState, useEffect, useCallback, KeyboardEvent, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
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
  JournalButton,
  Tape,
  Stamp
} from "@/components/ui/journal";

// ============================================================================
// Constants
// ============================================================================

const COMPANION_OPTIONS = [
  { id: "solo", key: "solo", icon: "👤" },
  { id: "couple", key: "couple", icon: "💑" },
  { id: "family", key: "family", icon: "👨‍👩‍👧‍👦" },
  { id: "friends", key: "friends", icon: "👯" },
  { id: "male_trip", key: "male_trip", icon: "🍻" },
  { id: "female_trip", key: "female_trip", icon: "💅" },
  { id: "backpacker", key: "backpacker", icon: "🎒" },
  { id: "business", key: "business", icon: "💼" },
  { id: "pet", key: "pet", icon: "🐕" },
];

const THEME_OPTIONS = [
  { key: "gourmet", icon: FaUtensils },
  { key: "historyCulture", icon: FaLandmark },
  { key: "natureScenery", icon: FaMountain },
  { key: "relax", icon: FaCoffee },
  { key: "hiddenSpots", icon: FaSearch },
  { key: "shopping", icon: FaShoppingBag },
  { key: "art", icon: FaPalette },
  { key: "experienceActivity", icon: FaRunning },
  { key: "onsenSauna", icon: FaHotTub },
  { key: "photogenic", icon: FaCamera },
  { key: "adventure", icon: FaCompass },
  { key: "other", icon: FaQuestion },
];

const BUDGET_PRESETS = [
  { id: "saving", key: "saving", icon: "💸" },
  { id: "standard", key: "standard", icon: "💰" },
  { id: "high", key: "high", icon: "✨" },
  { id: "luxury", key: "luxury", icon: "💎" },
];

const PACE_OPTIONS = [
  { id: "relaxed", key: "relaxed", icon: "☕" },
  { id: "balanced", key: "balanced", icon: "⚖️" },
  { id: "active", key: "active", icon: "👟" },
  { id: "packed", key: "packed", icon: "🔥" },
];

const DURATION_OPTIONS = [
  { value: 0 },
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
  { value: 5 },
  { value: 6 },
  { value: 7 },
];

const TRANSPORT_OPTIONS = [
  { id: "flight", key: "flight", icon: FaPlane },
  { id: "shinkansen", key: "shinkansen", icon: FaTrain },
  { id: "train", key: "train", icon: FaTrain },
  { id: "bus", key: "bus", icon: FaBus },
  { id: "car", key: "car", icon: FaCar },
  { id: "ferry", key: "ferry", icon: FaShip },
];

const RESERVATION_TYPES = [
  { id: "flight", key: "flight", icon: FaPlane },
  { id: "train", key: "train", icon: FaTrain },
  { id: "bus", key: "bus", icon: FaBus },
  { id: "hotel", key: "hotel", icon: FaHotel },
  { id: "activity", key: "activity", icon: FaTicketAlt },
  { id: "other", key: "other", icon: FaQuestion },
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

function parseDurationValue(
  str: string,
  labels: { undecided: string; dayTrip: string }
): number {
  if (!str) return 3;
  if (str === labels.undecided) return 0;
  if (str.includes(labels.dayTrip)) return 1;
  const numbers = str.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const last = Number(numbers[numbers.length - 1]);
    if (Number.isFinite(last) && last > 0 && last < 1000) {
      return last;
    }
  }
  return 3;
}

function formatBudget(amount: number, units: { tenThousandYen: string; yen: string }): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}${units.tenThousandYen}`;
  }
  return `${amount.toLocaleString()}${units.yen}`;
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
    <div className="border-b-2 border-stone-200 border-dashed pb-2 mb-6">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-4 py-4 flex items-center justify-between transition-colors rounded-lg border-2 border-transparent ${isOpen ? 'bg-stone-50 border-stone-100' : 'hover:bg-stone-50'}`}
      >
        <div className="flex items-center gap-4">
          {isComplete ? (
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center border border-primary/20 shadow-sm flex-shrink-0">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 text-stone-400 flex items-center justify-center font-bold font-sans text-sm bg-white flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="text-left flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-bold text-lg text-stone-800 font-sans">{title}</span>
            {subtitle && (
              <span className="text-xs text-stone-500 font-sans">{subtitle}</span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-6 h-6 text-stone-500" />
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
            <div className="p-4 bg-white/50 rounded-b-lg mt-1">{children}</div>
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
  isInModal: _isInModal = false,
}: SimplifiedInputFlowProps) {
  void _isInModal;
  const t = useTranslations("components.features.planner.simplifiedInputFlow");
  const tCompanion = useTranslations("components.features.planner.steps.stepCompanions.options");
  const tTheme = useTranslations("components.features.planner.steps.stepThemes.themes");
  const tThemeValue = useTranslations("components.features.planner.steps.stepThemes.themeValues");
  const tBudget = useTranslations("components.features.planner.steps.stepBudget.options");
  const tPace = useTranslations("components.features.planner.steps.stepPace.options");
  const tDateFormats = useTranslations("components.features.planner.steps.stepDates.formats");
  const containerRef = useRef<HTMLDivElement>(null);

  const durationLabels = useMemo(() => ({
    undecided: tDateFormats("dateUndecidedValue"),
    dayTrip: tDateFormats("dayTrip"),
  }), [tDateFormats]);

  const formatDuration = useCallback((days: number) => {
    if (days === 0) return durationLabels.undecided;
    if (days === 1) return durationLabels.dayTrip;
    return tDateFormats("nightsDays", { nights: days - 1, days });
  }, [durationLabels.dayTrip, durationLabels.undecided, tDateFormats]);

  const budgetUnits = {
    tenThousandYen: t("budget.units.tenThousandYen"),
    yen: t("budget.units.yen"),
  };

  const companionOptions = COMPANION_OPTIONS.map((opt) => ({
    ...opt,
    label: tCompanion(`${opt.key}.label`),
    desc: tCompanion(`${opt.key}.desc`),
  }));

  const themeOptions = THEME_OPTIONS.map((opt) => ({
    ...opt,
    label: tTheme(opt.key),
    value: tThemeValue(opt.key),
  }));

  const budgetPresets = BUDGET_PRESETS.map((opt) => ({
    ...opt,
    label: tBudget(`${opt.key}.label`),
    desc: tBudget(`${opt.key}.desc`),
  }));

  const paceOptions = PACE_OPTIONS.map((opt) => ({
    ...opt,
    label: tPace(`${opt.key}.label`),
    desc: tPace(`${opt.key}.desc`),
  }));

  const durationOptions = DURATION_OPTIONS.map((opt) => ({
    value: opt.value,
    label: formatDuration(opt.value),
  }));

  const transportOptions = TRANSPORT_OPTIONS.map((opt) => ({
    ...opt,
    label: t(`transport.options.${opt.key}`),
  }));

  const reservationTypes = RESERVATION_TYPES.map((type) => ({
    ...type,
    label: t(`reservation.types.${type.key}`),
  }));

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
  const duration = parseDurationValue(input.dates, durationLabels);
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
          const dur = parseDurationValue(input.dates, durationLabels);
          if (dur > 0) {
              const d = new Date(match[1]);
              d.setDate(d.getDate() + (dur - 1));
              setEndDate(d.toISOString().split('T')[0]);
          }
        });
    }
  }, [durationLabels, input.dates]);

  // Phase completion checks
  const hasDest = (input.destinations && input.destinations.length > 0) ||
                  input.isDestinationDecided === false ||
                  (destinationInput.trim().length > 0);

  const hasCompanion = !!input.companions;
  const hasValidDates = useCalendar
    ? true
    : (input.dates === durationLabels.undecided || !!input.dates);

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
        finalInput.dates = durationLabels.undecided;
        onChange({ dates: durationLabels.undecided });
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

        const dateString = tDateFormats("dateFromWithDuration", {
          date: startDate,
          duration: formatDuration(newDuration),
        });
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
            const dateString = tDateFormats("dateFromWithDuration", {
              date: newStart,
              duration: formatDuration(durationDays),
            });
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
      className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-6 scroll-mt-24"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 mb-2 font-sans">
          <span className="border-b-2 border-primary/30 pb-1">{t("header.title")}</span>
        </h1>
        <p className="text-stone-500 font-bold font-sans text-sm sm:text-base">
          {t("header.lead")}
        </p>
      </div>

      <JournalSheet variant="default" className="shadow-xl relative overflow-visible bg-[#fcfbf9] px-4 py-6 sm:p-8 border-l-8 border-l-stone-300/50">
         {/* Decorative Tape */}
         <Tape color="pink" position="top-right" className="opacity-80" />
         <Tape color="blue" position="bottom-left" className="opacity-80 -bottom-6 -left-2" />

      {/* ================================================================== */}
      {/* Phase 1: Essential (Always Visible) */}
      {/* ================================================================== */}
      <div className="space-y-10">
        <div className="flex items-center gap-3 mb-4 border-b-2 border-stone-200 border-dashed pb-2">
          <Stamp color="red" size="sm" className="w-12 h-12 text-sm border-2">{t("step1.badge")}</Stamp>
          <div className="flex flex-col">
             <span className="font-bold text-xl text-stone-800 font-sans">{t("step1.title")}</span>
             <span className="text-xs text-primary font-bold font-sans">
               {t("step1.requiredHint")}
             </span>
          </div>
        </div>

        {/* Destination Mode Selector */}
        <div className="space-y-4">
          <label className="block text-base font-bold text-stone-700 font-sans ml-1">
            {t("step1.destinationModeLabel")}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Specific Destination Tile */}
            <JournalButton
              variant={!isOmakase ? "primary" : "outline"}
              onClick={() => {
                if (isOmakase) toggleOmakase();
              }}
              className={`h-auto p-5 flex flex-col items-start gap-3 border-2 shadow-sm transition-all ${!isOmakase ? "border-primary bg-white ring-2 ring-primary/10 text-primary" : "border-stone-300 border-dashed bg-white text-stone-500"}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-3xl ${!isOmakase ? "opacity-100" : "opacity-50"}`}>📍</span>
                {!isOmakase && <Check className="w-6 h-6 text-primary" />}
              </div>
              <div className="font-bold text-lg font-sans">{t("step1.specific.title")}</div>
              <div className="text-sm opacity-70 font-sans text-left">
                {t("step1.specific.bodyLine1")}<br />{t("step1.specific.bodyLine2")}
              </div>
            </JournalButton>

            {/* Omakase Tile */}
            <JournalButton
              variant={isOmakase ? "primary" : "outline"}
              onClick={() => {
                if (!isOmakase) toggleOmakase();
              }}
              className={`h-auto p-5 flex flex-col items-start gap-3 border-2 shadow-sm transition-all ${isOmakase ? "border-primary bg-white ring-2 ring-primary/10 text-primary" : "border-stone-300 border-dashed bg-white text-stone-500"}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-3xl ${isOmakase ? "opacity-100" : "opacity-50"}`}>🎲</span>
                {isOmakase && <Check className="w-6 h-6 text-primary" />}
              </div>
              <div className="font-bold text-lg font-sans">{t("step1.omakase.title")}</div>
              <div className="text-sm opacity-70 font-sans text-left">
                {t("step1.omakase.bodyLine1")}<br />{t("step1.omakase.bodyLine2")}
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
                <div className="bg-white border-2 border-stone-200 rounded-lg p-4 space-y-3 relative shadow-sm">
                  <Tape color="green" position="top-right" className="w-16 h-4 opacity-70" />
                  <label className="block text-sm font-bold text-stone-600 font-sans">
                    {t("step1.vibe.label")}
                  </label>
                  <textarea
                    value={input.travelVibe || ""}
                    onChange={(e) => onChange({ travelVibe: e.target.value })}
                    placeholder={t("step1.vibe.placeholder")}
                    className="w-full h-28 bg-stone-50 border border-stone-200 rounded-md p-3 text-base font-sans placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed text-stone-800"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="direct-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2"
              >
                {/* Tags */}
                {input.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {input.destinations.map((dest, index) => (
                      <span
                        key={dest}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-stone-300 rounded-full text-stone-800 font-sans shadow-sm text-sm"
                      >
                        {dest}
                        <button
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="hover:text-red-500 transition-colors p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input Field - HIGH VISIBILITY FIX */}
                <div className="flex gap-2 items-stretch">
                  <div className="flex-1 relative group">
                    <input
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      onKeyDown={handleDestinationKeyDown}
                      placeholder={input.destinations.length === 0 ? t("step1.destinationInput.placeholderFirst") : t("step1.destinationInput.placeholderNext")}
                      className="w-full h-12 px-4 text-lg bg-stone-50 border-2 border-stone-300 rounded-lg focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all text-stone-800 placeholder:text-stone-400 font-sans"
                    />
                  </div>
                  <JournalButton
                    variant="secondary"
                    onClick={addDestination}
                    disabled={!destinationInput.trim()}
                    className="h-12 w-12 p-0 rounded-lg shadow-sm border-2 border-stone-200 hover:border-primary/50"
                  >
                    <Plus className="w-6 h-6" />
                  </JournalButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-base font-bold text-stone-700 font-sans ml-1">
              {t("step1.dates.label")}
            </label>

            {/* Toggle Switch */}
            <div className="flex text-sm font-bold font-sans gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setUseCalendar(false);
                        onChange({ dates: formatDuration(duration || 3) });
                        setStartDate("");
                        setEndDate("");
                    }}
                    className={`px-4 py-2 rounded-full border transition-all ${
                        !useCalendar
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                    }`}
                >
                    {t("step1.dates.mode.durationOnly")}
                </button>
                <button
                    type="button"
                    onClick={() => setUseCalendar(true)}
                    className={`px-4 py-2 rounded-full border transition-all ${
                        useCalendar
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                    }`}
                >
                    {t("step1.dates.mode.calendar")}
                </button>
            </div>
          </div>

          {useCalendar ? (
            <div className="bg-white p-5 rounded-lg border-2 border-dashed border-stone-200 space-y-4 relative shadow-sm">
                <Tape color="white" position="top-center" className="w-16 h-4 opacity-50" />
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <span className="text-sm font-bold text-stone-500 font-sans">{t("step1.dates.departureLabel")}</span>
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
                            className="w-full p-3 bg-stone-50 border border-stone-300 font-sans text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-stone-800 rounded-md"
                        />
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-bold text-stone-500 font-sans">{t("step1.dates.returnLabel")}</span>
                        <input
                            type="date"
                            value={endDate}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                            className="w-full p-3 bg-stone-50 border border-stone-300 font-sans text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-stone-800 rounded-md"
                        />
                    </div>
                </div>
                <div className="text-center font-sans pt-2">
                    {startDate && endDate ? (
                        <p className="text-base font-bold text-primary inline-block border-b-2 border-primary/20 pb-1">
                           🗓️ {startDate} 〜 {endDate} ({formatDuration(duration)})
                        </p>
                    ) : (
                        <p className="text-sm text-stone-400">{t("step1.dates.selectDatePrompt")}</p>
                    )}
                </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
                {/* Custom Duration (Top) */}
                <div className="flex items-center justify-center gap-8 py-6 bg-white border-y-2 border-stone-200 border-dashed shadow-sm rounded-lg mx-1">
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.max(1, duration - 1))}
                        className="w-12 h-12 rounded-full border-2 border-stone-300 text-stone-500 hover:border-primary hover:text-primary flex items-center justify-center transition-all bg-stone-50"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <span className="text-3xl font-bold text-stone-800 min-w-[140px] text-center font-sans">
                        {formatDuration(duration)}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleDurationChange(Math.min(30, duration + 1))}
                        className="w-12 h-12 rounded-full bg-primary text-white hover:bg-primary/90 flex items-center justify-center transition-all shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Preset Buttons (Bottom) */}
                <div className="flex flex-wrap justify-center gap-2">
                    {durationOptions.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDurationChange(opt.value)}
                        className={`py-2 px-4 text-sm font-sans font-bold rounded-full border transition-all transform hover:-translate-y-0.5 ${
                        duration === opt.value
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-stone-200 bg-white hover:border-primary/50 text-stone-600 shadow-sm"
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
            <label className="block text-base font-bold text-stone-700 font-sans ml-1">
              {t("step1.companions.label")}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            {companionOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ companions: opt.id })}
                className={`py-4 px-2 text-sm font-sans font-bold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 shadow-sm ${
                  input.companions === opt.id
                    ? "border-primary bg-white text-stone-800 shadow-md ring-2 ring-primary/20"
                    : "border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-800"
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Phase 2: Recommended (Accordion) */}
      {/* ================================================================== */}
      <div className="mt-10">
        <AccordionSection
            title={t("phase2.title")}
            subtitle={isPhase2Complete ? t("phase2.subtitleCompleted") : t("phase2.subtitleRecommended")}
            isOpen={phase2Open}
            onToggle={() => setPhase2Open(!phase2Open)}
            isComplete={isPhase2Complete}
            icon={<span className="text-sm">2</span>}
        >
            <div className="space-y-8 py-2">
            {/* Theme Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                {t("phase2.theme.label")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {themeOptions.map((theme) => {
                    const Icon = theme.icon;
                    const isSelected = input.theme.includes(theme.value);
                    return (
                    <button
                        key={theme.key}
                        type="button"
                        onClick={() => toggleTheme(theme.value)}
                        className={`py-3 px-3 text-sm font-bold rounded-lg border transition-all flex flex-col items-center gap-2 font-sans shadow-sm min-h-[5rem] justify-center ${
                        isSelected
                            ? "border-primary bg-white text-primary shadow-md border-2"
                            : "border-stone-200 bg-white hover:bg-stone-50 text-stone-500 hover:text-primary"
                        }`}
                    >
                        <Icon size={20} />
                        <span>{theme.label}</span>
                    </button>
                    );
                })}
                </div>
            </div>

            {/* Budget Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                {t("phase2.budget.label")}
                </label>

                {/* Mode Switch (Slider vs Presets) */}
                {!useBudgetSlider ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {budgetPresets.map((opt) => (
                        <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange({ budget: opt.id })}
                        className={`py-3 px-3 text-sm font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-2 h-28 font-sans shadow-sm ${
                            input.budget === opt.id
                            ? "border-primary bg-white text-primary shadow-md border-2"
                            : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                        }`}
                        >
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-xs text-stone-400 font-sans font-normal text-center leading-tight">{opt.desc}</span>
                        </button>
                    ))}
                    </div>
                    <button
                    type="button"
                    onClick={() => toggleBudgetSlider(true)}
                    className="w-full py-4 px-4 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-700 text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-stone-200 shadow-sm"
                    >
                    <span>🎚️</span>
                    <span>{t("phase2.budget.useSlider")}</span>
                    </button>
                </div>
                ) : (
                <div className="bg-white border border-stone-200 rounded-lg p-5 space-y-4 relative shadow-sm">
                    <Tape color="white" position="top-right" className="opacity-50 w-12 h-4" />
                    <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 font-sans">{t("phase2.budget.sliderTitle")}</span>
                    <button
                        type="button"
                        onClick={() => toggleBudgetSlider(false)}
                        className="text-xs text-stone-400 hover:text-stone-600 underline font-sans"
                    >
                        {t("phase2.budget.backToPresets")}
                    </button>
                    </div>

                    <div className="text-center">
                    <span className="text-2xl font-bold text-primary font-mono">
                        {formatBudget(budgetMinAmount, budgetUnits)} 〜 {formatBudget(budgetMaxAmount, budgetUnits)}
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
                        className="absolute w-6 h-6 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10 top-0 pointer-events-none"
                        style={{ left: `${minPercent}%` }}
                    />
                    <div
                        className="absolute w-6 h-6 bg-white border-2 border-primary rounded-full shadow-md -translate-x-1/2 z-10 top-0 pointer-events-none"
                        style={{ left: `${maxPercent}%` }}
                    />
                    </div>
                </div>
                )}
            </div>

            {/* Pace Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                {t("phase2.pace.label")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paceOptions.map((opt) => (
                    <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ pace: opt.id })}
                    className={`py-4 px-3 text-sm font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-2 font-sans shadow-sm min-h-[7rem] ${
                        input.pace === opt.id
                        ? "border-primary bg-white text-stone-800 shadow-md border-2"
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                    }`}
                    >
                    <span className="text-2xl">{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span className="text-xs text-stone-500 font-medium text-center leading-tight">{opt.desc}</span>
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
            title={t("phase3.title")}
            subtitle={t("phase3.subtitle")}
            isOpen={phase3Open}
            onToggle={() => setPhase3Open(!phase3Open)}
            isComplete={isPhase3Complete}
            icon={<span className="text-sm">3</span>}
        >
            <div className="space-y-8 py-2">

            {/* Reservations (Fixed Schedule) */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-stone-700 font-sans">
                {t("phase3.reservations.label")}
              </label>

              {/* List of added reservations */}
              {input.fixedSchedule && input.fixedSchedule.length > 0 && (
                <div className="grid gap-3 mb-3">
                  {input.fixedSchedule.map((item, index) => (
                    <div key={index} className="bg-white border border-stone-200 rounded-lg p-4 flex items-start gap-4 shadow-sm relative">
                       <button
                          onClick={() => removeReservation(index)}
                          className="absolute top-3 right-3 text-stone-400 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={16} />
                        </button>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                         {item.type === 'flight' && <FaPlane size={18} />}
                         {item.type === 'train' && <FaTrain size={18} />}
                         {item.type === 'bus' && <FaBus size={18} />}
                         {item.type === 'hotel' && <FaHotel size={18} />}
                         {item.type === 'activity' && <FaTicketAlt size={18} />}
                         {item.type === 'other' && <FaQuestion size={18} />}
                      </div>
                      <div>
                        <div className="font-bold text-stone-800 font-sans text-base">{item.name}</div>
                        <div className="text-sm text-stone-500 font-mono flex items-center gap-3 mt-1">
                          {item.date && (
                            <span className="flex items-center gap-1"><FaCalendarAlt size={12} /> {item.date}</span>
                          )}
                          {item.time && (
                             <span className="flex items-center gap-1"><FaClock size={12} /> {item.time}</span>
                          )}
                        </div>
                        {item.notes && (
                           <div className="text-xs text-stone-400 mt-2 font-sans border-t border-dashed border-stone-100 pt-1">{item.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Reservation Form */}
              {isAddingReservation ? (
                <div className="bg-white border border-stone-300 rounded-lg p-5 space-y-4 shadow-md relative animate-in fade-in zoom-in-95 duration-200">
                  <div className="font-bold text-base text-stone-700 font-sans mb-1">{t("phase3.reservations.addTitle")}</div>

                  {/* Type Selector */}
                  <div className="grid grid-cols-3 gap-2">
                     {reservationTypes.map(type => (
                       <button
                         key={type.id}
                         onClick={() => setResType(type.id as FixedScheduleItem['type'])}
                         className={`p-3 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-2 ${
                            resType === type.id
                            ? 'bg-primary/10 border-primary text-primary border-2'
                            : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                         }`}
                       >
                          <type.icon size={16} />
                          {type.label}
                       </button>
                     ))}
                  </div>

                  {/* Name */}
                  <input
                    type="text"
                    value={resName}
                    onChange={e => setResName(e.target.value)}
                    placeholder={t("phase3.reservations.namePlaceholder")}
                    className="w-full p-3 border border-stone-300 rounded-md text-sm font-sans focus:outline-none focus:border-primary text-stone-800"
                  />

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={resDate}
                      onChange={e => setResDate(e.target.value)}
                      className="w-full p-3 border border-stone-300 rounded-md text-sm font-sans focus:outline-none focus:border-primary text-stone-800"
                    />
                    <input
                      type="time"
                      value={resTime}
                      onChange={e => setResTime(e.target.value)}
                      className="w-full p-3 border border-stone-300 rounded-md text-sm font-sans focus:outline-none focus:border-primary text-stone-800"
                    />
                  </div>

                  {/* Notes */}
                  <textarea
                    value={resNotes}
                    onChange={e => setResNotes(e.target.value)}
                    placeholder={t("phase3.reservations.memoPlaceholder")}
                    className="w-full p-3 border border-stone-300 rounded-md text-sm font-sans focus:outline-none focus:border-primary h-20 resize-none text-stone-800"
                  />

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setIsAddingReservation(false)}
                      className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      {t("phase3.reservations.cancel")}
                    </button>
                    <button
                      onClick={addReservation}
                      disabled={!resName.trim()}
                      className="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {t("phase3.reservations.add")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingReservation(true)}
                  className="w-full py-3 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 font-bold text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 bg-white"
                >
                  <Plus size={18} /> {t("phase3.reservations.addButton")}
                </button>
              )}
            </div>

            {/* Preferred Transport */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                    {t("phase3.transport.label")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {transportOptions.map((opt) => {
                    const isSelected = input.preferredTransport?.includes(opt.id) || false;
                    const Icon = opt.icon;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleTransport(opt.id)}
                            className={`py-3 px-4 text-xs font-bold rounded-lg border transition-all flex items-center gap-3 font-sans shadow-sm ${
                                isSelected
                                ? "border-primary bg-white text-primary shadow-md border-2"
                                : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                            }`}
                        >
                            <Icon size={16} />
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                    );
                    })}
                </div>
            </div>

            {/* Must-Visit Places */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                {t("phase3.mustVisit.label")}
                </label>

                {/* Added Places */}
                {(input.mustVisitPlaces?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {input.mustVisitPlaces?.map((place, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm font-sans font-bold shadow-sm"
                    >
                        📍 {place}
                        <button
                        type="button"
                        onClick={() => removePlace(index)}
                        className="hover:text-red-500 transition-colors p-0.5"
                        >
                        <X className="w-3.5 h-3.5" />
                        </button>
                    </span>
                    ))}
                </div>
                )}

                <div className="flex gap-2 w-full items-stretch">
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
                        placeholder={t("phase3.mustVisit.placeholder")}
                        className="w-full h-12 px-4 text-sm bg-stone-50 border-2 border-stone-300 rounded-lg focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all text-stone-800 placeholder:text-stone-400 font-sans"
                    />
                  </div>

                <JournalButton
                    variant="secondary"
                    onClick={addPlace}
                    disabled={!placeInput.trim()}
                    className="h-12 w-12 p-0 rounded-lg shadow-sm border-2 border-stone-200 hover:border-primary/50"
                    >
                    <FaPlus className="w-5 h-5" />
                </JournalButton>
                </div>
            </div>

            {/* Free Text */}
            <div className="space-y-3">
                <label className="block text-sm font-bold text-stone-700 font-sans">
                {t("phase3.freeText.label")}
                </label>
                <div className="bg-white border-2 border-stone-200 rounded-lg p-3 relative shadow-sm">
                    <textarea
                        value={input.freeText || ""}
                        onChange={(e) => onChange({ freeText: e.target.value })}
                        placeholder={t("phase3.freeText.placeholder")}
                        className="w-full h-24 bg-transparent border-none p-1 text-sm font-sans placeholder:text-stone-300 focus:outline-none resize-none leading-relaxed text-stone-800"
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
        className="pt-8 px-2 pb-24 sm:pb-12"
      >
        <JournalButton
          variant="primary"
          size="lg"
          onClick={handleGenerateClick}
          disabled={isGenerating || !canGenerate}
          className="w-full h-16 text-xl font-bold shadow-xl hover:scale-[1.01] transition-transform font-sans rounded-xl"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-3">⏳</span>
              {t("generate.generating")}
            </>
          ) : !canGenerate ? (
            <>
              <span className="mr-3">⚠️</span>
              {t("generate.missingRequired")}
            </>
          ) : hasDetailedInput ? (
            <>
              <span className="mr-3">✨</span>
              {t("generate.withDetails")}
            </>
          ) : (
            <>
              <span className="mr-3">✨</span>
              {t("generate.quick")}
            </>
          )}
        </JournalButton>
        {canGenerate && !hasDetailedInput && (
          <p className="text-center text-sm mt-4 text-stone-500 font-sans font-medium">
            {t("generate.hint")}
          </p>
        )}
      </motion.div>
    </div>
  );
}
