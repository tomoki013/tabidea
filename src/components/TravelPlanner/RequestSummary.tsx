"use client";

import { UserInput } from "@/lib/types";
import {
  FaCalendarAlt,
  FaUserFriends,
  FaWallet,
  FaWalking,
  FaMapMarkerAlt,
  FaThumbtack,
  FaHeart
} from "react-icons/fa";
import { FaUser, FaUsers, FaChildReaching } from "react-icons/fa6";

interface RequestSummaryProps {
  input: UserInput;
  className?: string;
}

export default function RequestSummary({ input, className = "" }: RequestSummaryProps) {
  // --- Mappings for Display ---

  const getCompanionLabel = (val: string) => {
    switch (val) {
      case "solo": return { label: "ひとり", icon: <FaUser /> };
      case "couple": return { label: "カップル", icon: <FaUserFriends /> };
      case "friends": return { label: "友達", icon: <FaUsers /> };
      case "family": return { label: "家族", icon: <FaChildReaching /> }; // Using ChildReaching as proxy for family
      default: return { label: "指定なし", icon: <FaUserFriends /> };
    }
  };

  const getBudgetLabel = (val: string) => {
    switch (val) {
      case "cheap": return "なるべく安く";
      case "standard": return "普通";
      case "luxury": return "贅沢に";
      default: return "指定なし";
    }
  };

  const getPaceLabel = (val: string) => {
    switch (val) {
      case "relaxed": return "ゆったり";
      case "standard": return "普通";
      case "packed": return "詰め込む";
      default: return "指定なし";
    }
  };

  const formatDates = (dateStr: string) => {
    // Try to parse "YYYY-MM-DDからX日間"
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})から(\d+)日間/);
    if (match) {
        return `${match[2]}日間`;
    }
    // "X日間"
    const match2 = dateStr.match(/(\d+)日間/);
    if (match2) {
        return `${match2[1]}日間`;
    }
    return dateStr;
  };

  const companionInfo = getCompanionLabel(input.companions);

  return (
    <div className={`w-full bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-8 relative overflow-hidden group ${className}`}>
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-3 mb-4 z-10 relative flex items-center gap-2">
            <span className="text-primary text-lg">✦</span>
            Your Request
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 relative z-10">
            {/* Destination / Vibe */}
            <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-wider font-bold mb-1">
                    <FaMapMarkerAlt /> Destination
                </div>
                <div className="font-serif text-stone-800 font-bold text-lg leading-tight">
                    {input.isDestinationDecided
                        ? input.destination
                        : (input.travelVibe || "おまかせ")
                    }
                </div>
                {!input.isDestinationDecided && input.region && input.region !== "anywhere" && (
                     <div className="text-xs text-stone-500 mt-1">({input.region === "domestic" ? "国内" : "海外"})</div>
                )}
            </div>

            {/* Dates */}
            <div className="col-span-1">
                <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-wider font-bold mb-1">
                    <FaCalendarAlt /> Duration
                </div>
                <div className="font-serif text-stone-800 font-bold text-lg">
                    {formatDates(input.dates)}
                </div>
            </div>

             {/* Companions */}
             <div className="col-span-1">
                <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-wider font-bold mb-1">
                    {companionInfo.icon} Companions
                </div>
                <div className="font-serif text-stone-800 font-bold text-lg">
                    {companionInfo.label}
                </div>
            </div>

             {/* Budget & Pace */}
             <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-wider font-bold mb-1">
                    <FaWallet /> Budget & Pace
                </div>
                <div className="font-serif text-stone-800 font-medium text-sm">
                    {getBudgetLabel(input.budget)} / {getPaceLabel(input.pace)}
                </div>
            </div>

            {/* Themes */}
            <div className="col-span-2 md:col-span-3">
                <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-wider font-bold mb-2">
                    <FaHeart /> Themes
                </div>
                <div className="flex flex-wrap gap-2">
                    {input.theme && input.theme.length > 0 ? (
                        input.theme.map((t, i) => (
                            <span key={i} className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full border border-stone-200">
                                {t}
                            </span>
                        ))
                    ) : (
                        <span className="text-stone-400 text-xs italic">指定なし</span>
                    )}
                </div>
            </div>

             {/* Must Visit */}
             {input.hasMustVisitPlaces && input.mustVisitPlaces && input.mustVisitPlaces.length > 0 && (
                <div className="col-span-2 md:col-span-4 border-t border-stone-100 pt-4 mt-2">
                    <div className="flex items-center gap-2 text-stone-400 text-xs uppercase tracking-wider font-bold mb-2">
                        <FaThumbtack className="text-terracotta" /> Must Visit
                    </div>
                    <div className="flex flex-wrap gap-2">
                         {input.mustVisitPlaces.map((place, i) => (
                            <span key={i} className="inline-block px-3 py-1 bg-primary/10 text-primary-dark text-xs font-bold rounded-md border border-primary/20">
                                {place}
                            </span>
                         ))}
                    </div>
                </div>
             )}

             {/* Free Text */}
             {input.freeText && (
                 <div className="col-span-2 md:col-span-4 border-t border-stone-100 pt-4 mt-2">
                    <div className="text-xs text-stone-400 font-bold mb-1">Note</div>
                    <p className="text-sm text-stone-600 italic">"{input.freeText}"</p>
                 </div>
             )}

        </div>
    </div>
  );
}
