"use client";

import { useState, useCallback } from "react";
import { Calendar, ChevronDown, Download, ExternalLink } from "lucide-react";
import {
  parseTripDates,
  downloadICS,
  generateGoogleCalendarUrl,
} from "@/lib/utils/calendar-export";
import type { Itinerary } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface CalendarExportButtonProps {
  itinerary: Itinerary;
  dates: string;
  className?: string;
}

// ============================================================================
// Date Picker Modal
// ============================================================================

function DatePickerDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}) {
  const [dateStr, setDateStr] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="font-bold text-stone-800 text-lg">開始日を選択</h3>
        <p className="text-sm text-stone-500">
          旅行の開始日を入力してください。カレンダーにイベントを追加します。
        </p>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-sm font-medium"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              if (dateStr) {
                const [y, m, d] = dateStr.split("-").map(Number);
                onConfirm(new Date(y, m - 1, d));
              }
            }}
            disabled={!dateStr}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function CalendarExportButton({
  itinerary,
  dates,
  className = "",
}: CalendarExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<"ics" | "google" | null>(
    null
  );

  const tripDates = parseTripDates(dates);

  const getStartDate = useCallback((): Date | null => {
    if (tripDates.hasSpecificDates && tripDates.startDate) {
      return tripDates.startDate;
    }
    return null;
  }, [tripDates]);

  const handleAction = useCallback(
    (action: "ics" | "google", startDate?: Date) => {
      const date = startDate || getStartDate();

      if (!date) {
        setPendingAction(action);
        setShowDatePicker(true);
        setIsOpen(false);
        return;
      }

      if (action === "ics") {
        downloadICS(itinerary, date);
      } else {
        const url = generateGoogleCalendarUrl(itinerary, date);
        window.open(url, "_blank", "noopener,noreferrer");
      }

      setIsOpen(false);
    },
    [itinerary, getStartDate]
  );

  const handleDateConfirm = useCallback(
    (date: Date) => {
      setShowDatePicker(false);
      if (pendingAction) {
        handleAction(pendingAction, date);
        setPendingAction(null);
      }
    },
    [pendingAction, handleAction]
  );

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium border border-stone-200 shadow-sm"
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>カレンダーに追加</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden z-20 min-w-[220px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction("ics");
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-stone-50 transition-colors text-sm text-stone-700 border-b border-stone-100"
              >
                <Download className="w-4 h-4 text-stone-500" />
                <div className="text-left">
                  <div className="font-medium">.ics ファイル</div>
                  <div className="text-[11px] text-stone-400">
                    Apple / Outlook カレンダー
                  </div>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction("google");
                }}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-stone-50 transition-colors text-sm text-stone-700"
              >
                <ExternalLink className="w-4 h-4 text-stone-500" />
                <div className="text-left">
                  <div className="font-medium">Google カレンダー</div>
                  <div className="text-[11px] text-stone-400">
                    ブラウザで追加
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Date Picker Dialog */}
      {showDatePicker && (
        <DatePickerDialog
          onConfirm={handleDateConfirm}
          onCancel={() => {
            setShowDatePicker(false);
            setPendingAction(null);
          }}
        />
      )}
    </>
  );
}
