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

  const handleDateChange = (val: string) => {
    setStartDate(val);
    updateParent(val, duration);
  };

  const handleDurationChange = (val: number) => {
    const newDur = Math.max(1, Math.min(30, val));
    setDuration(newDur);
    updateParent(startDate, newDur);
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

      <div className="max-w-md mx-auto w-full space-y-8 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">

        {/* Date Input */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            出発日 (任意)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-foreground text-xl focus:outline-hidden focus:border-primary/50 transition-colors cursor-pointer"
          />
        </div>

        {/* Duration Input - Counter Style */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            旅行日数
          </label>
          <div className="flex items-center justify-between gap-4 p-2 rounded-2xl border border-gray-200 bg-gray-50/50">
            <button
              onClick={() => handleDurationChange(duration - 1)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-foreground shadow-xs hover:shadow-md active:scale-95 transition-all text-2xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={duration <= 1}
            >
              −
            </button>

            <div className="flex-1 text-center">
              <span className="text-3xl font-serif font-bold text-foreground block leading-none">
                {duration}
                <span className="text-sm font-sans font-normal text-muted-foreground ml-1">
                  日間
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground/60 block mt-1 font-mono">
                {duration === 1 ? "Day Trip" : `${duration - 1} Nights`}
              </span>
            </div>

            <button
              onClick={() => handleDurationChange(duration + 1)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-foreground shadow-xs hover:shadow-md active:scale-95 transition-all text-2xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
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
