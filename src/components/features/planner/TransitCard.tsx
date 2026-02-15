"use client";

import { TransitInfo, TransitType } from "@/types";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion, FaLongArrowAltRight, FaLock, FaUnlock } from "react-icons/fa";
import { motion } from "framer-motion";

interface TransitCardProps {
  transit: TransitInfo;
  className?: string;
  isEditing?: boolean;
  onLockToggle?: () => void;
}

const ICONS: Record<TransitType, React.ComponentType<{ className?: string }>> = {
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

export default function TransitCard({ transit, className = "", isEditing = false, onLockToggle }: TransitCardProps) {
  const Icon = ICONS[transit.type] || FaQuestion;
  const label = TYPE_LABELS[transit.type] || "Transit";
  const colors = TYPE_COLORS[transit.type] || TYPE_COLORS.other;

  return (
    <motion.div
      className={`w-full max-w-2xl mx-auto my-8 ${className}`}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
    >
      {/* Enhanced Ticket Container with stronger visual identity */}
      <motion.div
        className={`relative flex flex-col sm:flex-row bg-gradient-to-br ${colors.gradient} border-4 ${colors.accentColor} rounded-xl shadow-2xl overflow-hidden group transform hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]`}
        whileHover={{ scale: 1.03, y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Perforated edge effect on left side */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/40 hidden sm:block" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.6) 8px, rgba(255,255,255,0.6) 12px)'
        }} />

        {/* Enhanced Left Stub (Type & Icon) */}
        <div className={`sm:w-40 bg-gradient-to-b ${colors.gradient} p-5 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 border-b-4 sm:border-b-0 sm:border-r-4 border-dashed ${colors.accentColor} relative`}>
           {/* Larger, more prominent notches */}
           <div className="hidden sm:block absolute -top-3 -right-3 w-6 h-6 bg-[#fcfbf9] rounded-full border-4 border-current z-10 box-content shadow-md"></div>
           <div className="hidden sm:block absolute -bottom-3 -right-3 w-6 h-6 bg-[#fcfbf9] rounded-full border-4 border-current z-10 box-content shadow-md"></div>

           <div className="flex flex-col items-center gap-2">
             <motion.div
               className={`p-4 ${colors.iconBg} ${colors.iconColor} rounded-full shadow-xl border-2 border-white/50`}
               whileHover={{ rotate: 360, scale: 1.15 }}
               transition={{ duration: 0.6 }}
             >
               <Icon className="text-2xl" />
             </motion.div>
             <span className="text-xs font-bold uppercase tracking-widest text-stone-700 bg-white/60 px-2 py-1 rounded">{label}</span>
           </div>

           {transit.duration && (
             <div className="text-xs font-mono bg-white/80 text-stone-800 font-bold px-3 py-1.5 rounded-full shadow-md border-2 border-white/50">
               ⏱️ {transit.duration}
             </div>
           )}
        </div>

        {/* Enhanced Right Content (Route) */}
        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center gap-3 bg-white/30">
           <div className="flex items-center justify-between gap-4">
              {/* Departure */}
              <div className="flex-1 min-w-0">
                 <div className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                   <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                   Departure
                 </div>
                 <div className="text-xl font-bold text-stone-900 font-serif leading-tight truncate" title={transit.departure.place}>
                   {transit.departure.place}
                 </div>
                 <div className="text-base font-mono text-stone-600 font-semibold mt-1">
                   {transit.departure.time || "--:--"}
                 </div>
              </div>

              {/* Enhanced Arrow */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center px-3 gap-2">
                <motion.div
                  className="text-stone-400"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <FaLongArrowAltRight size={28} />
                </motion.div>
                <div className="flex flex-col gap-1 items-center">
                  {transit.isBooked && (
                    <span className="text-[10px] bg-green-600 text-white px-2 py-1 rounded-full font-bold shadow-sm whitespace-nowrap">
                      ✓ BOOKED
                    </span>
                  )}
                  {transit.isLocked && !isEditing && (
                    <span className="text-[10px] bg-amber-600 text-white px-2 py-1 rounded-full font-bold shadow-sm whitespace-nowrap flex items-center gap-1">
                      <FaLock size={8} /> 固定
                    </span>
                  )}
                  {isEditing && onLockToggle && (
                    <button
                      onClick={onLockToggle}
                      className={`text-xs px-2 py-1 rounded-full font-bold shadow-sm transition-colors whitespace-nowrap flex items-center gap-1 ${
                        transit.isLocked
                          ? 'bg-amber-600 text-white hover:bg-amber-700'
                          : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                      }`}
                      title={transit.isLocked ? "ロック解除" : "ロック"}
                    >
                      {transit.isLocked ? <FaLock size={8} /> : <FaUnlock size={8} />}
                      {transit.isLocked ? '固定' : 'ロック'}
                    </button>
                  )}
                </div>
              </div>

              {/* Arrival */}
              <div className="flex-1 min-w-0 text-right">
                 <div className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                   Arrival
                   <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                 </div>
                 <div className="text-xl font-bold text-stone-900 font-serif leading-tight truncate" title={transit.arrival.place}>
                   {transit.arrival.place}
                 </div>
                 <div className="text-base font-mono text-stone-600 font-semibold mt-1">
                   {transit.arrival.time || "--:--"}
                 </div>
              </div>
           </div>

           {transit.memo && (
             <div className="mt-3 pt-3 border-t-2 border-dashed border-stone-300/60 text-sm text-stone-700 flex items-start gap-2 bg-white/40 -mx-6 px-6 -mb-6 pb-6">
               <span className="font-bold flex-shrink-0 text-stone-600">📝 Memo:</span>
               <span className="font-medium">{transit.memo}</span>
             </div>
           )}
        </div>

      </motion.div>
    </motion.div>
  );
}
