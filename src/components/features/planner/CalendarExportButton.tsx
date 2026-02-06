"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const tripDates = parseTripDates(dates);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 140; // approximate height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight + 16;

      setDropdownPosition({
        top: openUpward ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
        left: Math.max(8, rect.right - 240), // 240 = min-w-[240px], with 8px margin
        openUpward,
      });
    }
  }, [isOpen]);

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
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-stone-700 rounded-xl hover:bg-stone-50 transition-all text-sm font-bold border border-stone-200 shadow-sm hover:shadow-md"
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>カレンダーに追加</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />
            {createPortal(
              <div
                className="fixed z-50 bg-white rounded-xl shadow-xl border border-stone-200/80 overflow-hidden min-w-[240px]"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction("ics");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-stone-50 transition-colors text-sm text-stone-700 border-b border-stone-100 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Download className="w-4 h-4 text-stone-500 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium group-hover:text-primary transition-colors">.ics ファイル</div>
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
                  className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-stone-50 transition-colors text-sm text-stone-700 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium group-hover:text-primary transition-colors">Google カレンダー</div>
                    <div className="text-[11px] text-stone-400">
                      ブラウザで追加
                    </div>
                  </div>
                </button>
              </div>,
              document.body
            )}
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
