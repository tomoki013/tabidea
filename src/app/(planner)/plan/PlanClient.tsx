"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserInput, Itinerary, DayPlan } from '@/types';
import { splitDaysIntoChunks, extractDuration } from "@/lib/utils";
import { generatePlanOutline, generatePlanChunk, savePlan } from "@/app/actions/travel-planner";
import { getSamplePlanById } from "@/lib/sample-plans";
import { saveLocalPlan } from "@/lib/local-storage/plans";
import { useAuth } from "@/context/AuthContext";
import LoadingView from "@/components/features/planner/LoadingView";
import { PlanModal } from "@/components/common";
import { FAQSection, ExampleSection } from "@/components/features/landing";
import { FaPlus } from "react-icons/fa6";

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const sampleId = searchParams.get("sample");
  const legacyQ = searchParams.get("q");

  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<
    "loading" | "generating" | "saving" | "error"
  >("loading");

  const hasStartedGeneration = useRef(false);

  // Generate plan from sample and save to DB/local storage
  const generateFromSample = useCallback(async (sampleInput: UserInput, isAuth: boolean) => {
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
      let totalDays = extractDuration(updatedInput.dates);

      // If duration is 0 (undecided), fallback to the AI-generated outline duration
      if (totalDays === 0 && outline.days.length > 0) {
        totalDays = outline.days.length;
      }

      const chunks = splitDaysIntoChunks(totalDays);

      const chunkPromises = chunks.map(chunk => {
        const chunkOutlineDays = outline.days.filter(d => d.day >= chunk.start && d.day <= chunk.end);

        // Determine start location from previous day's overnight location in outline
        let previousOvernightLocation: string | undefined = undefined;
        if (chunk.start > 1) {
          const prevDay = outline.days.find(d => d.day === chunk.start - 1);
          if (prevDay) {
            previousOvernightLocation = prevDay.overnight_location;
          }
        }

        return generatePlanChunk(updatedInput, context, chunkOutlineDays, chunk.start, chunk.end, previousOvernightLocation);
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
        heroImage: heroImage?.url || undefined,
        heroImagePhotographer: heroImage?.photographer || undefined,
        heroImagePhotographerUrl: heroImage?.photographerUrl || undefined,
        days: mergedDays,
        references: context.map(c => ({
          title: c.title,
          url: c.url,
          image: c.imageUrl,
          snippet: c.snippet
        }))
      };

      // Step 4: Save and Redirect
      setStatus("saving");

      if (isAuth) {
        // Save to database for authenticated users
        const saveResult = await savePlan(updatedInput, finalPlan, false);
        if (saveResult.success && saveResult.shareCode) {
          router.replace(`/plan/${saveResult.shareCode}`);
        } else {
          // Fallback to local storage if DB save fails
          console.error("Failed to save to DB, falling back to local storage:", saveResult.error);
          const localPlan = saveLocalPlan(updatedInput, finalPlan);
          router.replace(`/plan/local/${localPlan.id}`);
        }
      } else {
        // Save to local storage for unauthenticated users
        const localPlan = saveLocalPlan(updatedInput, finalPlan);
        router.replace(`/plan/local/${localPlan.id}`);
      }

    } catch (e: unknown) {
      console.error(e);
      setStatus("error");
      setError(e instanceof Error ? e.message : "ネットワークエラーまたはサーバータイムアウトが発生しました。");
    }
  }, [router]);

  useEffect(() => {
    // Wait for auth state to be determined
    if (authLoading) return;

    // Handle legacy q parameter - redirect to home with a message
    if (legacyQ && !sampleId) {
      // Old format URL - redirect to home
      router.replace("/");
      return;
    }

    // Handle sample generation
    if (sampleId && !hasStartedGeneration.current) {
      hasStartedGeneration.current = true;
      const samplePlan = getSamplePlanById(sampleId);
      if (samplePlan) {
        // Prepare input with default values for missing fields
        const sampleInput: UserInput = {
          ...samplePlan.input,
          hasMustVisitPlaces: samplePlan.input.hasMustVisitPlaces ?? false,
          mustVisitPlaces: samplePlan.input.mustVisitPlaces ?? [],
        };
        generateFromSample(sampleInput, isAuthenticated);
      } else {
        setError("指定されたサンプルプランが見つかりませんでした。");
        setStatus("error");
      }
    } else if (!sampleId && !legacyQ) {
      // No parameters - redirect to home
      router.replace("/");
    }
  }, [authLoading, sampleId, legacyQ, isAuthenticated, router, generateFromSample]);

  if (status === "loading" || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (status === "generating") {
    return <LoadingView />;
  }

  if (status === "saving") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p className="text-stone-600">プランを保存しています...</p>
      </div>
    );
  }

  if (status === "error") {
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

  // Default: should not reach here, redirect to home
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    </div>
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
            Generating
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 tracking-tight">
            旅行プラン作成中
          </h1>
          <p className="text-stone-500 mt-3 font-hand text-lg">
            あなただけの特別な旅のしおりを作成しています
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
