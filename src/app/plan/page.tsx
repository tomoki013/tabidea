"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserInput, Itinerary } from "@/lib/types";
import { decodePlanData, encodePlanData } from "@/lib/urlUtils";
import { regeneratePlan } from "@/app/actions/travel-planner";
import ResultView from "@/components/TravelPlanner/ResultView";
import TravelPlanner from "@/components/TravelPlanner";
import FAQSection from "@/components/landing/FAQSection";
import ExampleSection from "@/components/landing/ExampleSection";
import { FaPlus, FaXmark } from "react-icons/fa6";

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q");

  const [input, setInput] = useState<UserInput | null>(null);
  const [result, setResult] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "idle" | "regenerating" | "error"
  >("loading");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingStep, setEditingStep] = useState(0);

  useEffect(() => {
    // Wrap in setTimeout to avoid synchronous state update linter error
    const timer = setTimeout(() => {
        if (!q) {
        setError("プランが見つかりませんでした。URLを確認してください。");
        setStatus("error");
        return;
        }

        const decoded = decodePlanData(q);
        if (decoded) {
        setInput(decoded.input);
        setResult(decoded.result);
        setStatus("idle");
        // Ensure editing mode is closed when new data arrives
        setIsEditing(false);
        } else {
        setError(
            "プランデータの読み込みに失敗しました。リンクが壊れている可能性があります。"
        );
        setStatus("error");
        }
    }, 0);
    return () => clearTimeout(timer);
  }, [q]);

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[]
  ) => {
    if (!result || !input) return;
    setStatus("regenerating");
    try {
      const response = await regeneratePlan(result, chatHistory);
      if (response.success && response.data) {
        const encoded = encodePlanData(input, response.data);
        router.push(`/plan?q=${encoded}`);
        // No manual state update needed; URL change triggers useEffect
      } else {
        console.error(response.message);
        setStatus("idle");
      }
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const handleRestart = () => {
    router.push("/");
  };

  const handleEditInput = (stepIndex: number) => {
    setEditingStep(stepIndex);
    setIsEditing(true);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (status === "error" || !result || !input) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <p className="text-destructive font-medium">
          {error || "エラーが発生しました"}
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          トップに戻る
        </Link>
      </div>
    );
  }

  return (
    <>
      <ResultView
        result={result}
        input={input}
        onRestart={handleRestart}
        onRegenerate={handleRegenerate}
        isUpdating={status === "regenerating"}
        onEditInput={handleEditInput}
      />

      {/* Edit Modal Overlay */}
      {isEditing && input && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
             <button
                onClick={() => setIsEditing(false)}
                className="absolute top-4 right-4 p-2 text-stone-500 hover:text-stone-800 transition-colors"
                aria-label="Close"
             >
                <FaXmark size={32} />
             </button>

             <div className="w-full max-w-5xl">
                <TravelPlanner
                   initialInput={input}
                   initialStep={editingStep}
                   onComplete={() => setIsEditing(false)}
                />
             </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PlanPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      <main className="flex-1 w-full flex flex-col items-center">

        {/* Title Section - Matches the aesthetic of the app */}
        <div className="w-full pt-16 pb-8 text-center px-4 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="inline-block mb-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">
              Result
           </div>
           <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 tracking-tight">
             旅行プラン結果
           </h1>
           <p className="text-stone-500 mt-3 font-hand text-lg">
             あなただけの特別な旅のしおりが完成しました
           </p>
        </div>

        <Suspense
          fallback={
            <div className="w-full max-w-2xl h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            </div>
          }
        >
          <PlanContent />
        </Suspense>

        {/* Call to Action - Create New Plan */}
        {/* This button allows users to start a fresh planning session easily */}
        <div className="w-full flex justify-center pb-16 pt-8">
            <Link
                href="/"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-primary font-serif rounded-full hover:bg-primary/90 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <FaPlus className="mr-2 relative z-10" />
                <span className="relative z-10">新しいプランを作る</span>
            </Link>
        </div>

        <ExampleSection />
        <FAQSection limit={5} />
      </main>
    </div>
  );
}
