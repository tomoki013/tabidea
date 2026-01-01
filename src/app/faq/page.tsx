import React from "react";
import FAQSection from "@/components/landing/FAQSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "よくある質問 - AI Travel Planner",
  description: "AI Travel Plannerに関するよくある質問と回答を掲載しています。",
};

export default function FAQPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full flex flex-col items-center pt-16">
        <FAQSection />
      </main>
    </div>
  );
}
