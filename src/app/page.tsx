import { Suspense } from "react";
import TravelPlanner from "@/components/TravelPlanner";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesHeroSection from "@/components/landing/FeaturesHeroSection";
import FeatureSection from "@/components/landing/FeatureSection";
import UsageGuideHero from "@/components/landing/UsageGuideHero";
import ExampleSection from "@/components/landing/ExampleSection";
import FAQSection from "@/components/landing/FAQSection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
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
            <TravelPlanner />
          </Suspense>
        </HeroSection>

        {/* Other Sections */}
        <FeaturesHeroSection />
        <UsageGuideHero />
        <FeatureSection />
        <ExampleSection />
        <FAQSection limit={5} />

      </main>
    </div>
  );
}
