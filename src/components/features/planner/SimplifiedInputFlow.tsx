"use client";

import {
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
  useMemo,
} from "react";
import { useTranslations } from "next-intl";
import { UserInput } from "@/types";
import {
  Check,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
} from "react-icons/fa";

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

// Budget sliding calculation
const BUDGET_MIN = 10000;
const BUDGET_MAX = 2000000;
const BREAKPOINT_AMOUNT = 500000;
const STEP_SMALL = 10000;
const STEP_LARGE = 100000;

const STEPS_RANGE_1 = (BREAKPOINT_AMOUNT - BUDGET_MIN) / STEP_SMALL;
const STEPS_RANGE_2 = (BUDGET_MAX - BREAKPOINT_AMOUNT) / STEP_LARGE;
const SLIDER_MAX = STEPS_RANGE_1 + STEPS_RANGE_2;

function getBudgetAmount(index: number): number {
  if (index <= STEPS_RANGE_1) {
    return BUDGET_MIN + index * STEP_SMALL;
  } else {
    return BREAKPOINT_AMOUNT + (index - STEPS_RANGE_1) * STEP_LARGE;
  }
}

function getBudgetIndex(amount: number): number {
  if (amount <= BREAKPOINT_AMOUNT) {
    return Math.round((amount - BUDGET_MIN) / STEP_SMALL);
  } else {
    return (
      STEPS_RANGE_1 + Math.round((amount - BREAKPOINT_AMOUNT) / STEP_LARGE)
    );
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
  labels: { undecided: string; dayTrip: string },
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

function formatBudget(
  amount: number,
  units: { tenThousandYen: string; yen: string },
): string {
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

function getStepBadgeClasses(): string {
  return "w-8 h-8 rounded-full border-2 border-orange-300 bg-orange-50 text-orange-700 shadow-[0_0_0_1px_rgba(251,146,60,0.12)] dark:border-orange-400/70 dark:bg-orange-500/15 dark:text-orange-100 flex items-center justify-center font-bold text-sm transition-all duration-500 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-400 group-hover:shadow-lg group-hover:shadow-orange-600/20";
}

function getSelectedIndicatorClasses(): string {
  return "inline-flex h-6 w-6 items-center justify-center rounded-full border border-orange-300 bg-orange-500 text-white shadow-md shadow-orange-500/30";
}

function getUnselectedPillClasses(): string {
  return "bg-white text-stone-700 border-stone-300 hover:border-orange-300 hover:text-stone-900 hover:bg-orange-50/60 dark:bg-stone-800/50 dark:text-stone-200 dark:border-stone-600 dark:hover:border-stone-400 dark:hover:text-white dark:hover:bg-stone-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]";
}

// ============================================================================
// Main Component (Zen Progressive Disclosure)
// ============================================================================

export default function SimplifiedInputFlow({
  input,
  onChange,
  onGenerate: parentOnGenerate,
  isGenerating = false,
}: SimplifiedInputFlowProps) {
  // Translation hooks
  const t = useTranslations("components.features.planner.simplifiedInputFlow");
  const tCompanion = useTranslations(
    "components.features.planner.steps.stepCompanions.options",
  );
  const tTheme = useTranslations(
    "components.features.planner.steps.stepThemes.themes",
  );
  const tThemeValue = useTranslations(
    "components.features.planner.steps.stepThemes.themeValues",
  );
  const tBudget = useTranslations(
    "components.features.planner.steps.stepBudget.options",
  );
  const tPace = useTranslations(
    "components.features.planner.steps.stepPace.options",
  );
  const tDateFormats = useTranslations(
    "components.features.planner.steps.stepDates.formats",
  );

  const durationLabels = useMemo(
    () => ({
      undecided: tDateFormats("dateUndecidedValue"),
      dayTrip: tDateFormats("dayTrip"),
    }),
    [tDateFormats],
  );

  const formatDuration = useCallback(
    (days: number) => {
      if (days === 0) return durationLabels.undecided;
      if (days === 1) return durationLabels.dayTrip;
      return tDateFormats("nightsDays", { nights: days - 1, days });
    },
    [durationLabels.dayTrip, durationLabels.undecided, tDateFormats],
  );

  const budgetUnits = {
    tenThousandYen: t("budget.units.tenThousandYen"),
    yen: t("budget.units.yen"),
  };

  // Mapped options
  const companionOptions = COMPANION_OPTIONS.map((opt) => ({
    ...opt,
    label: tCompanion(`${opt.key}.label`),
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
  // Form State
  const isOmakase = input.isDestinationDecided === false;
  const [destinationInput, setDestinationInput] = useState("");

  const duration = parseDurationValue(input.dates, durationLabels);
  const dateMatch = input.dates?.match(/(\d{4}-\d{2}-\d{2})/);
  const currentStartDate = dateMatch ? dateMatch[1] : "";
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(() => {
    if (currentStartDate && duration) {
      const d = new Date(currentStartDate);
      d.setDate(d.getDate() + (duration - 1));
      return d.toISOString().split("T")[0];
    }
    return "";
  });
  const [useCalendar, setUseCalendar] = useState(
    !!currentStartDate || duration <= 0,
  );

  const existingBudgetRange = parseBudgetRange(input.budget);
  const [useBudgetSlider, setUseBudgetSlider] = useState(!!existingBudgetRange);
  const [budgetMinAmount, setBudgetMinAmount] = useState(
    existingBudgetRange?.min ?? 30000,
  );
  const [budgetMaxAmount, setBudgetMaxAmount] = useState(
    existingBudgetRange?.max ?? 100000,
  );

  // Progressive Disclosure State
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync effect
  useEffect(() => {
    const match = input.dates?.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      queueMicrotask(() => {
        setStartDate(match[1]);
        const dur = parseDurationValue(input.dates, durationLabels);
        if (dur > 0) {
          const d = new Date(match[1]);
          d.setDate(d.getDate() + (dur - 1));
          setEndDate(d.toISOString().split("T")[0]);
        }
      });
    }
  }, [durationLabels, input.dates]);

  // Handlers
  const handleDestinationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && destinationInput.trim()) {
      e.preventDefault();
      addDestination();
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

  const removeDestination = (index: number) => {
    const newDestinations = input.destinations.filter(
      (_: string, i: number) => i !== index,
    );
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
      onChange({ isDestinationDecided: false, destinations: [] });
    }
  };

  const handleDateRangeChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    if (newStart && newEnd) {
      const s = new Date(newStart);
      const e = new Date(newEnd);
      const diffDays = Math.ceil(
        (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays >= 0) {
        onChange({
          dates: tDateFormats("dateFromWithDuration", {
            date: newStart,
            duration: formatDuration(diffDays + 1),
          }),
        });
      }
    }
  };

  const handleDurationChange = (newDuration: number) => {
    onChange({ dates: formatDuration(newDuration) });
  };

  // Validations for Generate Button
  const hasDest =
    input.destinations.length > 0 ||
    isOmakase ||
    destinationInput.trim().length > 0;
  const hasCompanion = !!input.companions;
  const hasValidDates = useCalendar
    ? !!(startDate && endDate)
    : input.dates === durationLabels.undecided || !!input.dates;

  // Clean boolean for Generate readiness
  const canGenerate = hasDest && hasCompanion && hasValidDates;

  const handleGenerateClick = () => {
    const finalInput = { ...input };
    if (useCalendar && (!startDate || !endDate)) {
      finalInput.dates = durationLabels.undecided;
      onChange({ dates: durationLabels.undecided });
    }
    const trimmed = destinationInput.trim();
    if (trimmed && !input.destinations.includes(trimmed)) {
      finalInput.destinations = [...input.destinations, trimmed];
      finalInput.isDestinationDecided = true;
      onChange({
        destinations: finalInput.destinations,
        isDestinationDecided: true,
      });
      setDestinationInput("");
    }
    parentOnGenerate(finalInput);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-8 md:py-12 font-sans text-stone-900 dark:text-stone-50 antialiased">
      {/* Zen Header */}
      <div className="text-center mb-10 md:mb-12 opacity-0 animate-fade-in-up">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-stone-900 dark:text-white">
          Where to next?
        </h1>
        <p className="text-stone-600 dark:text-stone-300 font-medium text-base md:text-lg max-w-md mx-auto">
          {t("header.lead")}
        </p>
      </div>

      <div className="space-y-12 md:space-y-14">
        {/* ========================================================= */}
        {/* ESSENTIAL INPUTS (Progressively disclosed top-to-bottom) */}
        {/* ========================================================= */}

        <div
          className="group animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={getStepBadgeClasses()}>
              1
            </div>
            <label className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
              {t("step1.destinationModeLabel")} {!hasDest && "*"}
            </label>
          </div>
          <div
            className={`transition-opacity duration-500 ease-out ${isOmakase ? "opacity-40 grayscale" : "opacity-100"}`}
          >
            <div className="relative">
              <input
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onKeyDown={handleDestinationKeyDown}
                placeholder={
                  input.destinations.length === 0
                    ? t("step1.destinationInput.placeholderFirst")
                    : t("step1.destinationInput.placeholderNext")
                }
                className="w-full bg-transparent border-b-2 border-stone-300 dark:border-stone-600 py-3 md:py-5 px-2 text-2xl md:text-3xl font-medium text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/40 transition-all"
              />
              {destinationInput.trim() && (
                <button
                  onClick={addDestination}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 rounded-full"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              {input.destinations.map((dest: string, i: number) => (
                <span
                  key={dest}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-orange-50 text-stone-900 border border-orange-200 dark:bg-stone-800 dark:text-white dark:border-stone-700 rounded-full text-sm font-bold transition-transform hover:scale-105"
                >
                  {dest}
                  <button
                    onClick={() => removeDestination(i)}
                  className="text-stone-500 dark:text-stone-300 hover:text-orange-500 dark:hover:text-orange-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <span className="text-xs text-stone-500 dark:text-stone-400 font-black tracking-[0.2em]">
              OR
            </span>
            <button
              onClick={toggleOmakase}
              className={`text-sm px-8 py-3 rounded-full border-2 shadow-xl transition-all duration-300 font-bold tracking-wide ${
                isOmakase
                  ? "bg-orange-600 text-white border-orange-400 shadow-orange-600/30 scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]"
                  : getUnselectedPillClasses()
              }`}
            >
              {t("step1.omakase.title")}
            </button>
          </div>
        </div>

        {/* 2. Dates Field */}
        <div
          className="group animate-fade-in-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={getStepBadgeClasses()}>
              2
            </div>
            <label className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
              {t("step1.dates.label")} {!hasValidDates && "*"}
            </label>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex gap-2 bg-stone-100 dark:bg-stone-800/60 p-1.5 rounded-full w-fit border border-stone-200 dark:border-stone-600">
              <button
                onClick={() => setUseCalendar(false)}
                className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${!useCalendar ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-stone-600 hover:text-stone-900 dark:text-stone-200 dark:hover:text-white"}`}
              >
                {t("step1.dates.mode.durationOnly")}
              </button>
              <button
                onClick={() => setUseCalendar(true)}
                className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${useCalendar ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-stone-600 hover:text-stone-900 dark:text-stone-200 dark:hover:text-white"}`}
              >
                {t("step1.dates.mode.calendar")}
              </button>
            </div>

            {useCalendar ? (
              <div className="flex items-center gap-4 md:gap-8 max-w-sm">
                <div className="flex-1">
                  <input
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      if (newStart && duration) {
                        const d = new Date(newStart);
                        d.setDate(d.getDate() + (duration - 1));
                        handleDateRangeChange(
                          newStart,
                          d.toISOString().split("T")[0],
                        );
                      } else {
                        handleDateRangeChange(newStart, endDate);
                      }
                    }}
                    className="w-full bg-transparent border-b-2 border-stone-300 dark:border-stone-600 py-2 text-xl md:text-2xl font-medium text-stone-900 dark:text-white appearance-none focus:outline-none focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/40"
                  />
                </div>
                <div className="text-stone-500 dark:text-stone-500 font-bold">→</div>
                <div className="flex-1">
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      handleDateRangeChange(startDate, e.target.value)
                    }
                    className="w-full bg-transparent border-b-2 border-stone-300 dark:border-stone-600 py-2 text-xl md:text-2xl font-medium text-stone-900 dark:text-white appearance-none focus:outline-none focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/40"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDurationChange(0)}
                  className={`px-6 py-3 rounded-full text-sm font-bold transition-all border-2 ${duration === 0 ? "bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]" : getUnselectedPillClasses()}`}
                >
                  未定
                </button>
                {durationOptions
                  .filter((d) => d.value > 0 && d.value <= 6)
                  .map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleDurationChange(opt.value)}
                      className={`px-6 py-3 rounded-full text-sm font-bold transition-all border-2 ${duration === opt.value ? "bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]" : getUnselectedPillClasses()}`}
                    >
                      {opt.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Companions Field */}
        <div
          className="group animate-fade-in-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={getStepBadgeClasses()}>
              3
            </div>
            <label className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
              {t("step1.companions.label")} {!hasCompanion && "*"}
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            {companionOptions.map((opt) => (
              (() => {
                const isSelected = input.companions === opt.id;
                return (
              <button
                key={opt.id}
                data-testid={`companion-option-${opt.id}`}
                onClick={() => onChange({ companions: opt.id })}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 px-6 py-4 rounded-full border-2 transition-all duration-300 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${
                  isSelected
                    ? "bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/20 scale-105"
                    : getUnselectedPillClasses()
                }`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                  isSelected
                    ? "border-orange-200/70 bg-orange-500/20 text-white"
                    : "border-orange-200 bg-orange-50 text-orange-600 dark:border-stone-500 dark:bg-stone-700/70 dark:text-stone-100"
                }`}>
                  <span className="text-xl">{opt.icon}</span>
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
                {isSelected && (
                  <span
                    data-testid={`companion-indicator-${opt.id}`}
                    className={`${getSelectedIndicatorClasses()} ml-1`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
                );
              })()
            ))}
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-stone-200 dark:bg-stone-800 my-12 md:my-16 shadow-[0_1px_2px_rgba(255,255,255,0.05)]"></div>

      {/* ========================================================= */}
      {/* ORGANIC GENERATE BUTTON AREA                              */}
      {/* ========================================================= */}

      <div
        className="flex flex-col items-center animate-fade-in-up"
        style={{ animationDelay: "400ms" }}
      >
        {/* Toggle Advanced Options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-3 px-10 py-5 rounded-full border-2 text-base font-black transition-all duration-300 mb-8 md:mb-10 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${
            showAdvanced
              ? "bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100 dark:bg-white dark:text-orange-600 dark:border-white dark:shadow-white/10"
              : "bg-white text-stone-800 border-stone-200 hover:bg-orange-50 hover:border-orange-200 hover:scale-105 dark:bg-stone-800/70 dark:text-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 dark:hover:border-stone-400"
          }`}
        >
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
          <span>こだわり条件を追加する（任意）</span>
        </button>

        {/* PROGRESSIVE DISCLOSURE BOCK */}
        <div
          className={`w-full overflow-hidden transition-all duration-700 ease-in-out ${showAdvanced ? "max-h-[2000px] opacity-100 mb-16" : "max-h-0 opacity-0"}`}
        >
          <div className="space-y-16 py-4">
            {/* Themes */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                <label className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
                  {t("phase2.theme.label")}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {themeOptions.map((theme) => {
                  const isSelected = input.theme.includes(theme.value);
                  return (
                    <button
                      key={theme.key}
                      data-testid={`theme-option-${theme.key}`}
                      onClick={() => {
                        if (isSelected)
                          onChange({
                            theme: input.theme.filter(
                              (t: string) => t !== theme.value,
                            ),
                          });
                        else onChange({ theme: [...input.theme, theme.value] });
                      }}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${
                        isSelected
                          ? "bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/20 scale-105"
                          : getUnselectedPillClasses()
                      }`}
                    >
                      {isSelected && (
                        <span
                          data-testid={`theme-indicator-${theme.key}`}
                          className={getSelectedIndicatorClasses()}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {theme.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pace & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Pace */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                  <label className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
                    {t("phase2.pace.label")}
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  {paceOptions.map((opt) => (
                    (() => {
                      const isSelected = input.pace === opt.id;
                      return (
                        <button
                          key={opt.id}
                          data-testid={`pace-option-${opt.id}`}
                          onClick={() => onChange({ pace: opt.id })}
                          aria-pressed={isSelected}
                          className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${
                            isSelected
                              ? "bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/20 scale-[1.02]"
                              : "bg-white border-stone-200 text-stone-800 hover:border-orange-200 hover:text-stone-900 hover:bg-orange-50/70 dark:bg-stone-800/50 dark:border-stone-600 dark:text-stone-100 dark:hover:border-stone-400 dark:hover:text-white dark:hover:bg-stone-700/80"
                          }`}
                        >
                          <span className="text-lg">{opt.label}</span>
                          <span className="flex items-center gap-3 text-xl">
                            {isSelected && (
                              <span
                                data-testid={`pace-indicator-${opt.id}`}
                                className={getSelectedIndicatorClasses()}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <span>{opt.icon}</span>
                          </span>
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                    <label className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
                      {t("phase2.budget.label")}
                    </label>
                  </div>
                  {useBudgetSlider && (
                    <button
                      onClick={() => setUseBudgetSlider(false)}
                      className="text-stone-800 dark:text-white hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all text-xs font-black bg-stone-100 dark:bg-stone-700 border border-stone-300 dark:border-stone-500 px-4 py-2 rounded-full uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717]"
                    >
                      ✕ Reset
                    </button>
                  )}
                </div>

                {!useBudgetSlider ? (
                  <div className="grid grid-cols-2 gap-2">
                    {budgetPresets.map((opt) => (
                      (() => {
                        const isSelected = input.budget === opt.id;
                        return (
                          <button
                            key={opt.id}
                            data-testid={`budget-option-${opt.id}`}
                            onClick={() => onChange({ budget: opt.id })}
                            aria-pressed={isSelected}
                            className={`relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${
                              isSelected
                                ? "bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/20 scale-105"
                                : "bg-white text-stone-800 border-stone-200 hover:border-orange-200 hover:text-stone-900 hover:bg-orange-50/70 dark:bg-stone-800/50 dark:text-stone-100 dark:border-stone-600 dark:hover:border-stone-400 dark:hover:text-white dark:hover:bg-stone-700/80"
                            }`}
                          >
                            {isSelected && (
                              <span
                                data-testid={`budget-indicator-${opt.id}`}
                                className={`${getSelectedIndicatorClasses()} absolute right-4 top-4`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                            <span className="text-3xl mb-3">{opt.icon}</span>
                            <span className="text-base font-bold">{opt.label}</span>
                          </button>
                        );
                      })()
                    ))}
                    <button
                      onClick={() => setUseBudgetSlider(true)}
                      className="col-span-2 text-center text-sm text-orange-600 dark:text-orange-300 font-black uppercase tracking-[0.2em] underline underline-offset-8 decoration-orange-500/30 hover:decoration-orange-500 mt-8 transition-all hover:text-orange-500 dark:hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] rounded-full"
                    >
                      具体的な金額で指定する
                    </button>
                  </div>
                ) : (
                  <div className="p-8 md:p-10 bg-stone-50 rounded-[2rem] border-2 border-stone-200 dark:bg-stone-800/50 dark:border-stone-600 shadow-2xl relative">
                    <div className="text-center mb-12">
                      <span className="text-3xl font-black tracking-tighter text-stone-900 dark:text-white">
                        {formatBudget(budgetMinAmount, budgetUnits)}{" "}
                        <span className="text-stone-400 dark:text-stone-500 font-light mx-2">
                          ~
                        </span>{" "}
                        {formatBudget(budgetMaxAmount, budgetUnits)}
                      </span>
                    </div>
                    {/* Custom Dual Slider Range UI */}
                    <div className="relative pb-6">
                      <div className="relative h-2 bg-stone-200 dark:bg-stone-700 rounded-full">
                        <div
                          className="absolute h-full bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                          style={{
                            left: `${(getBudgetIndex(budgetMinAmount) / SLIDER_MAX) * 100}%`,
                            width: `${((getBudgetIndex(budgetMaxAmount) - getBudgetIndex(budgetMinAmount)) / SLIDER_MAX) * 100}%`,
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={SLIDER_MAX}
                        step={1}
                        value={getBudgetIndex(budgetMinAmount)}
                        onChange={(e) => {
                          const newAmount = getBudgetAmount(
                            Number(e.target.value),
                          );
                          const clamped = Math.min(newAmount, budgetMaxAmount);
                          setBudgetMinAmount(clamped);
                          onChange({
                            budget: encodeBudgetRange(clamped, budgetMaxAmount),
                          });
                        }}
                        className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80"
                      />
                      <input
                        type="range"
                        min={0}
                        max={SLIDER_MAX}
                        step={1}
                        value={getBudgetIndex(budgetMaxAmount)}
                        onChange={(e) => {
                          const newAmount = getBudgetAmount(
                            Number(e.target.value),
                          );
                          const clamped = Math.max(newAmount, budgetMinAmount);
                          setBudgetMaxAmount(clamped);
                          onChange({
                            budget: encodeBudgetRange(budgetMinAmount, clamped),
                          });
                        }}
                        className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80"
                      />
                      <div
                        className="absolute w-6 h-6 bg-white border-4 border-orange-500 rounded-full shadow-xl -translate-x-1/2 z-10 -top-2 pointer-events-none"
                        style={{
                          left: `${(getBudgetIndex(budgetMinAmount) / SLIDER_MAX) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute w-6 h-6 bg-white border-4 border-orange-500 rounded-full shadow-xl -translate-x-1/2 z-10 -top-2 pointer-events-none"
                        style={{
                          left: `${(getBudgetIndex(budgetMaxAmount) / SLIDER_MAX) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Free Text */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                <label className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
                  {t("phase3.freeText.label")}
                </label>
              </div>
              <textarea
                value={input.freeText || ""}
                onChange={(e) => onChange({ freeText: e.target.value })}
                placeholder={t("phase3.freeText.placeholder")}
                className="w-full h-40 p-6 bg-white border-2 border-stone-200 dark:bg-stone-800/40 dark:border-stone-600 rounded-[2rem] focus:outline-none focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-400/40 transition-all shadow-inner resize-y text-stone-900 dark:text-white text-lg font-medium placeholder:text-stone-400"
              />
            </div>
          </div>
        </div>

        {/* ORGANIC GENERATE BUTTON */}
        <div className="w-full max-w-md mt-8 md:mt-10 pb-16">
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating || !canGenerate}
            className={`w-full py-6 px-10 rounded-full font-black text-xl tracking-[0.1em] uppercase transition-all duration-500 ease-out shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#171717] ${
              isGenerating || !canGenerate
                ? "bg-stone-200 dark:bg-stone-800 text-stone-500 border-2 border-stone-300 dark:border-stone-700 cursor-not-allowed opacity-60"
                : "bg-orange-600 text-white shadow-orange-600/40 hover:bg-orange-500 hover:scale-[1.05] hover:shadow-orange-500/60 active:scale-95 border-2 border-orange-400"
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-4">
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                {t("generate.generating")}
              </span>
            ) : (
              <span>{t("generate.quick")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
