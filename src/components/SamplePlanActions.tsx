"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaWandMagicSparkles, FaPenToSquare } from "react-icons/fa6";
import { UserInput, Itinerary, DayPlan } from '@/types';
import { encodePlanData } from "@/lib/urlUtils";
import { generatePlanOutline, generatePlanChunk } from "@/app/actions/travel-planner";
import { splitDaysIntoChunks, extractDuration } from "@/lib/planUtils";
import PlanModal from "@/components/ui/PlanModal";
import LoadingView from "@/components/TravelPlanner/LoadingView";

interface SamplePlanActionsProps {
  sampleInput: UserInput;
}

export default function SamplePlanActions({ sampleInput }: SamplePlanActionsProps) {
  const router = useRouter();
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  const handleGenerate = async () => {
    setIsGenerating(true);
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
      router.push(`/plan?q=${encoded}`);

    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "ネットワークエラーまたはサーバータイムアウトが発生しました。");
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-50 bg-[#fcfbf9]">
        <LoadingView />
      </div>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-[#d35400] transition-all hover:scale-[1.02] shadow-md hover:shadow-lg"
          >
            <FaWandMagicSparkles className="text-lg group-hover:rotate-12 transition-transform" />
            <span>この条件でプランを生成する</span>
          </button>

          {/* Customize Button */}
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#e67e22] font-bold rounded-xl border-2 border-[#e67e22] hover:bg-[#e67e22]/5 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          >
            <FaPenToSquare className="text-lg group-hover:rotate-12 transition-transform" />
            <span>条件をカスタマイズする</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 underline hover:no-underline"
            >
              閉じる
            </button>
          </div>
        )}

        <p className="text-center text-stone-500 text-sm">
          「プランを生成する」をクリックすると、AIがこの条件を元に詳細な旅行プランを作成します。
          <br className="hidden md:block" />
          カスタマイズを選ぶと、条件を自由に変更してからプランを作成できます。
        </p>
      </section>

      {/* Customization Modal */}
      <PlanModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        initialInput={sampleInput}
        initialStep={1}
      />
    </>
  );
}
