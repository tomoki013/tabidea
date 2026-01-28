"use client";

import { useState } from "react";
import { TransitInfo, TransitType } from "@/types";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion, FaTimes, FaCheck, FaMapMarkerAlt, FaClock } from "react-icons/fa";

interface TransitFormProps {
  dayIndex: number;
  totalDays: number;
  startDate?: string;
  initialData?: TransitInfo;
  onSave: (data: TransitInfo) => void;
  onCancel: () => void;
}

const TRANSIT_TYPES: { id: TransitType; label: string; icon: any }[] = [
  { id: "flight", label: "飛行機", icon: FaPlane },
  { id: "train", label: "電車", icon: FaTrain },
  { id: "bus", label: "バス", icon: FaBus },
  { id: "ship", label: "船", icon: FaShip },
  { id: "car", label: "車", icon: FaCar },
  { id: "other", label: "その他", icon: FaQuestion },
];

export default function TransitForm({
  dayIndex,
  totalDays,
  startDate,
  initialData,
  onSave,
  onCancel,
}: TransitFormProps) {
  const [type, setType] = useState<TransitType>(initialData?.type || "flight");
  const [depPlace, setDepPlace] = useState(initialData?.departure.place || "");
  const [depTime, setDepTime] = useState(initialData?.departure.time || "");
  const [arrPlace, setArrPlace] = useState(initialData?.arrival.place || "");
  const [arrTime, setArrTime] = useState(initialData?.arrival.time || "");
  const [memo, setMemo] = useState(initialData?.memo || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type,
      departure: { place: depPlace, time: depTime },
      arrival: { place: arrPlace, time: arrTime },
      memo,
    });
  };

  return (
    <div className="bg-white rounded-xl p-5 border-2 border-dashed border-[#e67e22]/30 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-stone-800 flex items-center gap-2 text-lg">
          <span className="bg-[#e67e22]/10 text-[#e67e22] px-2 py-1 rounded-md text-sm font-bold">Day {dayIndex}</span>
          移動手段の編集
        </h4>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors"
        >
          <FaTimes />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">移動タイプ</label>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {TRANSIT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl border-2 min-w-[80px] transition-all ${
                  type === t.id
                    ? "bg-[#e67e22]/5 border-[#e67e22] text-[#e67e22]"
                    : "bg-white border-stone-100 text-stone-400 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                <t.icon className="text-2xl mb-1.5" />
                <span className="text-xs font-bold whitespace-nowrap">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Route - Vertical Layout */}
        <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 relative">
          {/* Connecting Line */}
          <div className="absolute left-[27px] top-10 bottom-10 w-0.5 border-l-2 border-dashed border-stone-300 z-0" />

          {/* Departure */}
          <div className="relative z-10 grid grid-cols-[auto_1fr] gap-4 mb-6">
            <div className="mt-2 w-6 h-6 rounded-full bg-stone-200 border-2 border-white shadow-sm flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-stone-400" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 flex items-center gap-1">
                出発 <span className="text-[10px] font-normal text-stone-400">(FROM)</span>
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    required
                    value={depPlace}
                    onChange={(e) => setDepPlace(e.target.value)}
                    placeholder="出発地 (例: 東京駅)"
                    className="w-full pl-9 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50 focus:border-[#e67e22]"
                  />
                </div>
                <div className="relative w-32">
                  <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="time"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    className="w-full pl-9 pr-2 py-3 bg-white border border-stone-200 rounded-lg text-stone-800 text-center focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50 focus:border-[#e67e22]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Arrival */}
          <div className="relative z-10 grid grid-cols-[auto_1fr] gap-4">
            <div className="mt-2 w-6 h-6 rounded-full bg-[#e67e22] border-2 border-white shadow-sm flex items-center justify-center">
              <FaMapMarkerAlt className="text-white text-[10px]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 flex items-center gap-1">
                到着 <span className="text-[10px] font-normal text-stone-400">(TO)</span>
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    required
                    value={arrPlace}
                    onChange={(e) => setArrPlace(e.target.value)}
                    placeholder="到着地 (例: 大阪駅)"
                    className="w-full pl-9 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50 focus:border-[#e67e22]"
                  />
                </div>
                <div className="relative w-32">
                  <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="time"
                    value={arrTime}
                    onChange={(e) => setArrTime(e.target.value)}
                    className="w-full pl-9 pr-2 py-3 bg-white border border-stone-200 rounded-lg text-stone-800 text-center focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50 focus:border-[#e67e22]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">メモ</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="便名、座席番号、予約番号など (例: JL123便 15A)"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50 focus:border-[#e67e22]"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 px-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-[#d35400] transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <FaCheck /> 保存する
          </button>
        </div>
      </form>
    </div>
  );
}
