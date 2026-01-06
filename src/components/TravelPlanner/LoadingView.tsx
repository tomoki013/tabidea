"use client";

import { useEffect, useState } from "react";

const loadingMessages = [
  "ガイドブックを開いています...",
  "現地の天気を調べています...",
  "とっておきの場所を探しています...",
  "旅のしおりを作成中...",
  "あなただけの物語を書いています...",
];

export default function LoadingView() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 h-[600px] relative rounded-3xl overflow-hidden shadow-2xl bg-[#fcfbf9] border-8 border-white flex items-center justify-center">
      {/* Paper Overlay Texture (Local Asset) */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-12 p-10 text-center max-w-md">
        {/* Animated Icon - Not a spinner, but a bouncing element */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
            ✈️
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-2xl font-serif text-foreground leading-tight min-h-16">
            {loadingMessages[step]}
          </p>
          <div className="w-16 h-1 bg-primary/20 mx-auto rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-indeterminate" />
          </div>
        </div>

        <p className="text-sm font-hand text-muted-foreground -rotate-2">
          もうすぐ出発です。
        </p>
      </div>
    </div>
  );
}
