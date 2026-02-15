"use client";

import { TransitInfo, TransitType } from "@/types";
import { FaPlane, FaTrain, FaBus, FaShip, FaCar, FaQuestion, FaTimes, FaPen } from "react-icons/fa";

interface TransitListItemProps {
  dayIndex: number;
  data: TransitInfo;
  onEdit: () => void;
  onDelete: () => void;
}

const ICONS: Record<TransitType, React.ComponentType<{ className?: string }>> = {
  flight: FaPlane,
  train: FaTrain,
  bus: FaBus,
  ship: FaShip,
  car: FaCar,
  other: FaQuestion,
};

export default function TransitListItem({
  dayIndex,
  data,
  onEdit,
  onDelete,
}: TransitListItemProps) {
  const Icon = ICONS[data.type] || FaQuestion;

  return (
    <div className="group relative bg-white border border-stone-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
      {/* Left Notch */}
      <div className="absolute left-0 top-1/2 -translate-x-1/2 w-2 h-2 bg-stone-50 rounded-full border-r border-stone-200"></div>

      {/* Icon */}
      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
        <Icon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="bg-stone-800 text-white text-[10px] font-bold px-1.5 rounded-sm">
            Day {dayIndex}
          </span>
          {data.memo && <span className="text-[10px] text-stone-400 truncate">{data.memo}</span>}
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-stone-800 truncate">
            <span className="truncate">{data.departure.place}</span>
            <span className="text-stone-300 mx-1">→</span>
            <span className="truncate">{data.arrival.place}</span>
        </div>
        {(data.departure.time || data.arrival.time) && (
             <div className="text-[10px] text-stone-500 font-mono">
                {data.departure.time || "--:--"} - {data.arrival.time || "--:--"}
             </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-stone-400 hover:text-primary hover:bg-primary/5 rounded">
            <FaPen size={12} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded">
            <FaTimes size={12} />
        </button>
      </div>

      {/* Right Notch */}
      <div className="absolute right-0 top-1/2 translate-x-1/2 w-2 h-2 bg-stone-50 rounded-full border-l border-stone-200"></div>
    </div>
  );
}
