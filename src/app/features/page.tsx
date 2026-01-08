import FeaturesHeroSection from "@/components/landing/FeaturesHeroSection";
import FeaturesDetailSection from "@/components/landing/FeaturesDetailSection";
import HowToUseSection from "@/components/landing/HowToUseSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "機能紹介・使い方 - Tabidea",
  description: "Tabideaの機能や使い方について詳しく説明します。AIを活用した旅行プランの作成方法をステップごとに紹介。",
};

export default function FeaturesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full flex flex-col items-center">
        <FeaturesHeroSection />
        <FeaturesDetailSection />
        <HowToUseSection />
      </main>
    </div>
  );
}
