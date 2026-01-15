import { Suspense } from "react";
import TravelPlanner from "@/components/TravelPlanner";
import Header from "@/components/layout/Header";

import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import FeaturesHeroSection from "@/components/landing/FeaturesHeroSection";
import FeatureSection from "@/components/landing/FeatureSection";
import UsageGuideHero from "@/components/landing/UsageGuideHero";
import ExampleSection from "@/components/landing/ExampleSection";
import TravelInfoSection from "@/components/landing/TravelInfoSection";
import FAQSection from "@/components/landing/FAQSection";
import { getSamplePlanById } from "@/lib/sample-plans";
import { UserInput } from "@/lib/types";

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

      <main className="flex-1 w-full flex flex-col items-center">
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
            <TravelPlanner
              initialInput={initialInput}
              initialStep={initialInput ? 1 : undefined}
            />
          </Suspense>
        </HeroSection>

        {/* Other Sections */}
        <AboutSection />
        <FeaturesHeroSection />
        <UsageGuideHero />
        <FeatureSection />
        <ExampleSection />
        <TravelInfoSection />
        <FAQSection limit={5} />
      </main>
    </div>
  );
}
