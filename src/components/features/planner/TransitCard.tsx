"use client";

import { TransitInfo, TransitType } from "@/types";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion, FaLongArrowAltRight } from "react-icons/fa";
import { motion } from "framer-motion";

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

// Color themes for each transit type
const TYPE_COLORS: Record<TransitType, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}> = {
  flight: {
    gradient: "from-sky-50 via-blue-50 to-indigo-50",
    iconBg: "bg-blue-500",
    iconColor: "text-white",
    accentColor: "border-blue-300",
  },
  train: {
    gradient: "from-emerald-50 via-green-50 to-teal-50",
    iconBg: "bg-green-600",
    iconColor: "text-white",
    accentColor: "border-green-300",
  },
  bus: {
    gradient: "from-orange-50 via-amber-50 to-yellow-50",
    iconBg: "bg-orange-500",
    iconColor: "text-white",
    accentColor: "border-orange-300",
  },
  ship: {
    gradient: "from-cyan-50 via-sky-50 to-blue-50",
    iconBg: "bg-cyan-600",
    iconColor: "text-white",
    accentColor: "border-cyan-300",
  },
  car: {
    gradient: "from-slate-50 via-gray-50 to-zinc-50",
    iconBg: "bg-slate-600",
    iconColor: "text-white",
    accentColor: "border-slate-300",
  },
  other: {
    gradient: "from-stone-50 via-neutral-50 to-gray-50",
    iconBg: "bg-stone-500",
    iconColor: "text-white",
    accentColor: "border-stone-300",
  },
};

export default function TransitCard({ transit, className = "" }: TransitCardProps) {
  const Icon = ICONS[transit.type] || FaQuestion;
  const label = TYPE_LABELS[transit.type] || "Transit";
  const colors = TYPE_COLORS[transit.type] || TYPE_COLORS.other;

  return (
    <motion.div
      className={`w-full max-w-2xl mx-auto my-6 ${className}`}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
    >
      {/* Ticket Container with Gradient Background */}
      <motion.div
        className={`relative flex flex-col sm:flex-row bg-gradient-to-br ${colors.gradient} border-2 ${colors.accentColor} rounded-lg shadow-md overflow-hidden group`}
        whileHover={{ scale: 1.02, shadow: "lg" }}
        transition={{ type: "spring", stiffness: 300 }}
      >

        {/* Left Stub (Type & Icon) */}
        <div className={`sm:w-32 bg-gradient-to-b ${colors.gradient} p-4 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 border-b sm:border-b-0 sm:border-r-2 border-dashed ${colors.accentColor} relative`}>
           {/* Notches (Only visible on SM+ where layout is horizontal) */}
           <div className="hidden sm:block absolute -top-2 -right-2 w-4 h-4 bg-[#fcfbf9] rounded-full border-2 border-current z-10 box-content"></div>
           <div className="hidden sm:block absolute -bottom-2 -right-2 w-4 h-4 bg-[#fcfbf9] rounded-full border-2 border-current z-10 box-content"></div>

           <div className="flex flex-col items-center gap-1">
             <motion.div
               className={`p-3 ${colors.iconBg} ${colors.iconColor} rounded-full shadow-lg`}
               whileHover={{ rotate: 360, scale: 1.1 }}
               transition={{ duration: 0.6 }}
             >
               <Icon className="text-xl" />
             </motion.div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{label}</span>
           </div>

           {transit.duration && (
             <div className="text-[10px] font-mono bg-white/70 text-stone-700 font-semibold px-2 py-1 rounded-full shadow-sm">
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
             <div className="mt-2 pt-2 border-t border-dashed border-stone-300/50 text-xs text-stone-600 flex items-center gap-2">
               <span className="font-bold flex-shrink-0">Memo:</span>
               <span className="truncate">{transit.memo}</span>
             </div>
           )}
        </div>

      </motion.div>
    </motion.div>
  );
}
