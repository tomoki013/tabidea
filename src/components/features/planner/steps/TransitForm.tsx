"use client";

import { useState } from "react";
import { TransitInfo, TransitType } from "@/types";
import { useTranslations } from "next-intl";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion, FaTimes, FaCheck, FaMapMarkerAlt, FaClock } from "react-icons/fa";

interface TransitFormProps {
  dayIndex: number;
  totalDays: number;
  startDate?: string;
  initialData?: TransitInfo;
  onSave: (data: TransitInfo) => void;
  onCancel: () => void;
}

export default function TransitForm({
  dayIndex,
  totalDays,
  startDate,
  initialData,
  onSave,
  onCancel,
}: TransitFormProps) {
  const t = useTranslations("components.features.planner.steps.transitForm");
  const [type, setType] = useState<TransitType>(initialData?.type || "flight");
  const [depPlace, setDepPlace] = useState(initialData?.departure.place || "");
  const [depTime, setDepTime] = useState(initialData?.departure.time || "");
  const [arrPlace, setArrPlace] = useState(initialData?.arrival.place || "");
  const [arrTime, setArrTime] = useState(initialData?.arrival.time || "");
  const [memo, setMemo] = useState(initialData?.memo || "");
  // Default to true if undefined, as users typically enter booked flights
  const [isBooked, setIsBooked] = useState(initialData?.isBooked ?? true);
  const transitTypes: { id: TransitType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "flight", label: t("types.flight"), icon: FaPlane },
    { id: "train", label: t("types.train"), icon: FaTrain },
    { id: "bus", label: t("types.bus"), icon: FaBus },
    { id: "ship", label: t("types.ship"), icon: FaShip },
    { id: "car", label: t("types.car"), icon: FaCar },
    { id: "other", label: t("types.other"), icon: FaQuestion },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      type,
      departure: { place: depPlace, time: depTime },
      arrival: { place: arrPlace, time: arrTime },
      memo,
      isBooked,
    });
  };

  return (
    <div className="bg-white rounded-xl p-5 border-2 border-dashed border-[#e67e22]/30 shadow-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold text-stone-800 flex items-center gap-2 text-lg">
          <span className="bg-[#e67e22]/10 text-[#e67e22] px-2 py-1 rounded-md text-sm font-bold">
            {t("dayLabel", { day: dayIndex })}
          </span>
          {t("title")}
        </h4>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-colors"
        >
          <FaTimes />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Is Booked Switch */}
        <div className="bg-stone-50 p-3 rounded-lg flex items-center justify-between border border-stone-200">
          <div className="flex flex-col">
            <span className="font-bold text-stone-800 text-sm">{t("bookingStatus.label")}</span>
            <span className="text-[10px] text-stone-500">
              {isBooked
                ? t("bookingStatus.bookedDescription")
                : t("bookingStatus.unbookedDescription")}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isBooked}
              onChange={(e) => setIsBooked(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#e67e22]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#e67e22]"></div>
            <span className="ml-2 text-xs font-bold text-stone-600">
              {isBooked ? t("bookingStatus.booked") : t("bookingStatus.unbooked")}
            </span>
          </label>
        </div>

        {/* Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">{t("typeLabel")}</label>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {transitTypes.map((transitType) => (
              <button
                key={transitType.id}
                type="button"
                onClick={() => setType(transitType.id)}
                className={`flex flex-col items-center justify-center px-4 py-3 rounded-xl border-2 min-w-[80px] transition-all ${
                  type === transitType.id
                    ? "bg-[#e67e22]/5 border-[#e67e22] text-[#e67e22]"
                    : "bg-white border-stone-100 text-stone-400 hover:border-stone-200 hover:bg-stone-50"
                }`}
              >
                <transitType.icon className="text-2xl mb-1.5" />
                <span className="text-xs font-bold whitespace-nowrap">{transitType.label}</span>
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
                {t("departure.label")} <span className="text-[10px] font-normal text-stone-400">({t("departure.fromTag")})</span>
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    required
                    value={depPlace}
                    onChange={(e) => setDepPlace(e.target.value)}
                    placeholder={t("departure.placeholder")}
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
                {t("arrival.label")} <span className="text-[10px] font-normal text-stone-400">({t("arrival.toTag")})</span>
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    required
                    value={arrPlace}
                    onChange={(e) => setArrPlace(e.target.value)}
                    placeholder={t("arrival.placeholder")}
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
          <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wide">{t("memo.label")}</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={t("memo.placeholder")}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e67e22]/50 focus:border-[#e67e22]"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            className="flex-[2] py-3 px-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-[#d35400] transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <FaCheck /> {t("actions.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
