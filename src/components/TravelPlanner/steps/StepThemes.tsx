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
    <div className="flex flex-col h-full space-y-8 pt-4 pb-20">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">どんな旅にしますか？</h2>
        <p className="text-white/60 text-sm">
          好みやスタイルを教えてください。
        </p>
      </div>

      {/* Themes */}
      <div className="space-y-3">
        <label className="text-xs text-white/50 uppercase tracking-widest">
          テーマ (複数選択可)
        </label>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => toggleTheme(t)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                input.theme.includes(t)
                  ? "bg-white text-black font-bold shadow-lg scale-105"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <label className="text-xs text-white/50 uppercase tracking-widest">
          予算感
        </label>
        <div className="grid grid-cols-3 gap-2">
          {budgets.map((b) => (
            <button
              key={b.id}
              onClick={() => onChange({ budget: b.id })}
              className={`p-3 rounded-xl border text-center transition-all ${
                input.budget === b.id
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
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
        <label className="text-xs text-white/50 uppercase tracking-widest">
          ペース
        </label>
        <div className="grid grid-cols-3 gap-2">
          {paces.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange({ pace: p.id })}
              className={`p-3 rounded-xl border text-center transition-all ${
                input.pace === p.id
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
            >
              <span className="block text-xl mb-1">{p.icon}</span>
              <span className="text-xs font-bold">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
