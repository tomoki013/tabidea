"use client";

import { UserInput } from "@/lib/types";
import { FaPlus, FaMinus } from "react-icons/fa6";

interface StepDatesProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
}

// Parsing logic can be moved outside or kept if it's only used here.
// For simplicity, let's keep them here but they are pure functions.
const parseDate = (str: string) => {
  const match = str.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const parseDuration = (str: string) => {
  const daysMatch = str.match(/(\d+)日間/);
  if (daysMatch) return parseInt(daysMatch[1]);
  const nightsMatch = str.match(/(\d+)泊(\d+)日/);
  if (nightsMatch) return parseInt(nightsMatch[2]);
  return 3;
};

const parseDisplayFormat = (str: string): "days" | "nights" => {
  if (/\d+泊\d+日/.test(str)) return "nights";
  return "days";
};

const isDateUndecidedCheck = (str:string) => !/(\d{4}-\d{2}-\d{2})/.test(str);
const isDurationUndecidedCheck = (str: string) => !/(\d+)日間/.test(str) && !/(\d+)泊(\d+)日/.test(str);


export default function StepDates({ input, onChange }: StepDatesProps) {
  // --- STATE DERIVATION ---
  // Derive all state directly from the input prop. No local state needed.
  const startDate = parseDate(input.dates);
  const duration = parseDuration(input.dates);
  const displayFormat = parseDisplayFormat(input.dates);
  const isDateUndecided = isDateUndecidedCheck(input.dates);
  const isDurationUndecided = isDurationUndecidedCheck(input.dates);

  // --- STRING FORMATTING LOGIC ---
  // A single function to construct the final string based on state.
  const formatDatesString = (
    sDate: string,
    dur: number,
    format: "days" | "nights",
    dateUndecided: boolean,
    durationUndecided: boolean
  ): string => {
    const formatDur = (d: number) => {
      if (format === "nights") {
        if (d === 1) return "日帰り";
        return `${d - 1}泊${d}日`;
      }
      return `${d}日間`;
    };

    if (dateUndecided && durationUndecided) return "時期は未定";
    if (dateUndecided) return formatDur(dur);
    if (durationUndecided) return sDate ? `${sDate}出発 (期間未定)` : "時期は未定";
    return sDate ? `${sDate}から${formatDur(dur)}` : formatDur(dur);
  };

  // --- EVENT HANDLERS ---
  // Handlers now construct the new string and call onChange directly.

  const handleDurationChange = (delta: number) => {
    const newDur = Math.max(1, Math.min(30, duration + delta));
    const newDates = formatDatesString(startDate, newDur, displayFormat, isDateUndecided, false);
    onChange({ dates: newDates });
  };

  const handleDateChange = (newDate: string) => {
    const newDates = formatDatesString(newDate, duration, displayFormat, false, isDurationUndecided);
    onChange({ dates: newDates });
  };

  const handleDateUndecidedToggle = (checked: boolean) => {
    const newDates = formatDatesString(startDate, duration, displayFormat, checked, isDurationUndecided);
    onChange({ dates: newDates });
  };

  const handleDurationUndecidedToggle = (checked: boolean) => {
    const newDates = formatDatesString(startDate, duration, displayFormat, isDateUndecided, checked);
    onChange({ dates: newDates });
  };

  const handleDisplayFormatChange = (newFormat: "days" | "nights") => {
    const newDates = formatDatesString(startDate, duration, newFormat, isDateUndecided, isDurationUndecided);
    onChange({ dates: newDates });
  };

  return (
    <div className="flex flex-col h-full justify-center space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          いつ、どれくらい？
        </h2>
        <p className="font-hand text-muted-foreground">
          決まっていなければチェックを入れてください
        </p>
      </div>

      <div className="max-w-md mx-auto w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-stone-200 rotate-1 transform transition-transform hover:rotate-0 duration-500">

        {/* Date Section */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">📅</span> 出発日
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="date-undecided"
                        type="checkbox"
                        checked={isDateUndecided}
                        onChange={(e) => handleDateUndecidedToggle(e.target.checked)}
                        className="w-4 h-4 text-primary border-stone-300 rounded-sm focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="date-undecided" className="text-xs text-stone-500 font-bold cursor-pointer select-none">
                        未定
                    </label>
                </div>
            </div>

            <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={isDateUndecided}
                className={`w-full bg-stone-50 border border-stone-300 rounded-md px-4 py-4 text-foreground text-xl focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer ${
                    isDateUndecided ? "opacity-40 cursor-not-allowed bg-stone-100" : ""
                }`}
            />
        </div>

        {/* Duration Section */}
        <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">⏱️</span> 旅行日数
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="duration-undecided"
                        type="checkbox"
                        checked={isDurationUndecided}
                        onChange={(e) => handleDurationUndecidedToggle(e.target.checked)}
                        className="w-4 h-4 text-primary border-stone-300 rounded-sm focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="duration-undecided" className="text-xs text-stone-500 font-bold cursor-pointer select-none">
                        未定
                    </label>
                </div>
            </div>

            {/* Display Format Toggle */}
            <div className={`flex justify-center gap-1 transition-all duration-300 ${isDurationUndecided ? "opacity-40 pointer-events-none" : ""}`}>
                <button
                    onClick={() => handleDisplayFormatChange("days")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-l-md border transition-all ${
                        displayFormat === "days"
                            ? "bg-primary text-white border-primary"
                            : "bg-stone-50 text-stone-500 border-stone-300 hover:bg-stone-100"
                    }`}
                >
                    ○日間
                </button>
                <button
                    onClick={() => handleDisplayFormatChange("nights")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-r-md border-t border-b border-r transition-all ${
                        displayFormat === "nights"
                            ? "bg-primary text-white border-primary"
                            : "bg-stone-50 text-stone-500 border-stone-300 hover:bg-stone-100"
                    }`}
                >
                    ○泊○日
                </button>
            </div>

            <div className={`flex items-center gap-4 transition-all duration-300 ${isDurationUndecided ? "opacity-40 pointer-events-none grayscale" : ""}`}>
                <button
                    onClick={() => handleDurationChange(-1)}
                    disabled={duration <= 1 || isDurationUndecided}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-stone-600 hover:bg-stone-200 hover:border-stone-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease duration"
                >
                    <FaMinus size={14} />
                </button>

                <div className="flex-1 bg-stone-50 border border-stone-300 rounded-md px-4 py-3 flex items-center justify-center relative">
                    {displayFormat === "days" ? (
                        <>
                            <span className="text-2xl font-bold font-serif text-foreground">
                                {duration}
                            </span>
                            <span className="ml-2 text-sm text-stone-500 font-bold mt-1">
                                日間
                            </span>
                        </>
                    ) : (
                        <span className="text-xl font-bold font-serif text-foreground">
                            {duration === 1 ? "日帰り" : `${duration - 1}泊${duration}日`}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => handleDurationChange(1)}
                    disabled={duration >= 30 || isDurationUndecided}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-stone-100 border border-stone-200 text-stone-600 hover:bg-stone-200 hover:border-stone-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase duration"
                >
                    <FaPlus size={14} />
                </button>
            </div>

            <div className="text-center h-6">
                 {!isDurationUndecided && (
                    <span className="text-xs text-stone-400 font-mono block animate-in fade-in duration-300">
                        {displayFormat === "days"
                            ? (duration === 1 ? "日帰り" : `${duration - 1}泊${duration}日`)
                            : `${duration}日間`
                        }
                    </span>
                 )}
            </div>
        </div>

      </div>
    </div>
  );
}
