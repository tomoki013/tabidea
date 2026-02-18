import { Suspense } from "react";
import TravelPlannerSimplified from "@/components/features/planner/TravelPlannerSimplified";
import { Header } from "@/components/common";
import {
  HeroSection,
  FAQSection,
} from "@/components/features/landing";
import {
  ConceptSection,
  HowItWorksSection,
  FeaturesSection,
  CommunitySection,
} from "@/components/features/landing/v2";
import { getSamplePlanById } from "@/lib/sample-plans";
import { UserInput } from '@/types';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Tabidea - AI Travel Planner",
  },
  description:
    "AIが数秒であなただけの旅行プランを作成。目的地、予算、テーマを入力するだけ。モデルコース作成、旅のしおり作成、持ち物リストも自動生成。",
};

interface HomeProps {
  searchParams: Promise<{ sample?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { sample } = await searchParams;

  // Get sample plan input if sample ID is provided
  let initialInput: UserInput | null = null;
  if (sample) {
    const samplePlan = getSamplePlanById(sample);
    if (samplePlan) {
      // Set hasMustVisitPlaces to false if not defined (for wizard validation)
      initialInput = {
        ...samplePlan.input,
        hasMustVisitPlaces: samplePlan.input.hasMustVisitPlaces ?? false,
        mustVisitPlaces: samplePlan.input.mustVisitPlaces ?? [],
      };
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed Header that appears on scroll */}
      <Header forceShow={true} className="z-50" />

      <main className="flex-1 w-full flex flex-col items-center bg-[#fcfbf9]">
        {/* Hero Section containing the main app functionality */}
        <HeroSection>
          <Suspense
            fallback={
              <div className="w-full max-w-2xl h-[400px] bg-white rounded-3xl border-2 border-dashed border-gray-300 animate-pulse flex items-center justify-center mx-auto">
                <span className="font-hand text-gray-400 text-xl">
                  ページをめくっています...
                </span>
              </div>
            }
          >
            <TravelPlannerSimplified
              initialInput={initialInput}
            />
          </Suspense>
        </HeroSection>

        {/* New Organized Layout */}
        <ConceptSection />
        <HowItWorksSection />
        <FeaturesSection />
        <CommunitySection />

        {/* Standard FAQ */}
        <FAQSection limit={5} />
      </main>
    </div>
  );
}
