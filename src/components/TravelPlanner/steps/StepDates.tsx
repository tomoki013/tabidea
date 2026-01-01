"use client";

import { UserInput } from "@/lib/types";
import { useState, useEffect } from "react";
import { FaPlus, FaMinus } from "react-icons/fa6";

interface StepDatesProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
}

export default function StepDates({ input, onChange }: StepDatesProps) {
  // Parsing logic
  const parseDate = (str: string) => {
    const match = str.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
  };

  const parseDuration = (str: string) => {
    const match = str.match(/(\d+)日間/); // Matches "X日間" or "YYYY-MM-DDからX日間"
    return match ? parseInt(match[1]) : 3;
  };

  const isDateUndecidedCheck = (str: string) => {
     return !/(\d{4}-\d{2}-\d{2})/.test(str);
  };

  const isDurationUndecidedCheck = (str: string) => {
     // If it explicitly says undecided or doesn't have "X日間" pattern
     // But wait, "X日間" matches even if we have date.
     // If we have "X日間", duration is decided.
     // If we don't have "X日間", it's undecided.
     // However, "時期は未定" has neither.
     // "2023-01-01出発" has date but no duration.
     return !/(\d+)日間/.test(str);
  };

  // State initialization
  const [startDate, setStartDate] = useState(() => parseDate(input.dates));
  const [duration, setDuration] = useState(() => parseDuration(input.dates));

  const [isDateUndecided, setIsDateUndecided] = useState(() => isDateUndecidedCheck(input.dates));
  const [isDurationUndecided, setIsDurationUndecided] = useState(() => isDurationUndecidedCheck(input.dates));

  // Update parent whenever state changes
  useEffect(() => {
    let result = "";

    if (isDateUndecided && isDurationUndecided) {
      result = "時期は未定";
    } else if (isDateUndecided && !isDurationUndecided) {
      result = `${duration}日間`;
    } else if (!isDateUndecided && isDurationUndecided) {
      if (startDate) {
        result = `${startDate}出発 (期間未定)`;
      } else {
         // Should not happen if logic is correct, fallback
         result = "時期は未定";
      }
    } else {
      // Both decided
      if (startDate) {
        result = `${startDate}から${duration}日間`;
      } else {
        result = `${duration}日間`; // Fallback
      }
    }

    // Only update if different to avoid loop (though React handles strict equality)
    if (result !== input.dates) {
       onChange({ dates: result });
    }
  }, [startDate, duration, isDateUndecided, isDurationUndecided]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDurationChange = (delta: number) => {
    const newDur = Math.max(1, Math.min(30, duration + delta));
    setDuration(newDur);
    if (isDurationUndecided) {
        setIsDurationUndecided(false);
    }
  };

  const handleDateChange = (val: string) => {
      setStartDate(val);
      if (isDateUndecided) {
          setIsDateUndecided(false);
      }
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
                        onChange={(e) => setIsDateUndecided(e.target.checked)}
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
                    <span className="text-lg">⏱️</span> 旅行日数 (泊数)
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="duration-undecided"
                        type="checkbox"
                        checked={isDurationUndecided}
                        onChange={(e) => setIsDurationUndecided(e.target.checked)}
                        className="w-4 h-4 text-primary border-stone-300 rounded-sm focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="duration-undecided" className="text-xs text-stone-500 font-bold cursor-pointer select-none">
                        未定
                    </label>
                </div>
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
                    <span className="text-2xl font-bold font-serif text-foreground">
                        {duration}
                    </span>
                    <span className="ml-2 text-sm text-stone-500 font-bold mt-1">
                        日間
                    </span>
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
                        {duration === 1 ? "日帰り" : `${duration - 1}泊${duration}日`}
                    </span>
                 )}
            </div>
        </div>

      </div>
    </div>
  );
}
