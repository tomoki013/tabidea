"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { FaBus, FaHotel, FaPlane, FaTrain } from "react-icons/fa";
import type { FixedScheduleItem, UserInput } from "@/types";

const COMPANION_OPTIONS = [
  { id: "solo", key: "solo", icon: "1" },
  { id: "couple", key: "couple", icon: "2" },
  { id: "family", key: "family", icon: "F" },
  { id: "friends", key: "friends", icon: "G" },
] as const;

const THEME_KEYS = ["gourmet", "historyCulture", "natureScenery", "shopping", "art", "relax"] as const;
const BUDGET_KEYS = ["saving", "standard", "high", "luxury"] as const;
const PACE_KEYS = ["relaxed", "balanced", "active", "packed"] as const;
const DURATION_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
const TRANSPORT_TYPES: FixedScheduleItem["type"][] = ["flight", "train", "bus", "other"];
const PREFERRED_TRANSPORT = ["flight", "shinkansen", "train", "bus"] as const;

interface SimplifiedInputFlowProps {
  input: UserInput;
  onChange: (update: Partial<UserInput>) => void;
  onGenerate: (inputOverride?: UserInput) => void;
  isGenerating?: boolean;
  isInModal?: boolean;
}

function getStepBadgeClasses(): string {
  return "flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-300 bg-orange-50 text-sm font-bold text-orange-700 dark:border-orange-400/70 dark:bg-orange-500/15 dark:text-orange-100";
}

function getSelectedIndicatorClasses(): string {
  return "inline-flex h-6 w-6 items-center justify-center rounded-full border border-orange-300 bg-orange-500 text-white";
}

function getUnselectedPillClasses(): string {
  return "border-stone-300 bg-white text-stone-700 hover:border-orange-300 hover:bg-orange-50/60 hover:text-stone-900 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-200 dark:hover:border-stone-400 dark:hover:bg-stone-700/80 dark:hover:text-white";
}

function parseDurationValue(
  str: string,
  labels: { undecided: string; dayTrip: string },
): number {
  if (!str) return 3;
  if (str === labels.undecided) return 0;
  if (str.includes(labels.dayTrip)) return 1;
  const numbers = str.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 3;
  return Number(numbers[numbers.length - 1]) || 3;
}

function formatBookingDateTime(date?: string, time?: string): string {
  if (date && time) return `${date} ${time}`;
  if (date) return date;
  if (time) return time;
  return "";
}

export default function SimplifiedInputFlow({
  input,
  onChange,
  onGenerate: parentOnGenerate,
  isGenerating = false,
}: SimplifiedInputFlowProps) {
  const t = useTranslations("components.features.planner.simplifiedInputFlow");
  const tCompanion = useTranslations("components.features.planner.steps.stepCompanions.options");
  const tTheme = useTranslations("components.features.planner.steps.stepThemes.themes");
  const tThemeValue = useTranslations("components.features.planner.steps.stepThemes.themeValues");
  const tBudget = useTranslations("components.features.planner.steps.stepBudget.options");
  const tPace = useTranslations("components.features.planner.steps.stepPace.options");
  const tDateFormats = useTranslations("components.features.planner.steps.stepDates.formats");

  const durationLabels = useMemo(() => ({
    undecided: tDateFormats("dateUndecidedValue"),
    dayTrip: tDateFormats("dayTrip"),
  }), [tDateFormats]);

  const duration = parseDurationValue(input.dates, durationLabels);
  const isOmakase = input.isDestinationDecided === false;
  const today = new Date().toISOString().split("T")[0];
  const matchedDates = input.dates?.match(/(\d{4}-\d{2}-\d{2})/);

  const [destinationInput, setDestinationInput] = useState("");
  const [mustVisitInput, setMustVisitInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState(matchedDates?.[1] ?? "");
  const [endDate, setEndDate] = useState("");
  const [useCalendar, setUseCalendar] = useState(Boolean(matchedDates?.[1]));
  const [transportType, setTransportType] = useState<FixedScheduleItem["type"]>("flight");
  const [transportName, setTransportName] = useState("");
  const [transportDate, setTransportDate] = useState("");
  const [transportTime, setTransportTime] = useState("");
  const [transportNote, setTransportNote] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelDate, setHotelDate] = useState("");
  const [hotelNote, setHotelNote] = useState("");

  const addDestination = useCallback(() => {
    const trimmed = destinationInput.trim();
    if (!trimmed || input.destinations.includes(trimmed)) return;
    onChange({ destinations: [...input.destinations, trimmed], isDestinationDecided: true });
    setDestinationInput("");
  }, [destinationInput, input.destinations, onChange]);

  const removeDestination = (index: number) => {
    const next = input.destinations.filter((_, i) => i !== index);
    onChange({ destinations: next, isDestinationDecided: next.length > 0 ? true : undefined });
  };

  const addMustVisit = () => {
    const trimmed = mustVisitInput.trim();
    const current = input.mustVisitPlaces ?? [];
    if (!trimmed || current.includes(trimmed)) return;
    onChange({ mustVisitPlaces: [...current, trimmed], hasMustVisitPlaces: true });
    setMustVisitInput("");
  };

  const removeMustVisit = (index: number) => {
    const next = (input.mustVisitPlaces ?? []).filter((_, i) => i !== index);
    onChange({ mustVisitPlaces: next, hasMustVisitPlaces: next.length > 0 });
  };

  const addFixedSchedule = (item: FixedScheduleItem) => {
    onChange({ fixedSchedule: [...(input.fixedSchedule ?? []), item] });
  };

  const removeFixedSchedule = (index: number) => {
    onChange({ fixedSchedule: (input.fixedSchedule ?? []).filter((_, i) => i !== index) });
  };

  const handleGenerateClick = () => {
    const finalInput = { ...input };
    const trimmed = destinationInput.trim();
    if (trimmed && !input.destinations.includes(trimmed)) {
      finalInput.destinations = [...input.destinations, trimmed];
      finalInput.isDestinationDecided = true;
    }
    parentOnGenerate(finalInput);
  };

  const hasDest = input.destinations.length > 0 || isOmakase || destinationInput.trim().length > 0;
  const hasCompanion = Boolean(input.companions);
  const hasDates = useCalendar ? Boolean(startDate && endDate) : Boolean(input.dates);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-5 font-sans text-stone-900 dark:text-stone-50 md:py-7">
      <div className="mb-6 text-center md:mb-8">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-stone-900 dark:text-white md:text-6xl">{t("header.title")}</h1>
        <p className="mx-auto max-w-md text-base font-medium text-stone-600 dark:text-stone-300 md:text-lg">{t("header.lead")}</p>
      </div>

      <div className="space-y-10 md:space-y-12">
        <section>
          <div className="mb-5 flex items-center gap-3"><div className={getStepBadgeClasses()}>1</div><label className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">{t("step1.destinationModeLabel")} {!hasDest && "*"}</label></div>
          <div className={`transition-opacity duration-500 ${isOmakase ? "pointer-events-none opacity-40 grayscale" : "opacity-100"}`}>
            <div className="rounded-[2rem] border border-stone-200 bg-white/80 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/40 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1"><input value={destinationInput} onChange={(e) => setDestinationInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDestination(); } }} placeholder={input.destinations.length === 0 ? t("step1.destinationInput.placeholderFirst") : t("step1.destinationInput.placeholderNext")} className="w-full border-b-2 border-stone-300 bg-transparent px-2 py-3 text-2xl font-medium text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 dark:border-stone-600 dark:text-white md:py-4 md:text-3xl" /></div>
                <button type="button" onClick={addDestination} disabled={!destinationInput.trim()} className={`inline-flex items-center justify-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-black tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50 ${destinationInput.trim() ? "border-orange-400 bg-orange-600 text-white" : "border-stone-300 bg-stone-100 text-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}><Plus className="h-4 w-4" /><span>{t("step1.destinationInput.addButton")}</span></button>
              </div>
              {(input.destinations.length > 0) && <div className="mt-4 flex flex-wrap gap-2">{input.destinations.map((destination, index) => <span key={`${destination}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-5 py-2 text-sm font-bold text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-white">{destination}<button type="button" onClick={() => removeDestination(index)} className="rounded-full text-stone-500 hover:text-orange-500 dark:text-stone-300 dark:hover:text-orange-300"><X className="h-4 w-4" /></button></span>)}</div>}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4"><span className="text-xs font-black tracking-[0.2em] text-stone-500 dark:text-stone-400">OR</span><button type="button" onClick={() => onChange(isOmakase ? { isDestinationDecided: undefined } : { isDestinationDecided: false, destinations: [] })} className={`rounded-full border-2 px-8 py-3 text-sm font-bold tracking-wide ${isOmakase ? "border-orange-400 bg-orange-600 text-white" : getUnselectedPillClasses()}`}>{t("step1.omakase.title")}</button></div>
        </section>

        <section>
          <div className="mb-6 flex items-center gap-3"><div className={getStepBadgeClasses()}>2</div><label className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">{t("step1.dates.label")} {!hasDates && "*"}</label></div>
          <div className="flex flex-col gap-5">
            <div className="flex w-fit gap-2 rounded-full border border-stone-200 bg-stone-100 p-1.5 dark:border-stone-600 dark:bg-stone-800/60"><button type="button" onClick={() => setUseCalendar(false)} className={`rounded-full px-6 py-2.5 text-xs font-bold tracking-wider ${!useCalendar ? "bg-orange-600 text-white" : "text-stone-600 dark:text-stone-200"}`}>{t("step1.dates.mode.durationOnly")}</button><button type="button" onClick={() => setUseCalendar(true)} className={`rounded-full px-6 py-2.5 text-xs font-bold tracking-wider ${useCalendar ? "bg-orange-600 text-white" : "text-stone-600 dark:text-stone-200"}`}>{t("step1.dates.mode.calendar")}</button></div>
            {useCalendar ? <div className="flex max-w-xl flex-col gap-4 md:flex-row md:items-center md:gap-8"><div className="flex-1"><input type="date" value={startDate} min={today} onChange={(e) => { setStartDate(e.target.value); if (e.target.value && endDate) { onChange({ dates: `${e.target.value} - ${endDate}` }); } }} className="w-full border-b-2 border-stone-300 bg-transparent py-2 text-xl font-medium text-stone-900 dark:border-stone-600 dark:text-white md:text-2xl" /></div><div className="font-bold text-stone-500">~</div><div className="flex-1"><input type="date" value={endDate} min={startDate || today} onChange={(e) => { setEndDate(e.target.value); if (startDate && e.target.value) { onChange({ dates: `${startDate} - ${e.target.value}` }); } }} className="w-full border-b-2 border-stone-300 bg-transparent py-2 text-xl font-medium text-stone-900 dark:border-stone-600 dark:text-white md:text-2xl" /></div></div> : <div className="flex flex-wrap items-center gap-2">{DURATION_VALUES.map((value) => <button key={value} type="button" onClick={() => onChange({ dates: value === 0 ? durationLabels.undecided : (value === 1 ? durationLabels.dayTrip : tDateFormats("nightsDays", { nights: value - 1, days: value })) })} className={`rounded-full border-2 px-6 py-3 text-sm font-bold ${duration === value ? "border-orange-400 bg-orange-600 text-white" : getUnselectedPillClasses()}`}>{value === 0 ? durationLabels.undecided : (value === 1 ? durationLabels.dayTrip : tDateFormats("nightsDays", { nights: value - 1, days: value }))}</button>)}</div>}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center gap-3"><div className={getStepBadgeClasses()}>3</div><label className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">{t("step1.companions.label")} {!hasCompanion && "*"}</label></div>
          <div className="flex flex-wrap gap-3">{COMPANION_OPTIONS.map((option) => { const selected = input.companions === option.id; return <button key={option.id} type="button" data-testid={`companion-option-${option.id}`} onClick={() => onChange({ companions: option.id })} className={`flex items-center gap-3 rounded-full border-2 px-6 py-4 font-bold ${selected ? "border-orange-400 bg-orange-600 text-white" : getUnselectedPillClasses()}`}><span>{tCompanion(`${option.key}.label`)}</span>{selected && <span data-testid={`companion-indicator-${option.id}`} className={getSelectedIndicatorClasses()}><Check className="h-3.5 w-3.5" /></span>}</button>; })}</div>
        </section>
      </div>

      <div className="my-10 h-px w-full bg-stone-200 dark:bg-stone-800 md:my-14" />

      <div className="flex flex-col items-center">
        <button type="button" onClick={() => setShowAdvanced((current) => !current)} className={`mb-8 flex items-center gap-3 rounded-full border-2 px-8 py-4 text-base font-black ${showAdvanced ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-white dark:bg-white dark:text-orange-600" : "border-stone-200 bg-white text-stone-800 dark:border-stone-600 dark:bg-stone-800/70 dark:text-stone-100"}`}>{showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}<span>{t("phase3.toggle")}</span></button>
        {showAdvanced && <div className="w-full space-y-12 py-2">
          <section><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase2.theme.label")}</div><div className="flex flex-wrap gap-2">{THEME_KEYS.map((key) => { const value = tThemeValue(key); const selected = input.theme.includes(value); return <button key={key} type="button" data-testid={`theme-option-${key}`} onClick={() => onChange({ theme: selected ? input.theme.filter((item) => item !== value) : [...input.theme, value] })} className={`inline-flex items-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-bold ${selected ? "border-orange-400 bg-orange-600 text-white" : getUnselectedPillClasses()}`}>{selected && <span data-testid={`theme-indicator-${key}`} className={getSelectedIndicatorClasses()}><Check className="h-3.5 w-3.5" /></span>}{tTheme(key)}</button>; })}</div></section>
          <section className="grid grid-cols-1 gap-12 md:grid-cols-2"><div><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase2.pace.label")}</div><div className="flex flex-col gap-2">{PACE_KEYS.map((key) => { const selected = input.pace === key; return <button key={key} type="button" data-testid={`pace-option-${key}`} onClick={() => onChange({ pace: key })} className={`flex items-center justify-between rounded-3xl border-2 p-5 font-bold ${selected ? "border-orange-400 bg-orange-600 text-white" : "border-stone-200 bg-white text-stone-800 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-100"}`}><span>{tPace(`${key}.label`)}</span>{selected && <span data-testid={`pace-indicator-${key}`} className={getSelectedIndicatorClasses()}><Check className="h-3.5 w-3.5" /></span>}</button>; })}</div></div><div><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase2.budget.label")}</div><div className="grid grid-cols-2 gap-2">{BUDGET_KEYS.map((key) => { const selected = input.budget === key; return <button key={key} type="button" data-testid={`budget-option-${key}`} onClick={() => onChange({ budget: key })} className={`relative rounded-3xl border-2 p-6 font-bold ${selected ? "border-orange-400 bg-orange-600 text-white" : "border-stone-200 bg-white text-stone-800 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-100"}`}>{selected && <span data-testid={`budget-indicator-${key}`} className={`${getSelectedIndicatorClasses()} absolute right-4 top-4`}><Check className="h-3.5 w-3.5" /></span>}<span>{tBudget(`${key}.label`)}</span></button>; })}</div></div></section>
          <section><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase3.transport.label")}</div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{PREFERRED_TRANSPORT.map((transport) => { const selected = input.preferredTransport?.includes(transport) ?? false; return <button key={transport} type="button" onClick={() => { const current = input.preferredTransport ?? []; onChange({ preferredTransport: selected ? current.filter((item) => item !== transport) : [...current, transport] }); }} className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold ${selected ? "border-orange-400 bg-orange-600 text-white" : "border-stone-200 bg-white text-stone-800 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-100"}`}>{t(`transport.options.${transport}`)}</button>; })}</div></section>
          <section><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase3.mustVisit.label")}</div><div className="rounded-[2rem] border border-stone-200 bg-white/80 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/40 md:p-6"><div className="flex flex-col gap-3 md:flex-row"><input value={mustVisitInput} onChange={(e) => setMustVisitInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMustVisit(); } }} placeholder={t("phase3.mustVisit.placeholder")} className="flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><button type="button" onClick={addMustVisit} disabled={!mustVisitInput.trim()} className={`inline-flex items-center justify-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-black ${mustVisitInput.trim() ? "border-orange-400 bg-orange-600 text-white" : "border-stone-300 bg-stone-100 text-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}><Plus className="h-4 w-4" />{t("phase3.mustVisit.addButton")}</button></div>{(input.mustVisitPlaces?.length ?? 0) > 0 && <div className="mt-4 flex flex-wrap gap-2">{input.mustVisitPlaces?.map((place, index) => <span key={`${place}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-white">{place}<button type="button" onClick={() => removeMustVisit(index)} className="rounded-full text-stone-500 hover:text-orange-500 dark:text-stone-300 dark:hover:text-orange-300"><X className="h-4 w-4" /></button></span>)}</div>}</div></section>
          <section className="grid grid-cols-1 gap-8 xl:grid-cols-2"><div className="rounded-[2rem] border border-stone-200 bg-white/80 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/40 md:p-6"><div className="mb-5 flex items-center gap-2 text-xl font-bold text-stone-900 dark:text-white"><FaPlane className="h-4 w-4" />{t("phase3.reservations.transportTitle")}</div><div className="mb-4 grid grid-cols-2 gap-2">{TRANSPORT_TYPES.map((type) => <button key={type} type="button" onClick={() => setTransportType(type)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${transportType === type ? "border-orange-400 bg-orange-600 text-white" : "border-stone-300 bg-white text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"}`}>{t(`reservation.types.${type}`)}</button>)}</div><div className="space-y-3"><input value={transportName} onChange={(e) => setTransportName(e.target.value)} placeholder={t("phase3.reservations.transportNamePlaceholder")} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><input type="date" value={transportDate} min={today} onChange={(e) => setTransportDate(e.target.value)} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><input type="time" value={transportTime} onChange={(e) => setTransportTime(e.target.value)} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /></div><textarea value={transportNote} onChange={(e) => setTransportNote(e.target.value)} placeholder={t("phase3.reservations.memoPlaceholder")} className="h-24 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><button type="button" onClick={() => { if (!transportName.trim()) return; addFixedSchedule({ type: transportType, name: transportName.trim(), date: transportDate || undefined, time: transportTime || undefined, notes: transportNote || undefined }); setTransportName(""); setTransportDate(""); setTransportTime(""); setTransportNote(""); setTransportType("flight"); }} disabled={!transportName.trim()} className={`inline-flex items-center justify-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-black ${transportName.trim() ? "border-orange-400 bg-orange-600 text-white" : "border-stone-300 bg-stone-100 text-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}><Plus className="h-4 w-4" />{t("phase3.reservations.addTransportButton")}</button></div></div><div className="rounded-[2rem] border border-stone-200 bg-white/80 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/40 md:p-6"><div className="mb-5 flex items-center gap-2 text-xl font-bold text-stone-900 dark:text-white"><FaHotel className="h-4 w-4" />{t("phase3.reservations.hotelTitle")}</div><div className="space-y-3"><input value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder={t("phase3.reservations.hotelNamePlaceholder")} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><input type="date" value={hotelDate} min={today} onChange={(e) => setHotelDate(e.target.value)} className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><textarea value={hotelNote} onChange={(e) => setHotelNote(e.target.value)} placeholder={t("phase3.reservations.hotelMemoPlaceholder")} className="h-24 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-white" /><button type="button" onClick={() => { if (!hotelName.trim()) return; addFixedSchedule({ type: "hotel", name: hotelName.trim(), date: hotelDate || undefined, notes: hotelNote || undefined }); setHotelName(""); setHotelDate(""); setHotelNote(""); }} disabled={!hotelName.trim()} className={`inline-flex items-center justify-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-black ${hotelName.trim() ? "border-orange-400 bg-orange-600 text-white" : "border-stone-300 bg-stone-100 text-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-400"}`}><Plus className="h-4 w-4" />{t("phase3.reservations.addHotelButton")}</button></div></div></section>
          <section><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase3.reservations.label")}</div>{(input.fixedSchedule?.length ?? 0) > 0 ? <div className="grid gap-3">{input.fixedSchedule?.map((item, index) => <div key={`${item.type}-${item.name}-${index}`} className="relative flex items-start gap-4 rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/40"><div className="mt-1 rounded-full bg-orange-50 p-3 text-orange-600 dark:bg-orange-500/15 dark:text-orange-200">{item.type === "hotel" ? <FaHotel className="h-4 w-4" /> : item.type === "train" ? <FaTrain className="h-4 w-4" /> : item.type === "bus" ? <FaBus className="h-4 w-4" /> : <FaPlane className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-200">{t(`reservation.types.${item.type}`)}</span><span className="text-base font-bold text-stone-900 dark:text-white">{item.name}</span></div>{formatBookingDateTime(item.date, item.time) && <p className="mt-2 text-sm font-medium text-stone-600 dark:text-stone-300">{formatBookingDateTime(item.date, item.time)}</p>}{item.notes && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.notes}</p>}</div><button type="button" onClick={() => removeFixedSchedule(index)} className="rounded-full p-2 text-stone-400 hover:text-red-500"><X className="h-4 w-4" /></button></div>)}</div> : <div className="rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50/80 px-5 py-6 text-sm font-medium text-stone-500 dark:border-stone-700 dark:bg-stone-900/20 dark:text-stone-400">{t("phase3.reservations.empty")}</div>}</section>
          <section><div className="mb-5 text-2xl font-bold text-stone-900 dark:text-white">{t("phase3.freeText.label")}</div><textarea value={input.freeText || ""} onChange={(e) => onChange({ freeText: e.target.value })} placeholder={t("phase3.freeText.placeholder")} className="h-40 w-full resize-y rounded-[2rem] border-2 border-stone-200 bg-white p-6 text-lg font-medium text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-800/40 dark:text-white" /></section>
        </div>}
        <div className="mt-8 w-full max-w-md pb-16 md:mt-10"><button type="button" onClick={handleGenerateClick} disabled={isGenerating || !hasDest || !hasCompanion || !hasDates} className={`w-full rounded-full border-2 px-10 py-6 text-xl font-black uppercase tracking-[0.1em] ${isGenerating || !hasDest || !hasCompanion || !hasDates ? "cursor-not-allowed border-stone-300 bg-stone-200 text-stone-500 opacity-60 dark:border-stone-700 dark:bg-stone-800" : "border-orange-400 bg-orange-600 text-white"}`}>{isGenerating ? <span className="flex items-center justify-center gap-4"><span className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-transparent" />{t("generate.generating")}</span> : <span>{t("generate.quick")}</span>}</button></div>
      </div>
    </div>
  );
}
