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
  ];

  const budgets = [
    { id: "saving", label: "節約", icon: "💸" },
    { id: "standard", label: "普通", icon: "💰" },
    { id: "luxury", label: "贅沢", icon: "💎" },
  ];

  const paces = [
    { id: "relaxed", label: "ゆったり", icon: "☕" },
    { id: "balanced", label: "普通", icon: "⚖️" },
    { id: "packed", label: "詰め込み", icon: "🔥" },
  ];

  const toggleTheme = (t: string) => {
    if (input.theme.includes(t)) {
      onChange({ theme: input.theme.filter((x) => x !== t) });
    } else {
      onChange({ theme: [...input.theme, t] });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8 pt-4 pb-20 overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-500 pr-2">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          どんな旅にしますか？
        </h2>
        <p className="font-hand text-muted-foreground">
          あなたの好みを集めて、プランを作ります
        </p>
      </div>

      {/* Themes - Sticker Style */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block text-center">
          テーマ (複数選択可)
        </label>
        <div className="flex flex-wrap gap-3 justify-center">
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => toggleTheme(t)}
              className={`
                px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 transform
                ${
                  input.theme.includes(t)
                    ? "bg-primary text-white shadow-md scale-105 -rotate-1"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-primary/50 hover:bg-orange-50"
                }
              `}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Budget */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block text-center">
            予算感
          </label>
          <div className="flex gap-2 justify-center">
            {budgets.map((b) => (
              <button
                key={b.id}
                onClick={() => onChange({ budget: b.id })}
                className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                  input.budget === b.id
                    ? "bg-white border-primary shadow-md scale-105 z-10"
                    : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span className="block text-xl mb-1">{b.icon}</span>
                <span className="text-xs font-bold">{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pace */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block text-center">
            ペース
          </label>
          <div className="flex gap-2 justify-center">
            {paces.map((p) => (
              <button
                key={p.id}
                onClick={() => onChange({ pace: p.id })}
                className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                  input.pace === p.id
                    ? "bg-white border-primary shadow-md scale-105 z-10"
                    : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span className="block text-xl mb-1">{p.icon}</span>
                <span className="text-xs font-bold">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
