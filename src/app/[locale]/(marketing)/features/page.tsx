import {
  FeaturesHeroSection,
  FeaturesDetailSection,
  HowToUseSection,
} from "@/components/features/landing";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.features.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

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
