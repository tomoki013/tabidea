"use client";

interface StepCompanionsProps {
  value: string;
  onChange: (value: string) => void;
}

export default function StepCompanions({
  value,
  onChange,
}: StepCompanionsProps) {
  const options = [
    { id: "solo", label: "一人旅", icon: "👤", desc: "気ままに" },
    {
      id: "couple",
      label: "カップル・夫婦",
      icon: "💑",
      desc: "ロマンチックに",
    },
    { id: "family", label: "家族", icon: "👨‍👩‍👧‍👦", desc: "みんなで楽しく" },
    { id: "friends", label: "友人", icon: "👯", desc: "ワイワイと" },
    { id: "business", label: "ビジネス", icon: "💼", desc: "効率的に" },
    { id: "pet", label: "ペットと", icon: "🐕", desc: "一緒に" },
  ];

  return (
    <div className="flex flex-col h-full space-y-6 pt-4">
      <h2 className="text-3xl font-bold text-white">誰との旅ですか？</h2>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-4 noscrollbar">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              value === opt.id
                ? "bg-white text-black border-white shadow-xl scale-[1.02]"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            }`}
          >
            <span className="text-3xl mb-2 block">{opt.icon}</span>
            <span className="text-sm font-bold block">{opt.label}</span>
            <span
              className={`text-xs ${
                value === opt.id ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
