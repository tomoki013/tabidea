"use client";

import { Itinerary, UserInput } from "@/lib/types";
import Image from "next/image";
import TravelPlannerChat from "../TravelPlannerChat";
import ShareButtons from "../ShareButtons";
import { FaMapMarkerAlt, FaClock, FaCalendarAlt } from "react-icons/fa";

interface ResultViewProps {
  result: Itinerary;
  input: UserInput;
  onRestart: () => void;
  onRegenerate: (history: { role: string; text: string }[]) => void;
  isUpdating?: boolean;
}

export default function ResultView({
  result,
  input,
  onRestart,
  onRegenerate,
  isUpdating = false,
}: ResultViewProps) {
  // Use heroImage if available, else a fallback
  const heroImg = result.heroImage || "/images/eiffel-tower-and-sunset.jpg";

  // Helper to parse date string
  const formatTravelDates = (dateStr: string) => {
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})から(\d+)日間/);
    if (match) {
      const startDate = new Date(match[1]);
      const duration = parseInt(match[2], 10);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + duration - 1);

      const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    // If no specific date but has duration
    const durationMatch = dateStr.match(/(\d+)日間/);
    if (durationMatch) {
        return `${durationMatch[1]} Days Trip`;
    }
    return dateStr;
  };

  const travelDates = formatTravelDates(input.dates);

  return (
    <div className="w-full max-w-5xl mx-auto mt-4 text-left animate-in fade-in duration-700 pb-20 relative">
      {/* Updating Overlay */}
      {isUpdating && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-full shadow-xl border-4 border-primary/20 animate-bounce">
             <span className="text-4xl">✏️</span>
          </div>
          <h2 className="mt-6 text-3xl font-hand font-bold text-stone-800 tracking-wide animate-pulse">
            プランを書き直しています...
          </h2>
          <p className="mt-2 text-stone-500 font-sans text-sm">
            Updating your travel plan
          </p>
        </div>
      )}

      {/* Floating Restart Button */}
      <div className="fixed top-24 right-4 sm:right-8 z-50">
        <button
          onClick={onRestart}
          className="px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md hover:bg-white border-2 border-primary/20 text-primary transition-all text-sm font-bold shadow-lg flex items-center gap-2 group"
        >
          <span className="group-hover:-rotate-180 transition-transform duration-500">
            ↺
          </span>
          New Trip
        </button>
      </div>

      {/* Journal Header Section */}
      <div className="relative mb-16 px-4 sm:px-0">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-sm overflow-hidden shadow-xl border-8 border-white bg-white rotate-1">
             <Image
                src={heroImg}
                alt={result.destination}
                fill
                className="object-cover"
                priority
            />
             {/* Tape Effect */}
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 rotate-[-2deg] shadow-sm backdrop-blur-sm"></div>
        </div>

        <div className="mt-8 text-center relative z-10">
            <div className="inline-block bg-white/80 backdrop-blur-sm px-8 py-6 rounded-sm shadow-sm border border-stone-100 -rotate-1 relative group">
                 {/* Date Stamp */}
                 <div className="absolute -top-6 -right-6 sm:-right-12 bg-white border-2 border-primary/30 text-stone-600 font-mono text-xs font-bold px-3 py-1.5 shadow-sm rotate-12 rounded-sm z-20">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                       <FaCalendarAlt className="text-primary" />
                       {travelDates}
                    </div>
                    {/* Stamp inner border */}
                    <div className="absolute inset-0.5 border border-primary/10 pointer-events-none"></div>
                 </div>

                 <p className="text-sm font-hand text-stone-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                    <FaMapMarkerAlt className="text-primary" />
                    Your Destination
                </p>
                <h1 className="text-4xl sm:text-6xl font-serif text-stone-800 mb-4 tracking-tight">
                    {result.destination}
                </h1>
                 <p className="text-lg text-stone-600 font-light leading-relaxed max-w-xl mx-auto font-sans">
                    {result.description}
                </p>
            </div>
        </div>

        {/* Share Buttons */}
        <div className="flex justify-center mt-6">
             <ShareButtons input={input} result={result} />
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 px-4 sm:px-0">
        {/* Timeline */}
        <div className="space-y-16">
          {result.days.map((day) => (
            <div key={day.day} className="relative">
              {/* Day Header - Sticky but styled for light theme */}
              <div className="sticky top-4 z-30 mb-8">
                  <div className="inline-flex items-center gap-4 bg-[#fcfbf9]/95 backdrop-blur-md py-3 px-6 rounded-r-full shadow-sm border border-stone-200 border-l-4 border-l-primary shadow-stone-200/50">
                    <span className="text-4xl font-serif text-primary">
                        {day.day}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">Day</span>
                        <span className="text-stone-600 font-serif italic text-lg leading-none">
                            {day.title}
                        </span>
                    </div>
                  </div>
              </div>

              {/* Activities */}
              <div className="border-l-2 border-stone-200 ml-8 space-y-8 pb-8 relative">
                {day.activities.map((act, i) => (
                  <div key={i} className="relative pl-10 group">
                    {/* Dot on timeline */}
                    <div className="absolute left-[-9px] top-6 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm z-10"></div>

                    {/* Activity Card */}
                    <div className="bg-white hover:bg-stone-50 border border-stone-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1">
                        {/* Decorative background stripe */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-stone-200 group-hover:bg-primary transition-colors"></div>

                      <div className="flex items-center gap-2 mb-2 text-stone-500 text-sm font-mono bg-stone-100 inline-block px-2 py-1 rounded-md">
                        <FaClock className="text-primary/70" />
                        {act.time}
                      </div>

                      <h4 className="text-xl font-bold text-stone-800 mb-2 font-serif">
                        {act.activity}
                      </h4>
                      <p className="text-stone-600 leading-relaxed text-sm">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Chat Section - Restyled */}
          <div className="bg-white rounded-3xl p-8 border-2 border-stone-100 shadow-lg relative overflow-hidden">
             {/* Texture overlay */}
             <div className="absolute inset-0 bg-[url('/images/cream-paper.png')] opacity-20 pointer-events-none mix-blend-multiply" />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                        🤖
                    </div>
                    <h3 className="text-xl font-bold text-stone-800 font-serif">
                        Customize Plan with AI
                    </h3>
                </div>

                <div className="bg-stone-50/50 rounded-xl">
                    <TravelPlannerChat itinerary={result} onRegenerate={onRegenerate} isRegenerating={isUpdating} />
                </div>
            </div>
          </div>
        </div>

        {/* Sidebar / References */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm sticky top-8">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 pb-4 mb-4 flex items-center gap-2">
                <FaCalendarAlt /> Reference Articles
              </h3>

              <div className="space-y-6">
                {result.references && result.references.length > 0 ? (
                  result.references.map((ref, i) => (
                    <a
                      key={i}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative"
                    >
                        <div className="relative h-32 w-full rounded-lg overflow-hidden border border-stone-200 shadow-sm group-hover:shadow-md transition-all">
                        {ref.image ? (
                          <Image
                            src={ref.image}
                            alt={ref.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                            No Image
                          </div>
                        )}
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      </div>
                       <h5 className="mt-2 text-stone-700 text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                            {ref.title}
                        </h5>
                    </a>
                  ))
                ) : (
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-sm text-stone-500 italic text-center">
                    No specific references linked.
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
