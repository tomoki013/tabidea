"use client";

import { UserInput } from "@/lib/types";
import { useState, useEffect } from "react";

interface StepDatesProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
}

export default function StepDates({ input, onChange }: StepDatesProps) {
  // Parse existing date string or default
  // Format expectation: "YYYY-MM-DDからX日間" or just "X日間"
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
    setDuration(val);
    updateParent(startDate, val);
  };

  return (
    <div className="flex flex-col h-full justify-center space-y-10">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">いつ、どれくらい？</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs text-white/50 uppercase tracking-widest">
            出発日 (任意)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-4 text-white text-xl focus:outline-hidden focus:border-white/50 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <label className="text-xs text-white/50 uppercase tracking-widest">
              旅行日数
            </label>
            <span className="text-2xl font-bold text-white">
              {duration}{" "}
              <span className="text-sm font-normal text-white/60">日間</span>
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="14"
            value={duration}
            onChange={(e) => handleDurationChange(parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <div className="flex justify-between text-xs text-white/30 font-mono">
            <span>1日</span>
            <span>1週間</span>
            <span>2週間</span>
          </div>
        </div>
      </div>
    </div>
  );
}
