import type { Metadata } from "next";
import AboutContent from "@/components/about/AboutContent";
import { getRequestLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();

  return language === "ja"
    ? {
        title: "Tabideaについて - ブランドストーリー",
        description:
          "Tabidea（タビデア）は、心の奥にある『行きたい』を、一生モノの体験へ変えるトラベルパートナーです。",
      }
    : {
        title: "About Tabidea - Brand Story",
        description:
          "Tabidea is your travel partner that turns your inner \"I want to go\" into unforgettable experiences.",
      };
}

export default function AboutPage() {
  return <AboutContent />;
}
