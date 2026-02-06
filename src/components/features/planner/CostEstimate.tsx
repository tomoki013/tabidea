"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Wallet, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateTravelCost,
  formatCostRange,
  formatCurrency,
} from "@/lib/utils/cost-calculator";
import type { UserInput, Itinerary } from "@/types";
import BookingLinkButton from "./BookingLinkButton";

// ============================================================================
// Types
// ============================================================================

interface CostEstimateProps {
  input: UserInput;
  itinerary: Itinerary;
  className?: string;
}

// ============================================================================
// Cost Item Component
// ============================================================================

function CostItem({
  icon,
  label,
  range,
}: {
  icon: string;
  label: string;
  range: { min: number; max: number };
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-stone-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-stone-800 tabular-nums">
        {formatCostRange(range.min, range.max)}
      </span>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function CostEstimate({
  input,
  itinerary,
  className = "",
}: CostEstimateProps) {
  const [isOpen, setIsOpen] = useState(false);

  const estimate = useMemo(
    () =>
      calculateTravelCost({
        destination: itinerary.destination,
        days: itinerary.days.length,
        budget: input.budget,
        companions: input.companions,
        region: input.region,
      }),
    [itinerary.destination, itinerary.days.length, input.budget, input.companions, input.region]
  );

  return (
    <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-stone-800 text-sm">旅費の概算</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {estimate.nights}泊{estimate.days}日 ・{" "}
              {estimate.isDomestic ? "国内" : "海外"}旅行
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-700 tabular-nums">
              {formatCurrency(estimate.total.min)} 〜
            </p>
            <p className="text-xs text-stone-500">
              {formatCurrency(estimate.total.max)}
            </p>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5">
              {/* Breakdown */}
              <div className="bg-stone-50 rounded-xl p-4">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                  内訳
                </h4>
                <CostItem
                  icon="🏨"
                  label={`宿泊費（${estimate.nights}泊）`}
                  range={estimate.breakdown.accommodation}
                />
                <CostItem
                  icon="🍽️"
                  label={`食費（${estimate.days}日分）`}
                  range={estimate.breakdown.meals}
                />
                <CostItem
                  icon="🚃"
                  label={`交通費（${estimate.days}日分）`}
                  range={estimate.breakdown.transport}
                />
                <CostItem
                  icon="🎯"
                  label={`アクティビティ（${estimate.days}日分）`}
                  range={estimate.breakdown.activities}
                />
              </div>

              {/* Per Day */}
              <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-4">
                <span className="text-sm text-emerald-700 font-medium">
                  1日あたりの目安
                </span>
                <span className="font-bold text-emerald-800 tabular-nums">
                  {formatCostRange(estimate.perDay.min, estimate.perDay.max)}
                </span>
              </div>

              {/* Saving Tips */}
              {estimate.savingTips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                    <Lightbulb className="w-4 h-4" />
                    <span>節約のコツ</span>
                  </div>
                  <ul className="space-y-1.5">
                    {estimate.savingTips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-xs text-stone-600 flex items-start gap-2"
                      >
                        <span className="text-amber-500 mt-0.5">💡</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Booking CTA */}
              <div className="pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-500 mb-3">
                  この価格帯で探す
                </p>
                <div className="flex flex-wrap gap-2">
                  <BookingLinkButton
                    type="hotel"
                    destination={itinerary.destination}
                    label="ホテルを探す"
                  />
                  <BookingLinkButton
                    type="flight"
                    destination={itinerary.destination}
                    label="航空券を探す"
                  />
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[11px] text-stone-400 leading-relaxed">
                ※ 概算は目安です。実際の費用は時期、予約タイミング、為替レートなどにより変動します。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
