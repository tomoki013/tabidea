import type { Metadata } from "next";
import AboutContent from "@/components/about/AboutContent";

export const metadata: Metadata = {
  title: "Tabideaについて - ブランドストーリー",
  description:
    "Tabidea（タビデア）は、心の奥にある『行きたい』を、一生モノの体験へ変えるトラベルパートナーです。",
};

export default function AboutPage() {
  return <AboutContent />;
}
