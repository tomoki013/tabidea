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
    <div className="flex flex-col h-full justify-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-6 text-center">
        <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-bold tracking-widest uppercase mb-4 shadow-sm">
          Step 1: The Destination
        </div>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-foreground leading-tight">
          まずは、行き先を
          <br />
          教えてください。
        </h2>
        <p className="text-stone-600 text-lg font-hand">
          「パリ」「京都」のような都市名でも、<br />
          「静かな海辺」「歴史のある街」のようなイメージでも大丈夫。
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto w-full group">
        {/* Lined Paper Input Style */}
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && value && onNext()}
            placeholder="ここに行きたい..."
            className="w-full bg-transparent border-b-2 border-stone-300 pb-2 text-3xl sm:text-4xl font-serif text-center text-foreground placeholder:text-stone-300 focus:outline-hidden focus:border-primary transition-all duration-300"
            autoFocus
          />
          {/* Underline effect */}
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-300/50 -z-10 transform translate-y-2"></div>
        </div>

        <div className="absolute right-0 bottom-4 text-primary opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
          <span className="font-hand text-sm bg-white/80 px-2 py-1 rounded-md">Enter to confirm ↵</span>
        </div>
      </div>
    </div>
  );
}
