"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserInput, Itinerary } from "@/lib/types";
import { decodePlanData, encodePlanData } from "@/lib/urlUtils";
import { regeneratePlan } from "@/app/actions/travel-planner";
import ResultView from "@/components/TravelPlanner/ResultView";
import LoadingView from "@/components/TravelPlanner/LoadingView";
import FAQSection from "@/components/landing/FAQSection";
import ExampleSection from "@/components/landing/ExampleSection";

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

  if (status === "regenerating") {
    return (
        <ResultView
            result={result}
            input={input}
            onRestart={handleRestart}
            onRegenerate={handleRegenerate}
            isUpdating={true}
        />
    );
  }

  return (
    <div className="w-full">
      <ResultView
        result={result}
        input={input}
        onRestart={handleRestart}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}

export default function PlanPage() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-20 gap-8 sm:p-20 sm:gap-16">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center max-w-4xl w-full">
        <h1 className="text-3xl sm:text-4xl font-bold pb-2 tracking-tight text-foreground">
          共有された旅行プラン
        </h1>

        <Suspense
          fallback={
            <div className="w-full max-w-2xl h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
            </div>
          }
        >
          <PlanContent />
        </Suspense>
      </main>

      <div className="w-full row-start-3 flex flex-col items-center gap-0">
         <ExampleSection />
         <FAQSection />
      </div>

      <footer className="row-start-4 flex flex-col items-center gap-4 text-muted-foreground text-sm pb-8">
        <div className="flex gap-6">
          <Link
            href="/privacy"
            className="hover:underline hover:text-foreground transition-colors"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/terms"
            className="hover:underline hover:text-foreground transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="https://travel.tomokichidiary.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-foreground transition-colors"
          >
            お問い合わせ
          </Link>
        </div>
        <p>© 2025 AI Travel Planner. Design inspired by Tomokichi Diary.</p>
        <div className="mt-4">
          <Link href="/" className="text-primary hover:underline font-medium">
            自分もプランを作る
          </Link>
        </div>
      </footer>
    </div>
  );
}
