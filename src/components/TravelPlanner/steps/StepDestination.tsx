"use client";

interface StepDestinationProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export default function StepDestination({
  value,
  onChange,
  onNext,
}: StepDestinationProps) {
  return (
    <div className="flex flex-col h-full justify-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl font-bold text-white leading-tight">
          どこへ
          <br />
          旅に出ますか？
        </h2>
        <p className="text-white/60 text-sm">
          国内・海外、具体的な都市名でも、
          <br />
          「南の島」のようなイメージでもOKです。
        </p>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value && onNext()}
        placeholder="例: 京都、パリ、北海道..."
        className="w-full bg-transparent border-b-2 border-white/20 pb-4 text-3xl font-light text-white placeholder:text-white/20 focus:outline-hidden focus:border-white transition-all"
        autoFocus
      />
    </div>
  );
}
