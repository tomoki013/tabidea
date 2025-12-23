"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Itinerary, UserInput } from "@/lib/types";
import { generatePlan, regeneratePlan } from "@/app/actions/travel-planner";
import TravelPlannerChat from "./TravelPlannerChat";
import ShareButtons from "./ShareButtons";
import { decodePlanData } from "@/lib/urlUtils";
import { useSearchParams } from "next/navigation";

type PlanStatus = "idle" | "loading" | "complete" | "error";

export default function TravelPlanner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<UserInput>({
    destination: "",
    dates: "",
    companions: "solo",
    theme: [],
    freeText: "",
  });

  // Separate state for date handling
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("3");

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
    "あなただけの旅程を作成中...",
  ];

  const loadingImages = [
    "/images/eiffel-tower-and-sunset.jpg", // Paris
    "/images/kiyomizu-temple-autumn-leaves-lightup.jpg", // Kyoto
    "/images/balloons-in-cappadocia.jpg", // Nature
    "/images/tajmahal.jpg", // Travel
  ];

  // Step Background Images
  const stepImages = [
    "/images/eiffel-tower-and-sunset.jpg", // 0: Destination
    "/images/kiyomizu-temple-autumn-leaves-lightup.jpg", // 1: Dates
    "/images/balloons-in-cappadocia.jpg", // 2: Companions
    "/images/tajmahal.jpg", // 3: Themes
    "/images/eiffel-tower-and-sunset.jpg", // 4: Budget
    "/images/kiyomizu-temple-autumn-leaves-lightup.jpg", // 5: Pace
    "/images/balloons-in-cappadocia.jpg", // 6: FreeText
  ];

  // Sync date inputs to the main input string
  const handleDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    const newDates =
      newStartDate && duration
        ? `${newStartDate}から${duration}日間`
        : duration
        ? `${duration}日間`
        : "";
    setInput((prev) => ({ ...prev, dates: newDates }));
  };

  const handleDurationChange = (newDuration: string) => {
    setDuration(newDuration);
    const newDates =
      startDate && newDuration
        ? `${startDate}から${newDuration}日間`
        : newDuration
        ? `${newDuration}日間`
        : "";
    setInput((prev) => ({ ...prev, dates: newDates }));
  };

  useEffect(() => {
    if (status === "loading") {
      const messagesCount = loadingMessages.length;
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % messagesCount);
      }, 2000); // Slower updates to match real api time
      return () => clearInterval(interval);
    }
  }, [status, loadingMessages.length]);

  // Restore state from URL if present
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && status === "idle") {
      const decoded = decodePlanData(q);
      if (decoded) {
        setInput(decoded.input);
        setResult(decoded.result);
        setStatus("complete");
        // Update date states if they exist in the input
        // This is a rough estimation, as we store the combined string
        // but for editing purposes it might be enough to just show the plan.
        // If we wanted to go back to editing, we might need to parse the dates string.
      }
    }
  }, [searchParams]);

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

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[]
  ) => {
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
    setInput((prev) => {
      if (prev.theme.includes(t)) {
        return { ...prev, theme: prev.theme.filter((x) => x !== t) };
      } else {
        return { ...prev, theme: [...prev.theme, t] };
      }
    });
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 6));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  if (status === "idle" || status === "error") {
    return (
      <div className="w-full max-w-2xl mt-8 animate-in fade-in duration-700">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-10 shadow-2xl min-h-[500px] flex flex-col justify-between relative overflow-hidden group">
          {/* Background Image Layer */}
          {stepImages.map((img, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out z-[-1] ${
                step === i ? "opacity-40" : "opacity-0"
              }`}
            >
              <Image
                src={img}
                alt="Background"
                fill
                className="object-cover"
                priority={i === 0}
              />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          ))}

          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
            <div
              className="h-full bg-linear-to-r from-orange-400 via-pink-500 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / 7) * 100}%` }}
            />
          </div>

          <div className="space-y-6 pt-4">
            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-center">
                {errorMessage}
              </div>
            )}

            {/* Step 0: Destination */}
            {step === 0 && (
              <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 1/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">
                    どこへ行きますか？
                  </h2>
                </div>
                <input
                  type="text"
                  value={input.destination}
                  onChange={(e) =>
                    setInput({ ...input, destination: e.target.value })
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && input.destination && nextStep()
                  }
                  placeholder="例: パリ, 京都, 北海道..."
                  autoFocus
                  className="w-full bg-transparent border-b-2 border-white/20 pb-4 text-2xl sm:text-4xl font-light text-white placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-white transition-colors"
                />
              </div>
            )}

            {/* Step 1: Dates */}
            {step === 1 && (
              <div className="space-y-8 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 2/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">
                    いつ、どれくらい？
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:gap-8">
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400">
                      出発日 (任意)
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-hidden focus:border-white/50 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400">
                      旅行日数: {duration}日間
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="14"
                      value={duration}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <div className="flex justify-between text-xs text-gray-500 font-mono">
                      <span>1日</span>
                      <span>1週間</span>
                      <span>2週間</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Companions */}
            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 3/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">
                    誰との旅ですか？
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "solo", label: "一人旅", icon: "👤" },
                    { id: "couple", label: "カップル・夫婦", icon: "💑" },
                    { id: "family", label: "家族", icon: "👨‍👩‍👧‍👦" },
                    { id: "friends", label: "友人", icon: "👯" },
                    { id: "business", label: "同僚・ビジネス", icon: "💼" },
                    { id: "pet", label: "ペットと", icon: "🐕" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setInput({ ...input, companions: c.id })}
                      className={`p-3 sm:p-4 rounded-2xl border transition-all text-left group ${
                        input.companions === c.id
                          ? "bg-white text-black border-white shadow-lg scale-[1.02]"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{c.icon}</span>
                      <span className="text-sm font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Themes */}
            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 4/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">
                    どんな旅にしたい？
                  </h2>
                  <p className="text-sm text-gray-400">複数選択可能です</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    "グルメ",
                    "歴史・文化",
                    "自然・絶景",
                    "リラックス",
                    "穴場スポット",
                    "ショッピング",
                    "アート",
                    "体験・アクティビティ",
                  ].map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTheme(t)}
                      className={`px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base transition-all ${
                        input.theme.includes(t)
                          ? "bg-white text-black shadow-lg scale-105"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Budget (NEW) */}
            {step === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 5/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">予算感は？</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      id: "saving",
                      label: "なるべく安く",
                      icon: "💸",
                      desc: "コスパ重視",
                    },
                    {
                      id: "low",
                      label: "少し抑えめに",
                      icon: "📉",
                      desc: "メリハリをつけて",
                    },
                    {
                      id: "standard",
                      label: "普通",
                      icon: "💰",
                      desc: "一般的・平均的",
                    },
                    {
                      id: "high",
                      label: "少し贅沢に",
                      icon: "✨",
                      desc: "良いホテル・食事",
                    },
                    {
                      id: "luxury",
                      label: "リッチに",
                      icon: "💎",
                      desc: "最高級の体験を",
                    },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setInput({ ...input, budget: b.id })}
                      className={`p-4 rounded-2xl border transition-all text-left group flex items-center gap-4 ${
                        input.budget === b.id
                          ? "bg-white text-black border-white shadow-lg scale-[1.02]"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="text-3xl">{b.icon}</span>
                      <div>
                        <span className="text-base font-bold block">
                          {b.label}
                        </span>
                        <span
                          className={`text-xs ${
                            input.budget === b.id
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {b.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Pace (NEW) */}
            {step === 5 && (
              <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 6/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">
                    旅行のペースは？
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      id: "relaxed",
                      label: "ゆったり",
                      icon: "☕",
                      desc: "1日1-2箇所",
                    },
                    {
                      id: "balanced",
                      label: "バランスよく",
                      icon: "⚖️",
                      desc: "程よく観光",
                    },
                    {
                      id: "active",
                      label: "アクティブ",
                      icon: "👟",
                      desc: "主要スポットを網羅",
                    },
                    {
                      id: "packed",
                      label: "詰め込み",
                      icon: "🔥",
                      desc: "朝から晩まで",
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setInput({ ...input, pace: p.id })}
                      className={`p-4 rounded-2xl border transition-all text-left group flex items-center gap-4 ${
                        input.pace === p.id
                          ? "bg-white text-black border-white shadow-lg scale-[1.02]"
                          : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="text-3xl">{p.icon}</span>
                      <div>
                        <span className="text-base font-bold block">
                          {p.label}
                        </span>
                        <span
                          className={`text-xs ${
                            input.pace === p.id
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {p.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Free Text (Formerly Step 4) */}
            {step === 6 && (
              <div className="space-y-6 animate-in slide-in-from-right fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Step 7/7
                  </label>
                  <h2 className="text-3xl font-bold text-white">
                    その他ご要望は？
                  </h2>
                  <p className="text-sm text-gray-400">任意入力です</p>
                </div>
                <textarea
                  value={input.freeText}
                  onChange={(e) =>
                    setInput({ ...input, freeText: e.target.value })
                  }
                  placeholder="例: 静かな場所が好き、美術館を多めに巡りたい..."
                  className="w-full h-40 bg-white/5 border border-white/20 rounded-2xl p-4 text-white placeholder:text-gray-500 focus:outline-hidden focus:border-white transition-colors resize-none text-lg"
                />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 border-t border-white/10 mt-6">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className={`text-sm font-mono uppercase tracking-widest transition-colors ${
                step === 0
                  ? "opacity-0 cursor-default"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ← Back
            </button>

            {step < 6 ? (
              <button
                onClick={nextStep}
                disabled={step === 0 && !input.destination}
                className="px-8 py-3 rounded-full bg-white text-black font-semibold shadow-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handlePlan}
                className="px-10 py-3 rounded-full bg-linear-to-r from-orange-400 via-pink-500 to-purple-600 text-white font-bold shadow-lg hover:scale-105 transition-all"
              >
                Create Plan ✨
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div
        className="relative w-full max-w-4xl h-[500px] rounded-3xl overflow-hidden mt-8 shadow-2xl border border-white/10"
        role="status"
        aria-label="loading"
      >
        {/* Cinematic Background Rotation */}
        {loadingImages.map((img, i) => (
          <Image
            key={i}
            src={img}
            alt="Loading background"
            fill
            className={`object-cover transition-opacity duration-1000 ${
              i === loadingStep % loadingImages.length
                ? "opacity-50 scale-105"
                : "opacity-0 scale-100"
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent flex flex-col justify-center items-center p-10 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-mono uppercase tracking-widest text-white/80">
                  RAG AI Analysis Active
                </span>
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
      {/* Floating Header for Actions */}
      <div className="fixed top-24 right-8 z-50 animate-in slide-in-from-top-10 fade-in duration-700 delay-500">
        <button
          onClick={() => {
            setStatus("idle");
            setStep(0);
            setInput({
              destination: "",
              dates: "",
              companions: "solo",
              theme: [],
              freeText: "",
            });
            setResult(null);
          }}
          className="px-6 py-3 rounded-full bg-black/80 backdrop-blur-md hover:bg-black/90 border border-white/20 text-white transition-all text-sm font-medium shadow-2xl hover:scale-105 flex items-center gap-2 group"
        >
          <span className="group-hover:rotate-180 transition-transform duration-500">
            ↺
          </span>
          Start New Plan
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative h-[50vh] sm:h-[65vh] w-full rounded-2xl sm:rounded-[2.5rem] overflow-hidden mb-10 sm:mb-20 group shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        <Image
          src={result?.heroImage || loadingImages[0]}
          alt={result?.destination || ""}
          fill
          className="object-cover transition-transform duration-[20s] group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/90" />

        {/* --- UI FIX: Moved tags to top-left on mobile to avoid overlapping with fixed "Start New Plan" button --- */}
        <div className="absolute top-4 left-4 sm:top-10 sm:right-10 sm:left-auto flex gap-2 sm:gap-3 flex-wrap justify-start sm:justify-end max-w-[90%] sm:max-w-[50%]">
          {input.theme.map((t, i) => {
            // Assign different colors based on index or just rotate through a few
            const colors = [
              "bg-pink-500/20 border-pink-500/30",
              "bg-purple-500/20 border-purple-500/30",
              "bg-blue-500/20 border-blue-500/30",
              "bg-green-500/20 border-green-500/30",
            ];
            const colorClass = colors[i % colors.length];

            return (
              <span
                key={t}
                className={`px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-medium text-white border tracking-wider uppercase ${colorClass}`}
              >
                {t}
              </span>
            );
          })}
          <span className="px-4 py-1.5 rounded-full bg-orange-500/20 backdrop-blur-md text-xs font-medium text-white border border-orange-500/30 tracking-wider uppercase">
            {input.companions} Trip
          </span>
          {/* Display Budget/Pace if available */}
          {input.budget && (
            <span className="px-4 py-1.5 rounded-full bg-yellow-500/20 backdrop-blur-md text-xs font-medium text-white border border-yellow-500/30 tracking-wider uppercase">
              {input.budget === "saving"
                ? "Budget"
                : input.budget === "luxury"
                ? "Luxury"
                : "Standard"}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 p-6 sm:p-20 w-full max-w-5xl">
          <p className="text-xs sm:text-sm font-mono text-accent uppercase tracking-[0.2em] mb-2 sm:mb-4 pl-1">
            Your Personalized Journey
          </p>
          <h2 className="text-4xl sm:text-7xl lg:text-9xl font-serif text-white mb-4 sm:mb-8 tracking-tighter drop-shadow-2xl">
            {result?.destination}
          </h2>
          <p className="text-sm sm:text-xl lg:text-2xl text-white/90 font-light leading-relaxed max-w-3xl drop-shadow-lg">
            {result?.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16 px-4 sm:px-0 relative">
        {/* Timeline */}
        <div className="space-y-24">
          {result?.days.map((day) => (
            <div key={day.day} className="relative">
              {/* Day Header */}
              <div className="sticky top-4 z-30 flex items-center gap-6 mb-12">
                <div className="bg-background/90 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 shadow-xl flex items-baseline gap-4">
                  <h3 className="text-3xl sm:text-5xl font-serif text-transparent bg-clip-text bg-linear-to-br from-white to-white/50">
                    {day.day}
                  </h3>
                  <span className="text-sm font-light text-muted-foreground uppercase tracking-widest">
                    Day
                  </span>
                </div>
                <div className="h-px bg-linear-to-r from-white/20 to-transparent flex-1"></div>
                <span className="text-xl text-accent font-serif italic pr-4 max-w-[50%] text-right">
                  &quot;{day.title}&quot;
                </span>
              </div>

              <div className="space-y-12 pl-8 sm:pl-12 border-l-2 border-white/5 ml-4 sm:ml-8 relative pb-12">
                {/* Timeline dot at top */}
                <span className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-white/20"></span>

                {day.activities.map((act, i) => (
                  <div key={i} className="relative pl-12 group">
                    {/* Connector Line Logic */}
                    <div className="absolute left-[-33px] top-4 w-8 h-px bg-white/20 group-hover:w-12 group-hover:bg-accent transition-all duration-500"></div>
                    <span className="absolute -left-[37px] top-3 w-2.5 h-2.5 rounded-full bg-black border-2 border-white/20 group-hover:border-accent group-hover:scale-125 transition-all duration-500 z-10"></span>

                    <div className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 shadow-lg group-hover:shadow-2xl hover:-translate-y-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 rounded-md bg-white/10 text-xs font-mono text-accent">
                          {act.time}
                        </div>
                      </div>
                      <h4 className="text-2xl font-medium text-white mb-3 group-hover:text-accent transition-colors">
                        {act.activity}
                      </h4>
                      <p className="text-muted-foreground font-light leading-relaxed text-lg">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Chat Interface Integration */}
          {result && (
            <div className="bg-black/20 rounded-3xl p-8 border border-white/5">
              <TravelPlannerChat
                itinerary={result}
                onRegenerate={handleRegenerate}
              />
            </div>
          )}
        </div>

        {/* References / Sidebar */}
        <div className="space-y-12">
          <div className="sticky top-8 space-y-8">
            <h4 className="text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground mb-8 text-center sm:text-left border-b border-white/10 pb-4">
              From the Archives
            </h4>
            <div className="space-y-6">
              {result?.references && result.references.length > 0 ? (
                result.references.map((ref, i) => (
                  <a
                    href={ref.url}
                    key={i}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group cursor-pointer bg-black/40 rounded-2xl overflow-hidden border border-white/10 hover:border-accent/50 transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      {ref.image ? (
                        <Image
                          src={ref.image}
                          alt={ref.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-600 font-mono text-xs uppercase tracking-widest">
                          No Image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-80" />

                      <div className="absolute bottom-4 left-4 right-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <h5 className="text-white font-medium text-lg leading-tight group-hover:text-accent transition-colors line-clamp-2 shadow-black drop-shadow-md">
                          {ref.title}
                        </h5>
                      </div>
                    </div>
                    {ref.snippet && (
                      <div className="p-5">
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {ref.snippet}
                        </p>
                      </div>
                    )}
                  </a>
                ))
              ) : (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-muted-foreground text-sm italic">
                    AIが一般的な知識に基づいてプランを作成しました。
                    <br />
                    (特定の記事は参照されていません)
                  </p>
                </div>
              )}
            </div>

            <div className="mt-12 p-8 rounded-2xl bg-linear-to-br from-purple-900/20 via-black/40 to-black/40 border border-white/10 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-[50px] pointer-events-none"></div>
              <h4 className="text-sm font-bold text-white mb-3 relative z-10 flex items-center gap-2">
                <span className="text-accent">✦</span> Why this plan?
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                Based on your interest in{" "}
                <span className="text-white font-medium border-b border-accent/30 pb-0.5">
                  &quot;{input.theme.join(", ") || "travel"}&quot;
                </span>
                . We curated this itinerary focusing on deep cultural immersion,
                searching through available Tomokichi Diary archives.
              </p>
            </div>

            {/* Share Buttons */}
            {result && (
              <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
                <ShareButtons input={input} result={result} />
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-8 text-xs text-gray-500 space-y-2 border-t border-white/10 pt-6">
              <p>
                <strong>免責事項:</strong>{" "}
                本プランはAIによって生成されたものであり、実際の営業時間や料金、アクセス情報と異なる場合があります。
                ご旅行の際は、必ず各公式サイト等で最新情報をご確認ください。
              </p>
              <p>
                <a
                  href="/terms"
                  target="_blank"
                  className="underline hover:text-gray-400"
                >
                  利用規約
                </a>{" "}
                |{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  className="underline hover:text-gray-400"
                >
                  プライバシーポリシー
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
