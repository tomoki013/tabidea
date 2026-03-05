import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AboutContent from "@/components/about/AboutContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.about.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function AboutPage() {
  return <AboutContent />;
}
