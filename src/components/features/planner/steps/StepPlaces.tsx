"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaPlus, FaTrash } from "react-icons/fa";

interface StepPlacesProps {
  mustVisitPlaces: string[];
  onChange: (places: string[]) => void;
  onNext: () => void;
  hasDecided?: boolean;
  onDecisionChange: (decided: boolean) => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

export default function StepPlaces({
  mustVisitPlaces,
  onChange,
  onNext,
  hasDecided,
  onDecisionChange,
  canComplete,
  onComplete,
}: StepPlacesProps) {
  // We use the prop hasDecided if available, otherwise fallback to local logic (though validation relies on parent)
  // To handle the animation/UI state locally, we can derive it or use local state if props aren't passed (backward compat)
  // But for this task, we assume props are passed.

  // Actually, we need to know if "Yes" or "No" is selected.
  // "No" -> hasDecided=false (in parent context? No, wait.)
  // If we add `hasMustVisitPlaces` to UserInput:
  // True -> Yes
  // False -> No
  // Undefined -> Not selected

  const [currentInput, setCurrentInput] = useState("");

  const handleAddPlace = () => {
    if (currentInput.trim()) {
      onChange([...mustVisitPlaces, currentInput.trim()]);
      setCurrentInput("");
    }
  };

  const handleRemovePlace = (index: number) => {
    const newPlaces = [...mustVisitPlaces];
    newPlaces.splice(index, 1);
    onChange(newPlaces);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPlace();
    }
  };

  const handleYes = () => {
    onDecisionChange(true);
  };

  const handleNo = () => {
    onDecisionChange(false);
    onChange([]); // Clear places if any were added
  };

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-4 text-center mb-6 shrink-0">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-tight">
          絶対に行きたい
          <br />
          観光地はありますか？
        </h2>
        <p className="font-hand text-muted-foreground text-sm sm:text-base">
          もしあれば、優先的にプランに組み込みます
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full px-4 overflow-y-auto min-h-0">
        {/* Toggle Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleYes}
            className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
              hasDecided === true
                ? "bg-primary text-white shadow-md scale-105"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            ある
          </button>
          <button
            onClick={handleNo}
            className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
              hasDecided === false
                ? "bg-secondary text-white shadow-md scale-105"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            ない
          </button>
        </div>

        {/* Input Area (Only if "Yes" is selected) */}
        {hasDecided === true && (
          <div className="w-full space-y-6 animate-in zoom-in-95 duration-300">
            {/* Input Field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="場所名を入力 (例: 清水寺)"
                className="flex-1 px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                autoFocus
              />
              <button
                onClick={handleAddPlace}
                disabled={!currentInput.trim()}
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaPlus />
              </button>
            </div>

            {/* List of Added Places */}
            {mustVisitPlaces.length > 0 && (
              <div className="bg-white/50 rounded-2xl p-4 space-y-2 border border-stone-100">
                {mustVisitPlaces.map((place, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 shadow-sm animate-in slide-in-from-bottom-2 duration-300"
                  >
                    <span className="font-medium text-stone-700">{place}</span>
                    <button
                      onClick={() => handleRemovePlace(index)}
                      className="text-stone-400 hover:text-destructive p-2 transition-colors"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Proceed hint when places are added */}
            {mustVisitPlaces.length > 0 && !currentInput.trim() && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center space-y-4"
              >
                <button
                  onClick={onNext}
                  className="text-primary font-medium hover:underline font-hand text-lg"
                >
                  {mustVisitPlaces.length}箇所を追加して次へ進む →
                </button>

                {/* Skip & Create Plan Button */}
                {canComplete && onComplete && (
                    <div className="pt-2">
                        <button
                        onClick={onComplete}
                        className="text-stone-400 hover:text-stone-600 text-xs sm:text-sm font-medium hover:underline transition-colors"
                        >
                        任意項目をスキップしてプランを作成
                        </button>
                    </div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Proceed hint when "No" is selected */}
        {hasDecided === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center space-y-4"
          >
            <button
              onClick={onNext}
              className="text-primary font-medium hover:underline font-hand text-lg"
            >
              次へ進む →
            </button>

            {/* Skip & Create Plan Button */}
            {canComplete && onComplete && (
                <div className="pt-2">
                    <button
                    onClick={onComplete}
                    className="text-stone-400 hover:text-stone-600 text-xs sm:text-sm font-medium hover:underline transition-colors"
                    >
                    任意項目をスキップしてプランを作成
                    </button>
                </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
