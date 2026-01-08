import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* Paper Texture Overlay */}
      <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-50 mix-blend-multiply pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 p-4">
        {/* Animated Icon */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
            ✈️
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xl font-serif text-foreground tracking-widest">
            Loading...
          </p>
          <div className="w-16 h-1 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-indeterminate" />
          </div>
          <p className="text-sm font-hand text-muted-foreground -rotate-2 mt-2">
             旅の準備をしています...
          </p>
        </div>
      </div>
    </div>
  );
}
