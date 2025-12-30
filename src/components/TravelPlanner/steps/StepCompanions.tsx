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
    <div className="flex flex-col h-full space-y-8 pt-4 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-serif font-bold text-foreground">
          誰との旅ですか？
        </h2>
        <p className="font-hand text-muted-foreground">
          旅のパートナーを選んでください
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pb-4 px-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`
              relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group overflow-hidden
              ${
                value === opt.id
                  ? "bg-white border-primary shadow-[4px_4px_0px_0px_rgba(230,126,34,1)] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white border-gray-100 hover:border-primary/50 hover:shadow-md"
              }
            `}
          >
            <span className="text-4xl mb-3 block transform group-hover:scale-110 transition-transform duration-300">
              {opt.icon}
            </span>
            <span className="text-lg font-bold block text-foreground font-serif">
              {opt.label}
            </span>
            <span className="text-xs text-muted-foreground font-hand">
              {opt.desc}
            </span>

            {/* Selection indicator */}
            {value === opt.id && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-bounce" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
