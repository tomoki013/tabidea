
"use client";

import { useState, useEffect, useRef } from "react";
import { UserInput } from "@/types";
import { MapPin, Calendar, Users, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUtensils, FaLandmark, FaMountain, FaCoffee, FaSearch, FaShoppingBag, FaPalette, FaRunning, FaHotTub, FaCamera, FaCompass, FaQuestion,
  FaPlane, FaTrain, FaBus, FaCar, FaShip
} from "react-icons/fa";

// Constants (Same as before)
const COMPANION_OPTIONS = [
  { id: "solo", label: "一人旅", icon: "👤", desc: "気ままに自由に" },
  { id: "couple", label: "カップル", icon: "💑", desc: "大切な人と" },
  { id: "family", label: "家族", icon: "👨‍👩‍👧‍👦", desc: "思い出作り" },
  { id: "friends", label: "友人", icon: "👯", desc: "ワイワイ楽しく" },
  { id: "male_trip", label: "男旅", icon: "🍻", desc: "アクティブに" },
  { id: "female_trip", label: "女旅", icon: "💅", desc: "おしゃれに" },
  { id: "backpacker", label: "バックパッカー", icon: "🎒", desc: "冒険の旅" },
  { id: "business", label: "ビジネス", icon: "💼", desc: "効率重視" },
  { id: "pet", label: "ペットと", icon: "🐕", desc: "一緒に楽しむ" },
];

const THEME_OPTIONS = [
  { label: "グルメ", icon: FaUtensils, id: "グルメ" },
  { label: "歴史・文化", icon: FaLandmark, id: "歴史・文化" },
  { label: "自然・絶景", icon: FaMountain, id: "自然・絶景" },
  { label: "リラックス", icon: FaCoffee, id: "リラックス" },
  { label: "穴場スポット", icon: FaSearch, id: "穴場スポット" },
  { label: "ショッピング", icon: FaShoppingBag, id: "ショッピング" },
  { label: "アート", icon: FaPalette, id: "アート" },
  { label: "体験・アクティビティ", icon: FaRunning, id: "体験・アクティビティ" },
  { label: "温泉・サウナ", icon: FaHotTub, id: "温泉・サウナ" },
  { label: "写真映え", icon: FaCamera, id: "写真映え" },
  { label: "冒険", icon: FaCompass, id: "冒険" },
  { label: "その他", icon: FaQuestion, id: "その他" },
];

const BUDGET_PRESETS = [
  { id: "saving", label: "なるべく安く", icon: "💸", desc: "お財布に優しく" },
  { id: "standard", label: "普通", icon: "💰", desc: "一般的な予算" },
  { id: "high", label: "少し贅沢に", icon: "✨", desc: "良いホテル・食事" },
  { id: "luxury", label: "リッチに", icon: "💎", desc: "最高級の体験" },
];

const PACE_OPTIONS = [
  { id: "relaxed", label: "ゆったり", icon: "☕", desc: "1日1〜2箇所" },
  { id: "balanced", label: "バランスよく", icon: "⚖️", desc: "1日3〜4箇所" },
  { id: "active", label: "アクティブ", icon: "👟", desc: "1日5箇所以上" },
  { id: "packed", label: "詰め込み", icon: "🔥", desc: "限界まで回る" },
];

interface SimplifiedInputFlowProps {
  input: UserInput;
  onChange: (update: Partial<UserInput>) => void;
  onGenerate: (inputOverride?: UserInput) => void;
  isGenerating?: boolean;
}

const parseDuration = (str: string): number => {
  if (str === "未定") return 0;
  if (str.includes("日帰り")) return 1;
  const nightsMatch = str.match(/(\d+)泊(\d+)日/);
  if (nightsMatch) return parseInt(nightsMatch[2]) || 3;
  const daysMatch = str.match(/(\d+)日間/);
  if (daysMatch) return parseInt(daysMatch[1]) || 3;
  return 3;
};

const formatDuration = (days: number): string => {
  if (days === 0) return "未定";
  if (days === 1) return "日帰り";
  return `${days - 1}泊${days}日`;
};

export default function SimplifiedInputFlow({
  input,
  onChange,
  onGenerate,
  isGenerating = false,
}: SimplifiedInputFlowProps) {
  const [step, setStep] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [destinationInput, setDestinationInput] = useState("");
  const [useCalendar, setUseCalendar] = useState(false);
  const duration = parseDuration(input.dates);

  // Sync date logic
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const match = input.dates?.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
        setStartDate(match[1]);
        if (duration > 0) {
           const d = new Date(match[1]);
           d.setDate(d.getDate() + (duration - 1));
           setEndDate(d.toISOString().split('T')[0]);
        }
        setUseCalendar(true);
    }
  }, [input.dates, duration]);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddDestination = () => {
    const trimmed = destinationInput.trim();
    if (trimmed && !input.destinations.includes(trimmed)) {
      onChange({
        destinations: [...input.destinations, trimmed],
        isDestinationDecided: true,
      });
      setDestinationInput("");
    }
  };

  const handleRemoveDestination = (index: number) => {
    const newDestinations = input.destinations.filter((_, i) => i !== index);
    onChange({
        destinations: newDestinations,
        isDestinationDecided: newDestinations.length > 0 ? true : undefined
    });
  };

  const handleDurationChange = (newDuration: number) => {
      onChange({ dates: formatDuration(newDuration) });
  };

  const handleDateRangeChange = (start: string, end: string) => {
      setStartDate(start);
      setEndDate(end);
      if (start && end) {
          const s = new Date(start);
          const e = new Date(end);
          const diffTime = e.getTime() - s.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
              const d = diffDays + 1;
              onChange({ dates: `${start}から${d-1}泊${d}日` });
          }
      }
  };

  // Validation
  const canProceedStep1 = input.destinations.length > 0 || input.isDestinationDecided === false;
  const canProceedStep2 = !!input.dates && input.dates !== "未定";
  const canProceedStep3 = !!input.companions;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <MapPin className="text-primary" /> 目的地は？
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => onChange({ isDestinationDecided: undefined, destinations: [] })}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  input.isDestinationDecided !== false
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <span className="text-4xl block mb-2">📍</span>
                <span className="text-lg font-bold block">決まっている</span>
                <span className="text-sm text-stone-500">行きたい場所を入力</span>
              </button>
              <button
                onClick={() => onChange({ isDestinationDecided: false, destinations: [] })}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  input.isDestinationDecided === false
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <span className="text-4xl block mb-2">🎲</span>
                <span className="text-lg font-bold block">おまかせ</span>
                <span className="text-sm text-stone-500">AIに提案してもらう</span>
              </button>
            </div>

            {input.isDestinationDecided === false ? (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-bold text-stone-600 mb-2 block">どんな旅にしたい？（任意）</label>
                <textarea
                  value={input.travelVibe || ""}
                  onChange={(e) => onChange({ travelVibe: e.target.value })}
                  className="w-full h-24 p-4 rounded-xl border-2 border-stone-200 focus:border-primary focus:outline-none resize-none"
                  placeholder="例：温泉でゆっくり、リゾート気分..."
                />
              </div>
            ) : (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-bold text-stone-600 mb-2 block">目的地を追加</label>
                <div className="flex gap-2">
                  <input
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddDestination()}
                    className="flex-1 h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-primary focus:outline-none text-lg"
                    placeholder="例：京都、ハワイ..."
                  />
                  <button
                    onClick={handleAddDestination}
                    disabled={!destinationInput.trim()}
                    className="h-14 w-14 rounded-xl bg-stone-800 text-white flex items-center justify-center disabled:opacity-50 hover:bg-stone-700 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {input.destinations.map((dest, i) => (
                    <span key={i} className="px-4 py-2 bg-white border-2 border-stone-200 rounded-full text-stone-800 font-bold flex items-center gap-2 shadow-sm">
                      {dest}
                      <button onClick={() => handleRemoveDestination(i)} className="text-stone-400 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <Calendar className="text-primary" /> 日程は？
            </h2>
            <div className="flex justify-center bg-stone-100 p-1 rounded-full w-fit mx-auto mb-4">
              <button
                onClick={() => setUseCalendar(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${!useCalendar ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}
              >
                日数
              </button>
              <button
                onClick={() => setUseCalendar(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${useCalendar ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}
              >
                カレンダー
              </button>
            </div>

            {!useCalendar ? (
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handleDurationChange(Math.max(1, duration - 1))}
                    className="w-14 h-14 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-500 hover:border-primary hover:text-primary bg-white text-2xl"
                  >
                    -
                  </button>
                  <span className="text-4xl font-extrabold text-stone-800 w-32 text-center">
                    {formatDuration(duration)}
                  </span>
                  <button
                    onClick={() => handleDurationChange(Math.min(30, duration + 1))}
                    className="w-14 h-14 rounded-full bg-stone-800 text-white flex items-center justify-center hover:bg-stone-700 text-2xl shadow-md"
                  >
                    +
                  </button>
                </div>
                <p className="text-stone-500 font-bold">
                  {duration === 1 ? "日帰りの弾丸旅行！" : `${duration - 1}泊の旅行`}
                </p>
              </div>
            ) : (
              <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-stone-500 mb-1 block">出発日</label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                         const newStart = e.target.value;
                         if (newStart && duration) {
                             const d = new Date(newStart);
                             d.setDate(d.getDate() + (duration - 1));
                             handleDateRangeChange(newStart, d.toISOString().split('T')[0]);
                         } else {
                             handleDateRangeChange(newStart, endDate);
                         }
                      }}
                      className="w-full h-12 px-2 rounded-xl border-2 border-stone-200 focus:border-primary focus:outline-none font-bold text-base"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-500 mb-1 block">帰着日</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                      className="w-full h-12 px-2 rounded-xl border-2 border-stone-200 focus:border-primary focus:outline-none font-bold text-base"
                    />
                  </div>
                </div>
                {startDate && endDate && (
                    <p className="text-center font-bold text-primary bg-primary/5 py-2 rounded-lg">
                        {startDate} 〜 {endDate} ({duration - 1}泊{duration}日)
                    </p>
                )}
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <Users className="text-primary" /> 誰と行きますか？
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COMPANION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onChange({ companions: opt.id })}
                  className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 ${
                    input.companions === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md"
                      : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <span className="block font-bold text-stone-800">{opt.label}</span>
                    <span className="block text-xs text-stone-500">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
              <Sparkles className="text-primary" /> 最後に詳細を設定
            </h2>

            {/* Theme */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-stone-600 block">旅のテーマ</label>
              <div className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map((t) => {
                   const Icon = t.icon;
                   const isSelected = input.theme.includes(t.id);
                   return (
                     <button
                        key={t.id}
                        onClick={() => {
                            if (isSelected) onChange({ theme: input.theme.filter(x => x !== t.id) });
                            else onChange({ theme: [...input.theme, t.id] });
                        }}
                        className={`px-3 py-2 rounded-full border-2 text-sm font-bold flex items-center gap-2 transition-all ${
                            isSelected ? "border-primary bg-primary text-white" : "border-stone-200 bg-white text-stone-600"
                        }`}
                     >
                        <Icon /> {t.label}
                     </button>
                   );
                })}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-3">
               <label className="text-sm font-bold text-stone-600 block">予算感</label>
               <div className="grid grid-cols-2 gap-3">
                  {BUDGET_PRESETS.map((b) => (
                      <button
                          key={b.id}
                          onClick={() => onChange({ budget: b.id })}
                          className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                              input.budget === b.id ? "border-primary bg-primary/5" : "border-stone-200 bg-white"
                          }`}
                      >
                          <span className="text-xl">{b.icon}</span>
                          <span className="font-bold text-sm">{b.label}</span>
                      </button>
                  ))}
               </div>
            </div>

            {/* Pace */}
            <div className="space-y-3">
               <label className="text-sm font-bold text-stone-600 block">ペース</label>
               <div className="grid grid-cols-2 gap-3">
                  {PACE_OPTIONS.map((p) => (
                      <button
                          key={p.id}
                          onClick={() => onChange({ pace: p.id })}
                          className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                              input.pace === p.id ? "border-primary bg-primary/5" : "border-stone-200 bg-white"
                          }`}
                      >
                          <span className="text-xl">{p.icon}</span>
                          <span className="font-bold text-sm">{p.label}</span>
                      </button>
                  ))}
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto px-4 py-8 scroll-mt-24">
      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-500 ${s <= step ? "bg-stone-800" : "bg-stone-200"}`} />
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-6 sm:p-8 min-h-[420px] flex flex-col justify-between relative overflow-hidden">
        {/* Decorative Blob */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative z-10 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-100 relative z-10">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-stone-500 hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> 戻る
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              次へ <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onGenerate?.(input)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-primary text-white hover:brightness-110 disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-95 transition-all w-full sm:w-auto justify-center"
            >
              {isGenerating ? "作成中..." : "プランを作成✨"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
