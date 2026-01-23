"use client";

import { motion } from "framer-motion";
import { UserInput } from '@/types';
import {
  FaUtensils,
  FaLandmark,
  FaMountain,
  FaCoffee,
  FaSearch,
  FaShoppingBag,
  FaPalette,
  FaRunning,
  FaHotTub,
  FaCamera,
  FaCompass,
  FaQuestion
} from "react-icons/fa";

interface StepThemesProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
  onNext?: () => void;
  canComplete?: boolean;
  onComplete?: () => void;
}

const THEME_ITEMS = [
  { label: "グルメ", icon: FaUtensils, id: "グルメ" },
  { label: "歴史・文化", icon: FaLandmark, id: "歴史・文化" },
  { label: "自然・絶景", icon: FaMountain, id: "自然・絶景" },
  { label: "リラックス", icon: FaCoffee, id: "リラックス" },
  { label: "穴場スポット", icon: FaSearch, id: "穴場スポット" },
  { label: "ショッピング", icon: FaShoppingBag, id: "ショッピング" },
  { label: "アート", icon: FaPalette, id: "アート" },
  { label: "体験・アクティビティ", icon: FaRunning, id: "体験・アクティビティ" },
  { label: "温泉・サウナ", icon: FaHotTub, id: "温泉・サウナ" },
  { label: "写真映え", icon: FaCamera, id: "写真映え" },
  { label: "冒険", icon: FaCompass, id: "冒険" },
  { label: "その他", icon: FaQuestion, id: "その他" },
];

export default function StepThemes({ input, onChange, onNext, canComplete, onComplete }: StepThemesProps) {
  const toggleTheme = (t: string) => {
    if (input.theme.includes(t)) {
      onChange({ theme: input.theme.filter((x) => x !== t) });
    } else {
      onChange({ theme: [...input.theme, t] });
    }
  };

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-2 text-center mb-8 shrink-0">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-tight">
          どんな旅にしますか？
        </h2>
        <p className="font-hand text-muted-foreground text-sm sm:text-base">
          気になるテーマをタップして選んでください
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {THEME_ITEMS.map((item) => {
            const isSelected = input.theme.includes(item.id);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => toggleTheme(item.id)}
                className={`
                  group relative flex flex-col items-center justify-center p-4 aspect-square
                  transition-all duration-300 ease-out
                  border-2 rounded-xl
                  ${isSelected
                    ? "bg-white border-[#e67e22] shadow-[0_4px_20px_-4px_rgba(230,126,34,0.3)] scale-[1.02]"
                    : "bg-white/60 border-transparent hover:bg-white hover:border-stone-200 hover:shadow-sm"
                  }
                `}
              >
                {/* Selection Indicator (Stamp-like) */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-3 h-3 bg-[#e67e22] rounded-full animate-in zoom-in duration-300" />
                )}

                <div className={`
                  mb-3 transition-colors duration-300
                  ${isSelected ? "text-[#e67e22]" : "text-stone-400 group-hover:text-stone-600"}
                `}>
                  <Icon size={32} />
                </div>

                <span className={`
                  font-medium text-sm sm:text-base text-center font-hand tracking-wide
                  ${isSelected ? "text-[#2c2c2c] font-bold" : "text-stone-500"}
                `}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Proceed hint when themes are selected */}
        {input.theme.length > 0 && onNext && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center space-y-4"
          >
            <button
              onClick={onNext}
              className="text-primary font-medium hover:underline font-hand text-lg"
            >
              {input.theme.length}つのテーマで次へ進む →
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
