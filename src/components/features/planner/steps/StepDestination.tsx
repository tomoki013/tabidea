"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepDestinationProps {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
}

export default function StepDestination({
  value,
  onChange,
  onNext,
}: StepDestinationProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addDestination();
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeDestination(value.length - 1);
    }
  };

  const addDestination = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const removeDestination = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const canProceed = value.length > 0;

  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-6 text-center">
        <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-bold tracking-widest uppercase mb-4 shadow-sm">
          Step 1: The Destinations
        </div>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-foreground leading-tight">
          まずは、行き先を
          <br />
          教えてください。
        </h2>
        <p className="text-stone-600 text-lg font-hand">
          複数の場所を周遊できます。<br />
          都市名やイメージを入力してEnterで追加。
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto w-full">
        {/* Tags display */}
        <div className="min-h-[60px] mb-4">
          <AnimatePresence mode="popLayout">
            {value.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap justify-center gap-2"
              >
                {value.map((destination, index) => (
                  <motion.span
                    key={destination}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-lg font-medium shadow-sm"
                  >
                    <span className="font-serif">{destination}</span>
                    <button
                      type="button"
                      onClick={() => removeDestination(index)}
                      className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                      aria-label={`${destination}を削除`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input field */}
        <div className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? "パリ、京都..." : "次の行き先を追加..."}
            className="w-full bg-transparent border-b-2 border-stone-300 pb-2 text-2xl sm:text-3xl font-serif text-center text-foreground placeholder:text-stone-300 focus:outline-hidden focus:border-primary transition-all duration-300"
            autoFocus
          />
          {/* Underline effect */}
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-300/50 -z-10 transform translate-y-2"></div>

          {/* Hint text */}
          <div className="absolute right-0 -bottom-6 text-stone-500 opacity-70 text-sm font-hand">
            {inputValue.trim() ? "Enter で追加 ↵" : value.length > 0 ? "続けて追加、または次へ" : ""}
          </div>
        </div>

        {/* Add button for mobile/touch users */}
        {inputValue.trim() && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={addDestination}
            className="mt-6 mx-auto block px-6 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            「{inputValue.trim()}」を追加
          </motion.button>
        )}

        {/* Proceed hint */}
        {canProceed && !inputValue.trim() && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <button
              onClick={onNext}
              className="text-primary font-medium hover:underline font-hand text-lg"
            >
              {value.length}つの行き先で次へ進む →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
