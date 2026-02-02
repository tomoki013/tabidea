"use client";

import { useState } from "react";
import { PlanOutline } from "@/types";
import { motion } from "framer-motion";
import { MapPin, Bed, ArrowRight, Check } from "lucide-react";

interface OutlineReviewProps {
  outline: PlanOutline;
  onConfirm: (updatedOutline: PlanOutline) => void;
  isGenerating: boolean;
}

export default function OutlineReview({
  outline,
  onConfirm,
  isGenerating,
}: OutlineReviewProps) {
  const [localOutline, setLocalOutline] = useState<PlanOutline>(outline);

  const handleDayChange = (
    index: number,
    field: "overnight_location" | "title",
    value: string
  ) => {
    const newDays = [...localOutline.days];
    newDays[index] = { ...newDays[index], [field]: value };
    setLocalOutline({ ...localOutline, days: newDays });
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-2">
          <Check className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-stone-800">
          旅の概要ができました
        </h1>
        <p className="text-stone-500 text-sm">
          詳細プランを作成する前に、宿泊地や大まかな流れを調整できます。
          <br />
          特に宿泊地を変更したい場合はここで修正してください。
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Destination Header */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2 text-stone-700 font-bold">
            <MapPin className="w-5 h-5 text-primary" />
            <span>{localOutline.destination}</span>
          </div>
          <p className="text-sm text-stone-500 mt-1 pl-7">
            {localOutline.description}
          </p>
        </div>

        {/* Days List */}
        <div className="divide-y divide-stone-100">
          {localOutline.days.map((day, index) => (
            <div key={day.day} className="p-4 sm:p-6 hover:bg-stone-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Day Badge */}
                <div className="flex-shrink-0">
                  <span className="inline-block px-3 py-1 bg-stone-800 text-white text-xs font-bold rounded-full">
                    Day {day.day}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-bold text-stone-400 mb-1">
                      テーマ・タイトル
                    </label>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) =>
                        handleDayChange(index, "title", e.target.value)
                      }
                      className="w-full bg-transparent border-b border-stone-200 focus:border-primary focus:outline-none py-1 font-bold text-stone-800 transition-colors"
                    />
                  </div>

                  {/* Overnight Location Input */}
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Bed className="w-4 h-4 text-amber-500" />
                      <label className="text-xs font-bold text-amber-700">
                        宿泊エリア
                      </label>
                    </div>
                    <input
                      type="text"
                      value={day.overnight_location}
                      onChange={(e) =>
                        handleDayChange(index, "overnight_location", e.target.value)
                      }
                      className="w-full bg-white border border-stone-200 rounded px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                      placeholder="例：京都市内、大阪・梅田周辺..."
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      ※この場所を基準に翌日の行程が生成されます
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-4">
        <button
          onClick={() => onConfirm(localOutline)}
          disabled={isGenerating}
          className="w-full py-4 px-6 bg-primary text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⏳</span>
              詳細プランを作成中...
            </>
          ) : (
            <>
              <span>旅のしおりを作成する</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>

      <div className="h-10" />
    </div>
  );
}
