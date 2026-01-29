"use client";

import { TransitInfo, TransitType } from "@/types";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion, FaLongArrowAltRight } from "react-icons/fa";

interface TransitCardProps {
  transit: TransitInfo;
  className?: string;
}

const ICONS: Record<TransitType, any> = {
  flight: FaPlane,
  train: FaTrain,
  bus: FaBus,
  ship: FaShip,
  car: FaCar,
  other: FaQuestion,
};

const TYPE_LABELS: Record<TransitType, string> = {
  flight: "Flight",
  train: "Train",
  bus: "Bus",
  ship: "Ship",
  car: "Car",
  other: "Transit",
};

export default function TransitCard({ transit, className = "" }: TransitCardProps) {
  const Icon = ICONS[transit.type] || FaQuestion;
  const label = TYPE_LABELS[transit.type] || "Transit";

  return (
    <div className={`w-full max-w-2xl mx-auto my-6 ${className}`}>
      <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 transition-colors hover:bg-stone-100/50 hover:border-stone-300">
        {/* Header: Type & Duration */}
        <div className="flex items-center justify-between text-xs text-stone-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-stone-200/50 rounded-full text-stone-500">
               <Icon className="text-xs" />
            </div>
            <span>{label}</span>
            {transit.memo && (
              <>
                <span className="text-stone-300 mx-1">|</span>
                <span className="text-stone-400 font-normal normal-case truncate max-w-[150px]">
                  {transit.memo}
                </span>
              </>
            )}
          </div>
          {transit.duration && (
            <div className="font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded text-[10px]">
              {transit.duration}
            </div>
          )}
        </div>

        {/* Main Route Info */}
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          {/* From */}
          <div className="flex-1 min-w-0">
             <div className="text-lg sm:text-xl font-bold text-stone-700 font-serif leading-tight truncate" title={transit.departure.place}>
               {transit.departure.place}
             </div>
             <div className="text-sm font-mono text-stone-500 mt-1">
               {transit.departure.time || "--:--"}
             </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 text-stone-300 px-2">
            <FaLongArrowAltRight size={20} className="text-stone-300/80" />
          </div>

          {/* To */}
          <div className="flex-1 min-w-0 text-right">
             <div className="text-lg sm:text-xl font-bold text-stone-700 font-serif leading-tight truncate" title={transit.arrival.place}>
               {transit.arrival.place}
             </div>
             <div className="text-sm font-mono text-stone-500 mt-1">
               {transit.arrival.time || "--:--"}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
