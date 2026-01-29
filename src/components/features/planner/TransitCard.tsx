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
      {/* Ticket Container */}
      <div className="relative flex flex-col sm:flex-row bg-white border border-stone-300 rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition-shadow">

        {/* Left Stub (Type & Icon) */}
        <div className="sm:w-32 bg-stone-50 p-4 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 border-b sm:border-b-0 sm:border-r-2 border-dashed border-stone-300 relative">
           {/* Notches (Only visible on SM+ where layout is horizontal) */}
           <div className="hidden sm:block absolute -top-2 -right-2 w-4 h-4 bg-[#fcfbf9] rounded-full border border-stone-300 z-10 box-content"></div>
           <div className="hidden sm:block absolute -bottom-2 -right-2 w-4 h-4 bg-[#fcfbf9] rounded-full border border-stone-300 z-10 box-content"></div>

           <div className="flex flex-col items-center gap-1">
             <div className="p-2 bg-white border border-stone-200 rounded-full text-stone-600 shadow-sm group-hover:text-primary transition-colors">
               <Icon className="text-lg" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{label}</span>
           </div>

           {transit.duration && (
             <div className="text-[10px] font-mono bg-stone-200/50 text-stone-500 px-2 py-0.5 rounded-full">
               {transit.duration}
             </div>
           )}
        </div>

        {/* Right Content (Route) */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center gap-2">
           <div className="flex items-center justify-between gap-4">
              {/* Departure */}
              <div className="flex-1 min-w-0">
                 <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-0.5">Dep</div>
                 <div className="text-lg font-bold text-stone-800 font-serif leading-tight truncate" title={transit.departure.place}>
                   {transit.departure.place}
                 </div>
                 <div className="text-sm font-mono text-stone-500">
                   {transit.departure.time || "--:--"}
                 </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-stone-300 flex flex-col items-center justify-center px-2">
                <FaLongArrowAltRight size={20} />
                {transit.isBooked && (
                  <span className="text-[9px] bg-stone-800 text-white px-1.5 py-0.5 rounded font-bold mt-1">
                    BOOKED
                  </span>
                )}
              </div>

              {/* Arrival */}
              <div className="flex-1 min-w-0 text-right">
                 <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-0.5">Arr</div>
                 <div className="text-lg font-bold text-stone-800 font-serif leading-tight truncate" title={transit.arrival.place}>
                   {transit.arrival.place}
                 </div>
                 <div className="text-sm font-mono text-stone-500">
                   {transit.arrival.time || "--:--"}
                 </div>
              </div>
           </div>

           {transit.memo && (
             <div className="mt-2 pt-2 border-t border-dashed border-stone-200 text-xs text-stone-500 flex items-center gap-2">
               <span className="font-bold flex-shrink-0">Memo:</span>
               <span className="truncate">{transit.memo}</span>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
