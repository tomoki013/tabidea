"use client";

import { Itinerary, UserInput } from "@/lib/types";
import Image from "next/image";
import TravelPlannerChat from "../TravelPlannerChat";
import ShareButtons from "../ShareButtons";

interface ResultViewProps {
  result: Itinerary;
  input: UserInput;
  onRestart: () => void;
  onRegenerate: (history: { role: string; text: string }[]) => void;
}

export default function ResultView({
  result,
  input,
  onRestart,
  onRegenerate,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage || "/images/eiffel-tower-and-sunset.jpg";

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 text-left animate-in fade-in duration-700">
      {/* Floating Restart Button */}
      <div className="fixed top-24 right-4 sm:right-8 z-50">
        <button
          onClick={onRestart}
          className="px-6 py-3 rounded-full bg-black/80 backdrop-blur-md hover:bg-black/90 border border-white/20 text-white transition-all text-sm font-medium shadow-2xl flex items-center gap-2 group"
        >
          <span className="group-hover:-rotate-180 transition-transform duration-500">
            ↺
          </span>
          New Trip
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative h-[60vh] w-full rounded-[2rem] overflow-hidden mb-12 shadow-2xl border border-white/10 group">
        <Image
          src={heroImg}
          alt={result.destination}
          fill
          className="object-cover transition-transform duration-[20s] group-hover:scale-110"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black" />

        <div className="absolute bottom-0 left-0 p-8 sm:p-16 w-full">
          <p className="text-sm font-mono text-teal-400 uppercase tracking-widest mb-4">
            Your Personalized Journey
          </p>
          <h1 className="text-5xl sm:text-7xl font-serif text-white mb-6 drop-shadow-lg">
            {result.destination}
          </h1>
          <p className="text-lg sm:text-xl text-white/90 font-light leading-relaxed max-w-2xl drop-shadow-md">
            {result.description}
          </p>

          <div className="mt-8">
            <ShareButtons input={input} result={result} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 px-2 sm:px-0">
        {/* Timeline */}
        <div className="space-y-20">
          {result.days.map((day) => (
            <div key={day.day}>
              <div className="flex items-end gap-4 mb-8 sticky top-4 z-30 bg-background/50 backdrop-blur-md p-4 rounded-xl border border-white/5">
                <span className="text-5xl font-serif text-white">
                  {day.day}
                </span>
                <span className="text-sm text-gray-400 uppercase tracking-widest mb-2">
                  Day
                </span>
                <div className="h-px bg-white/20 flex-1 mb-3 ml-4"></div>
                <span className="text-lg text-teal-400 font-serif italic mb-1">
                  {day.title}
                </span>
              </div>

              <div className="border-l border-white/10 ml-6 space-y-12 pb-12 relative">
                {day.activities.map((act, i) => (
                  <div key={i} className="relative pl-12 group">
                    <div className="absolute left-[-5px] top-6 w-2.5 h-2.5 rounded-full bg-teal-500 border-4 border-black/50 ring-1 ring-teal-500/50"></div>

                    <div className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300">
                      <div className="inline-block px-3 py-1 rounded bg-white/10 text-xs font-mono text-teal-300 mb-3">
                        {act.time}
                      </div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        {act.activity}
                      </h4>
                      <p className="text-gray-400 leading-relaxed text-sm">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Chat */}
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">
              Customize Plan with AI
            </h3>
            {/* Warning: onRegenerate prop is required but I provided a placeholder. need to implement real logic later */}
            <TravelPlannerChat itinerary={result} onRegenerate={onRegenerate} />
          </div>
        </div>

        {/* Sidebar / References */}
        <div className="space-y-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400 border-b border-white/10 pb-4">
            Reference Articles
          </h3>

          <div className="space-y-6 sticky top-8">
            {result.references && result.references.length > 0 ? (
              result.references.map((ref, i) => (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group bg-black/40 rounded-xl overflow-hidden border border-white/10 hover:border-teal-500/50 transition-all"
                >
                  <div className="relative h-40 w-full">
                    {ref.image ? (
                      <Image
                        src={ref.image}
                        alt={ref.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs">
                        No Image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h5 className="text-white text-sm font-bold line-clamp-2">
                        {ref.title}
                      </h5>
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-gray-500 italic">
                No specific references linked.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
