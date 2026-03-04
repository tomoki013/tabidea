import {
  FeaturesHeroSection,
  FeaturesDetailSection,
  HowToUseSection,
} from "@/components/features/landing";
import type { Metadata } from "next";
import { getRequestLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  return language === "ja"
    ? {
        title: "使い方",
        description: "Tabideaの機能や使い方について詳しく説明します。AIを活用した旅行プランの作成方法をステップごとに紹介。",
      }
    : {
        title: "How to Use",
        description: "Learn how to use Tabidea and build travel plans with AI step by step.",
      };
}

export default function UsagePage() {
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
