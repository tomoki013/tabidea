"use client";

import { UserInput } from "@/lib/types";
import { useState } from "react";

interface StepDatesProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
}

export default function StepDates({ input, onChange }: StepDatesProps) {
  const [startDate, setStartDate] = useState(() => {
    const match = input.dates.match(/(\d{4}-\d{2}-\d{2})から(\d+)日間/);
    return match ? match[1] : "";
  });

  const [duration, setDuration] = useState(() => {
    const match = input.dates.match(/(\d{4}-\d{2}-\d{2})から(\d+)日間/);
    if (match) return parseInt(match[2]);
    const durationMatch = input.dates.match(/(\d+)日間/);
    return durationMatch ? parseInt(durationMatch[1]) : 3;
  });

  const updateParent = (d: string, dur: number) => {
    const datesStr = d ? `${d}から${dur}日間` : `${dur}日間`;
    onChange({ dates: datesStr });
  };

  const [isFlexible, setIsFlexible] = useState(() => input.dates.includes("時期は未定"));

  const handleDateChange = (val: string) => {
    setStartDate(val);
    setIsFlexible(false);
    updateParent(val, duration);
  };

  const handleDurationChange = (val: number) => {
    const newDur = Math.max(1, Math.min(30, val));
    setDuration(newDur);
    if (!isFlexible) {
      updateParent(startDate, newDur);
    } else {
      onChange({ dates: `時期は未定 (${newDur}日間)` });
    }
  };

  const toggleFlexible = () => {
    const newVal = !isFlexible;
    setIsFlexible(newVal);
    if (newVal) {
      onChange({ dates: `時期は未定 (${duration}日間)` });
    } else {
      updateParent(startDate, duration);
    }
  };

  return (
    <div className="flex flex-col h-full justify-center space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          いつ、どれくらい？
        </h2>
        <p className="font-hand text-muted-foreground">
          カレンダーを確認しましょう
        </p>
      </div>

      <div className="max-w-md mx-auto w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-stone-200 rotate-1 transform transition-transform hover:rotate-0 duration-500">

        {/* Flexible Toggle */}
        <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-200">
           <label className="text-sm font-bold text-stone-600 cursor-pointer select-none flex-1" htmlFor="flexible-check">
             時期は決まっていない
             <span className="block text-xs text-stone-400 font-normal mt-0.5">ベストシーズンを提案します</span>
           </label>
           <input
             id="flexible-check"
             type="checkbox"
             checked={isFlexible}
             onChange={toggleFlexible}
             className="w-5 h-5 text-primary border-stone-300 rounded-sm focus:ring-primary"
           />
        </div>

        {/* Date Input */}
        <div className={`space-y-3 transition-opacity duration-300 ${isFlexible ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">📅</span> 出発日 (任意)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={isFlexible}
            className="w-full bg-stone-50 border border-stone-300 rounded-md px-4 py-4 text-foreground text-xl focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Duration Input - Counter Style */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
             <span className="text-lg">⏱️</span> 旅行日数
          </label>
          <div className="flex items-center justify-between gap-4 p-2 rounded-lg border border-stone-300 bg-stone-50">
            <button
              onClick={() => handleDurationChange(duration - 1)}
              className="w-12 h-12 flex items-center justify-center rounded-md bg-white border border-stone-300 text-stone-700 shadow-sm hover:shadow-md active:scale-95 transition-all text-2xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={duration <= 1}
            >
              −
            </button>

            <div className="flex-1 text-center">
              <span className="text-4xl font-serif font-bold text-foreground block leading-none">
                {duration}
                <span className="text-sm font-sans font-normal text-stone-500 ml-1">
                  日間
                </span>
              </span>
              <span className="text-[10px] text-stone-400 block mt-1 font-mono">
                {duration === 1 ? "Day Trip" : `${duration - 1} Nights`}
              </span>
            </div>

            <button
              onClick={() => handleDurationChange(duration + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-md bg-white border border-stone-300 text-stone-700 shadow-sm hover:shadow-md active:scale-95 transition-all text-2xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={duration >= 30}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
