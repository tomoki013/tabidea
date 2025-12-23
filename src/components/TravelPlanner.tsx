"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Itinerary, UserInput } from "@/lib/types";
import { generatePlan, regeneratePlan } from "@/app/actions/travel-planner";
import TravelPlannerChat from "./TravelPlannerChat";

type PlanStatus = "idle" | "loading" | "complete" | "error";

export default function TravelPlanner() {
  const [input, setInput] = useState<UserInput>({
    destination: "",
    dates: "",
    companions: "solo",
    theme: [],
  });
  
  const [status, setStatus] = useState<PlanStatus>("idle");
  const [result, setResult] = useState<Itinerary | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // RAG Simulation State
  const loadingMessages = [
    "ともきち日記のアーカイブにアクセス中...",
    "関連するブログ記事を検索中...",
    "体験談を抽出中...",
    "抽出情報をAIが分析中...",
    "あなただけの旅程を作成中..."
  ];

  const loadingImages = [
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2673&auto=format&fit=crop", // Paris
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2694&auto=format&fit=crop", // Tokyo
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2670&auto=format&fit=crop", // Nature
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2621&auto=format&fit=crop"  // Travel
  ];

  useEffect(() => {
    if (status === "loading") {
      const messagesCount = loadingMessages.length;
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % messagesCount);
      }, 2000); // Slower updates to match real api time
      return () => clearInterval(interval);
    }
  }, [status, loadingMessages.length]);

  const handlePlan = async () => {
    if (!input.destination) return;
    setStatus("loading");
    setLoadingStep(0);
    setErrorMessage("");

    try {
        const response = await generatePlan(input);
        
        if (response.success && response.data) {
            setResult(response.data);
            setStatus("complete");
        } else {
            setErrorMessage(response.message || "Something went wrong.");
            setStatus("error");
        }
    } catch (e) {
        console.error(e);
        setErrorMessage("Network error or server timeout.");
        setStatus("error");
    }
  };

  const handleRegenerate = async (chatHistory: {role: string, text: string}[]) => {
      if (!result) return;
      setStatus("loading");
      setLoadingStep(3); // Start slightly later in the loading messages
      setErrorMessage("");

      try {
          const response = await regeneratePlan(result, chatHistory);
          if (response.success && response.data) {
              setResult(response.data);
              setStatus("complete");
          } else {
              setErrorMessage(response.message || "Failed to regenerate.");
              setStatus("error");
          }
      } catch (e) {
          console.error(e);
          setErrorMessage("Regeneration failed.");
          setStatus("error");
      }
  };

  const toggleTheme = (t: string) => {
    setInput(prev => {
      if (prev.theme.includes(t)) {
        return { ...prev, theme: prev.theme.filter(x => x !== t) };
      } else {
        return { ...prev, theme: [...prev.theme, t] };
      }
    });
  };

  if (status === "idle" || status === "error") {
    return (
      <div className="w-full max-w-2xl mt-8 group text-left animate-in fade-in duration-700">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
          
          {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-center">
                  {errorMessage}
              </div>
          )}

          {/* Destination */}
          <div className="space-y-3">
            <label className="text-sm font-mono uppercase tracking-widest text-muted-foreground">目的地</label>
            <input 
              type="text" 
              value={input.destination}
              onChange={(e) => setInput({...input, destination: e.target.value})}
              placeholder="例: パリ, 東京, 北海道..." 
              className="w-full bg-transparent border-b border-white/20 pb-2 text-3xl font-light text-white placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Dates */}
            <div className="space-y-3">
              <label className="text-sm font-mono uppercase tracking-widest text-muted-foreground">日程</label>
              <input 
                type="text" 
                value={input.dates}
                onChange={(e) => setInput({...input, dates: e.target.value})}
                placeholder="例: 10月15日から5日間" 
                className="w-full bg-transparent border-b border-white/20 pb-2 text-lg text-white placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-white transition-colors"
              />
            </div>

             {/* Companions */}
            <div className="space-y-3">
              <label className="text-sm font-mono uppercase tracking-widest text-muted-foreground">誰と？</label>
              <select 
                value={input.companions}
                onChange={(e) => setInput({...input, companions: e.target.value})}
                className="w-full bg-transparent border-b border-white/20 pb-2 text-lg text-white focus:outline-hidden focus:border-white transition-colors cursor-pointer appearance-none [&>option]:text-black"
              >
                <option value="solo">一人旅</option>
                <option value="couple">カップル・夫婦</option>
                <option value="family">家族</option>
                <option value="friends">友人</option>
              </select>
            </div>
          </div>

          {/* Theme */}
           <div className="space-y-4">
              <label className="text-sm font-mono uppercase tracking-widest text-muted-foreground">旅のテーマ (複数選択可)</label>
              <div className="flex flex-wrap gap-3">
                {["グルメ", "歴史・文化", "自然・絶景", "リラックス", "穴場スポット"].map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTheme(t)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      input.theme.includes(t) 
                        ? "bg-white text-black shadow-lg scale-105" 
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

          {/* Submit */}
          <div className="pt-4 flex justify-end">
            <button 
              onClick={handlePlan}
              disabled={!input.destination}
              className="px-12 py-4 rounded-full bg-white text-black font-semibold text-lg tracking-wide hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            >
              プランを作成する
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="relative w-full max-w-4xl h-[500px] rounded-3xl overflow-hidden mt-8 shadow-2xl border border-white/10" role="status" aria-label="loading">
        {/* Cinematic Background Rotation */}
        {loadingImages.map((img, i) => (
           <Image
             key={i}
             src={img}
             alt="Loading background"
             fill
             className={`object-cover transition-opacity duration-1000 ${i === loadingStep % loadingImages.length ? "opacity-50 scale-105" : "opacity-0 scale-100"}`}
           />
        ))}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent flex flex-col justify-center items-center p-10 text-center">
            <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-xs font-mono uppercase tracking-widest text-white/80">RAG AI Analysis Active</span>
                    </div>
                    <p className="text-4xl font-light text-white leading-tight animate-in slide-in-from-bottom-4 fade-in duration-500 key={loadingStep}">
                       {loadingMessages[loadingStep]}
                    </p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Editorial Result View
  return (
    <div className="w-full max-w-6xl mt-8 text-left animate-in fade-in duration-1000">
        
        {/* Hero Section */}
        <div className="relative h-[60vh] w-full rounded-3xl overflow-hidden mb-16 group shadow-2xl">
            <Image 
                src={result?.heroImage || loadingImages[0]} 
                alt={result?.destination || ""} 
                fill 
                className="object-cover transition-transform duration-[20s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute top-8 right-8 flex gap-2">
                 {input.theme.map(t => (
                     <span key={t} className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-xs text-white border border-white/20">{t}</span>
                 ))}
                 <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-xs text-white border border-white/20 capitalize">{input.companions} Trip</span>
            </div>

            <div className="absolute bottom-0 left-0 p-8 sm:p-16 w-full">
                <p className="text-sm font-mono text-white/80 uppercase tracking-widest mb-6 border-l-2 border-accent pl-4">Custom Itinerary for You</p>
                <h2 className="text-6xl sm:text-8xl font-serif text-white mb-8 tracking-tight">
                    {result?.destination}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                    <p className="max-w-2xl text-xl text-white/90 font-light leading-relaxed">
                        {result?.description}
                    </p>
                    <button 
                        onClick={() => { setStatus("idle"); setInput({ destination: "", dates: "", companions: "solo", theme: [] }); setResult(null); }}
                        className="px-8 py-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/30 text-white transition-all text-sm uppercase tracking-widest"
                    >
                        New Search
                    </button>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-24 px-4 sm:px-0">
            
            {/* Timeline */}
            <div className="space-y-20">
                {result?.days.map((day) => (
                    <div key={day.day} className="relative">
                        <div className="sticky top-8 z-10 bg-background/95 backdrop-blur-md py-4 mb-8 border-b border-white/10 flex items-baseline justify-between">
                            <h3 className="text-4xl font-serif text-white">Day {day.day}</h3>
                            <span className="text-lg text-muted-foreground italic">{day.title}</span>
                        </div>
                        
                        <div className="space-y-16 pl-4 border-l border-white/10 ml-2">
                            {day.activities.map((act, i) => (
                                <div key={i} className="relative pl-10 group">
                                    <span className="absolute -left-[5px] top-3 w-2.5 h-2.5 rounded-full bg-white/20 group-hover:bg-accent transition-colors duration-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]"></span>
                                    <span className="text-xs font-mono text-accent block mb-2 opacity-70">{act.time}</span>
                                    <h4 className="text-2xl font-medium text-white mb-3 group-hover:text-accent transition-colors">{act.activity}</h4>
                                    <p className="text-muted-foreground font-light leading-relaxed text-lg">{act.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Chat Interface Integration */}
                {result && <TravelPlannerChat itinerary={result} onRegenerate={handleRegenerate} />}
            </div>

            {/* References / Sidebar */}
            <div className="space-y-12">
                <div className="sticky top-8">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-8 text-center sm:text-left">From the Archives</h4>
                    <div className="space-y-6">
                        {result?.references && result.references.length > 0 ? result.references.map((ref, i) => (
                            <a href={ref.url} key={i} target="_blank" rel="noopener noreferrer" className="block group cursor-pointer bg-secondary/10 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:shadow-2xl">
                                <div className="relative h-40 w-full overflow-hidden">
                                    {ref.image ? (
                                        <Image src={ref.image} alt={ref.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">No Image</div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                </div>
                                <div className="p-5">
                                    <h5 className="text-white font-medium group-hover:underline decoration-1 underline-offset-4 text-lg mb-2">{ref.title}</h5>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{ref.snippet}</p>
                                </div>
                            </a>
                        )) : (
                            <p className="text-muted-foreground text-sm italic">No specific articles found, but plan generated based on general Tomokichi knowledge.</p>
                        )}
                    </div>
                    
                    <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-secondary/20 to-transparent border border-white/5">
                        <h4 className="text-sm font-bold text-white mb-3">Why this plan?</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Based on your interest in <span className="text-white font-medium">&quot;{input.theme.join(", ") || "travel"}&quot;</span>, we curated this itinerary focusing on deep cultural immersion rather than just sightseeing, searching through available Tomokichi Diary entries.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
}
