"use client";

import { UserInput } from "@/lib/types";

interface StepThemesProps {
  input: UserInput;
  onChange: (value: Partial<UserInput>) => void;
}

export default function StepThemes({ input, onChange }: StepThemesProps) {
  const themes = [
    "グルメ",
    "歴史・文化",
    "自然・絶景",
    "リラックス",
    "穴場スポット",
    "ショッピング",
    "アート",
    "体験・アクティビティ",
    "温泉・サウナ",
    "写真映え",
    "冒険",
  ];

  const toggleTheme = (t: string) => {
    if (input.theme.includes(t)) {
      onChange({ theme: input.theme.filter((x) => x !== t) });
    } else {
      onChange({ theme: [...input.theme, t] });
    }
  };

  return (
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-foreground leading-tight">
          どんな旅にしますか？
        </h2>
        <p className="font-hand text-muted-foreground">
          あなたの好みを集めて、プランを作ります
        </p>
      </div>

      {/* Themes - Sticker Style */}
      <div className="space-y-4 max-w-4xl mx-auto w-full px-4">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest block text-center mb-6">
          テーマ (複数選択可)
        </label>
        <div className="flex flex-wrap gap-4 justify-center">
          {themes.map((t, i) => (
            <button
              key={t}
              onClick={() => toggleTheme(t)}
              className={`
                px-6 py-3 rounded-sm text-base font-medium transition-all duration-300 transform font-hand border-2
                ${
                  input.theme.includes(t)
                    ? "bg-primary text-white border-primary shadow-lg scale-110 -rotate-2 z-10"
                    : `bg-white text-stone-600 border-stone-200 hover:border-primary/50 hover:bg-orange-50 rotate-${(i % 3) - 1} hover:scale-105`
                }
              `}
              style={{
                borderRadius: input.theme.includes(t) ? "2px 10px 4px 12px" : "4px"
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
