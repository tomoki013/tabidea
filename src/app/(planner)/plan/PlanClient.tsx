"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserInput, Itinerary, DayPlan } from '@/types';
import { decodePlanData, encodePlanData, splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { regeneratePlan, fetchHeroImage, generatePlanOutline, generatePlanChunk } from "@/app/actions/travel-planner";
import { getSamplePlanById } from "@/lib/sample-plans";
import ResultView from "@/components/features/planner/ResultView";
import LoadingView from "@/components/features/planner/LoadingView";
import { PlanModal } from "@/components/common";
import { FAQSection, ExampleSection } from "@/components/features/landing";
import { FaPlus } from "react-icons/fa6";

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q");
  const sampleId = searchParams.get("sample");

  const [input, setInput] = useState<UserInput | null>(null);
  const [result, setResult] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "idle" | "regenerating" | "generating" | "error"
  >("loading");

  // State to persist chat history across regenerations
  const [chatHistoryToKeep, setChatHistoryToKeep] = useState<{ role: string; text: string }[]>([]);

  // State for request editing modal
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [initialEditStep, setInitialEditStep] = useState(0);

  // Track if this is the initial load to avoid scrolling on first render
  const isInitialLoad = useRef(true);
  const previousStatus = useRef<typeof status>("loading");
  const hasStartedGeneration = useRef(false);

  // Generate plan from sample
  const generateFromSample = useCallback(async (sampleInput: UserInput) => {
    setStatus("generating");
    setError("");

    try {
      // Step 1: Generate Master Outline
      const outlineResponse = await generatePlanOutline(sampleInput);

      if (!outlineResponse.success || !outlineResponse.data) {
        throw new Error(outlineResponse.message || "プラン概要の作成に失敗しました。");
      }

      const { outline, context, input: updatedInput, heroImage } = outlineResponse.data;

      // Step 2: Parallel Chunk Generation
      const totalDays = extractDuration(updatedInput.dates);
      const chunks = splitDaysIntoChunks(totalDays);

      const chunkPromises = chunks.map(chunk => {
        const chunkOutlineDays = outline.days.filter(d => d.day >= chunk.start && d.day <= chunk.end);
        return generatePlanChunk(updatedInput, context, chunkOutlineDays, chunk.start, chunk.end);
      });

      const chunkResults = await Promise.all(chunkPromises);

      const failedChunk = chunkResults.find(r => !r.success);
      if (failedChunk) {
        throw new Error(failedChunk.message || "詳細プランの生成に失敗しました。");
      }

      // Step 3: Merge Results
      const mergedDays: DayPlan[] = chunkResults.flatMap(r => r.data || []);
      mergedDays.sort((a, b) => a.day - b.day);

      // Construct Final Itinerary
      const simpleId = Math.random().toString(36).substring(2, 15);

      const finalPlan: Itinerary = {
        id: simpleId,
        destination: outline.destination,
        description: outline.description,
        heroImage: heroImage?.url || null,
        heroImagePhotographer: heroImage?.photographer || null,
        heroImagePhotographerUrl: heroImage?.photographerUrl || null,
        days: mergedDays,
        references: context.map(c => ({
          title: c.title,
          url: c.url,
          image: c.imageUrl,
          snippet: c.snippet
        }))
      };

      // Redirect to result URL
      const encoded = encodePlanData(updatedInput, finalPlan);
      router.replace(`/plan?q=${encoded}`);

    } catch (e: unknown) {
      console.error(e);
      setStatus("error");
      setError(e instanceof Error ? e.message : "ネットワークエラーまたはサーバータイムアウトが発生しました。");
    }
  }, [router]);

  useEffect(() => {
    // Wrap in setTimeout to avoid synchronous state update linter error
    const timer = setTimeout(async () => {
      // q parameter exists - display existing plan
      if (q) {
        const decoded = decodePlanData(q);
        if (decoded) {
          setInput(decoded.input);

          // Fetch hero image from server if not present
          if (!decoded.result.heroImage) {
            const heroImageData = await fetchHeroImage(decoded.result.destination);
            if (heroImageData) {
              decoded.result.heroImage = heroImageData.url;
              decoded.result.heroImagePhotographer = heroImageData.photographer;
              decoded.result.heroImagePhotographerUrl = heroImageData.photographerUrl;
            }
          }

          setResult(decoded.result);

          // Clear chat history if this wasn't a regeneration flow
          if (previousStatus.current !== "regenerating") {
            setChatHistoryToKeep([]);
          }

          setStatus("idle");
          // Close modal if URL changes (regeneration complete)
          setIsEditingRequest(false);

          // Scroll to page top after regeneration
          if (!isInitialLoad.current && previousStatus.current === "regenerating") {
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }, 100);
          }

          // Mark that initial load is complete
          if (isInitialLoad.current) {
            isInitialLoad.current = false;
          }
        } else {
          setError(
            "プランデータの読み込みに失敗しました。リンクが壊れている可能性があります。"
          );
          setStatus("error");
        }
      } else if (sampleId && !hasStartedGeneration.current) {
        // sample parameter exists - generate plan from sample
        hasStartedGeneration.current = true;
        const samplePlan = getSamplePlanById(sampleId);
        if (samplePlan) {
          // Prepare input with default values for missing fields
          const sampleInput: UserInput = {
            ...samplePlan.input,
            hasMustVisitPlaces: samplePlan.input.hasMustVisitPlaces ?? false,
            mustVisitPlaces: samplePlan.input.mustVisitPlaces ?? [],
          };
          generateFromSample(sampleInput);
        } else {
          setError("指定されたサンプルプランが見つかりませんでした。");
          setStatus("error");
        }
      } else if (!sampleId) {
        // No parameters
        setError("プランが見つかりませんでした。URLを確認してください。");
        setStatus("error");
      }

      // Update previous status for next render
      previousStatus.current = status;
    }, 0);
    return () => clearTimeout(timer);
  }, [q, sampleId, status, router, generateFromSample]);

  const handleRegenerate = async (
    chatHistory: { role: string; text: string }[],
    overridePlan?: Itinerary
  ) => {
    const planToUse = overridePlan || result;
    if (!planToUse || !input) return;

    // Save chat history to persist it after page reload/update
    setChatHistoryToKeep(chatHistory);
    setStatus("regenerating");

    try {
      const response = await regeneratePlan(planToUse, chatHistory);
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

  const handleResultChange = (newResult: Itinerary) => {
    if (!input) return;
    setResult(newResult);

    // Update URL to persist changes without page reload
    const encoded = encodePlanData(input, newResult);
    window.history.replaceState(null, "", `?q=${encoded}`);
  };

  const handleEditRequest = (stepIndex: number) => {
    setInitialEditStep(stepIndex);
    setIsEditingRequest(true);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (status === "generating") {
    return <LoadingView />;
  }

  if (status === "error" || !result || !input) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">
          {error || "エラーが発生しました"}
        </p>
        {sampleId && (
          <button
            onClick={() => {
              hasStartedGeneration.current = false;
              setStatus("loading");
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
          >
            もう一度試す
          </button>
        )}
        <Link
          href="/"
          className="px-4 py-2 text-stone-600 hover:text-primary transition-colors"
        >
          トップに戻る
        </Link>
        <p className="text-stone-600 text-sm mt-2">
          問題が解決しない場合は、
          <a
            href="/contact"
            className="text-primary hover:underline font-medium ml-1"
          >
            お問い合わせページ
          </a>
          からご連絡ください。
        </p>
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
        onResultChange={handleResultChange}
        isUpdating={status === "regenerating"}
        onEditRequest={handleEditRequest}
        initialChatHistory={chatHistoryToKeep}
      />

      {/* Request Editing Modal */}
      <PlanModal
        isOpen={isEditingRequest && !!input}
        onClose={() => setIsEditingRequest(false)}
        initialInput={input}
        initialStep={initialEditStep}
      />
    </>
  );
}

export default function PlanClient() {
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip">
        {/* Title Section - Matches the aesthetic of the app */}
        <div className="w-full pt-32 pb-8 text-center px-4 animate-in fade-in slide-in-from-top-4 duration-700">
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
          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-primary font-serif rounded-full hover:bg-primary/90 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <FaPlus className="mr-2 relative z-10" />
            <span className="relative z-10">新しいプランを作る</span>
          </button>
        </div>

        <ExampleSection />
        <FAQSection limit={5} />

        {/* New Plan Modal */}
        <PlanModal
          isOpen={isNewPlanModalOpen}
          onClose={() => setIsNewPlanModalOpen(false)}
          initialInput={null}
          initialStep={0}
        />
      </main>
    </div>
  );
}
