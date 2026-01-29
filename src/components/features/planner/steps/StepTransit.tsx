"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserInput, TransitInfo } from '@/types';
import { FaPlus, FaTicketAlt } from "react-icons/fa";
import TransitForm from "./TransitForm";
import TransitListItem from "./TransitListItem";

interface StepTransitProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
  onNext?: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

// Helper functions (duplicated from StepDates for independence)
const parseDate = (str: string) => {
  const match = str.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
};

const parseDuration = (str: string) => {
  // Check for "日帰り" (Day trip = 1 day)
  if (str.includes("日帰り")) return 1;

  const daysMatch = str.match(/(\d+)日間/);
  if (daysMatch) {
    const d = parseInt(daysMatch[1]);
    return Math.max(1, isNaN(d) ? 1 : d);
  }
  const nightsMatch = str.match(/(\d+)泊(\d+)日/);
  if (nightsMatch) {
    const d = parseInt(nightsMatch[2]);
    return Math.max(1, isNaN(d) ? 1 : d);
  }
  return 3; // Default
};

const isDurationUndecidedCheck = (str: string) =>
  !str.includes("日帰り") && !/(\d+)日間/.test(str) && !/(\d+)泊(\d+)日/.test(str);


export default function StepTransit({ input, onChange, onNext, canComplete, onComplete }: StepTransitProps) {
  const startDate = parseDate(input.dates);
  const duration = parseDuration(input.dates);
  const isDurationUndecided = isDurationUndecidedCheck(input.dates);

  const [isAddingTransit, setIsAddingTransit] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<number | null>(null);
  const transits = input.transits || {};

  const handleSaveTransit = (dayIndex: number, data: TransitInfo) => {
    const newTransits = { ...transits, [dayIndex]: data };
    onChange({ transits: newTransits });
    setIsAddingTransit(false);
    setEditingDay(null);
    setSelectedDayForAdd(null);
  };

  const handleDeleteTransit = (dayIndex: number) => {
     const newTransits = { ...transits };
     delete newTransits[dayIndex];
     onChange({ transits: newTransits });
  };

  return (
    <div className="flex flex-col h-full space-y-8 pt-4 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          移動手段は決まっていますか？
        </h2>
        <p className="font-hand text-muted-foreground">
          飛行機や新幹線など、予約済みのものがあれば教えてください
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4">
        {isDurationUndecided ? (
             <div className="text-center p-8 bg-stone-50 rounded-xl border border-stone-200 text-stone-500">
                <p>日程が未定のため、移動情報の入力はスキップします。</p>
             </div>
        ) : (
            <div className="space-y-6 max-w-md mx-auto">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-stone-700 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-xl text-primary"><FaTicketAlt /></span>
                        <span className="flex flex-col leading-none">
                            登録済みの移動
                            <span className="text-[10px] text-stone-400 font-normal normal-case">スケジュールに反映されます</span>
                        </span>
                    </label>
                    {!isAddingTransit && (
                        <button
                            onClick={() => {
                                setIsAddingTransit(true);
                                setEditingDay(null);
                                setSelectedDayForAdd(1);
                            }}
                            className="text-xs text-white bg-stone-800 px-3 py-1.5 rounded-full font-bold hover:bg-black transition-colors flex items-center gap-1 shadow-sm"
                        >
                            <FaPlus size={10} /> 追加
                        </button>
                    )}
                </div>

                {/* Transit List */}
                <div className="space-y-3">
                    {Object.keys(transits).length === 0 && !isAddingTransit && (
                        <div className="text-center py-8 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 bg-stone-50/50">
                            まだ登録されていません
                        </div>
                    )}

                    {Object.entries(transits).map(([dayIdx, data]) => (
                        <TransitListItem
                            key={dayIdx}
                            dayIndex={Number(dayIdx)}
                            data={data}
                            onEdit={() => {
                                setEditingDay(Number(dayIdx));
                                setIsAddingTransit(true);
                            }}
                            onDelete={() => handleDeleteTransit(Number(dayIdx))}
                        />
                    ))}
                </div>

                {/* Add/Edit Form */}
                {isAddingTransit && (
                    <div className="mt-4 bg-white p-4 rounded-xl shadow-lg border border-primary/20 animate-in zoom-in-95 duration-200">
                        {/* Day Selector if new */}
                        {!editingDay && (
                            <div className="mb-4 bg-stone-50 p-3 rounded-lg border border-stone-200">
                                <label className="text-xs font-bold text-stone-500 mb-2 block">何日目の移動？</label>
                                <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto custom-scrollbar">
                                    {Array.from({ length: duration }, (_, i) => i + 1).map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setSelectedDayForAdd(d)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
                                                selectedDayForAdd === d
                                                    ? "bg-stone-800 text-white border-stone-800 shadow-sm"
                                                    : "bg-white text-stone-500 border-stone-200 hover:border-primary hover:text-primary"
                                            } ${transits[d] ? "opacity-50" : ""}`}
                                        >
                                            Day {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        {(editingDay || selectedDayForAdd) && (
                            <TransitForm
                                dayIndex={editingDay || selectedDayForAdd!}
                                totalDays={duration}
                                startDate={startDate}
                                initialData={editingDay ? transits[editingDay] : undefined}
                                onSave={(data) => handleSaveTransit(editingDay || selectedDayForAdd!, data)}
                                onCancel={() => {
                                    setIsAddingTransit(false);
                                    setEditingDay(null);
                                    setSelectedDayForAdd(null);
                                }}
                            />
                        )}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Proceed hint */}
      {onNext && !isAddingTransit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4 pt-2"
        >
          <button
            onClick={onNext}
            className="text-primary font-medium hover:underline font-hand text-lg"
          >
            {Object.keys(transits).length > 0 ? "次へ進む →" : "特になし（次へ） →"}
          </button>

           {/* Skip & Create Plan Button */}
           {canComplete && onComplete && (
              <div className="pt-2">
                <button
                  onClick={onComplete}
                  className="text-stone-400 hover:text-stone-600 text-xs sm:text-sm font-medium hover:underline transition-colors"
                >
                  任意項目をスキップしてプランを作成
                </button>
              </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
