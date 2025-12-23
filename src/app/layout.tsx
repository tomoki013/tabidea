import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import FloatingLink from "@/components/FloatingLink";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-travel-planner.netlify.app"),
  title: {
    template: "%s | AIトラベルプランナー",
    default: "AIトラベルプランナー Powered by ともきちの旅行日記",
  },
  description: "高度なAIアルゴリズムを使用した、あなただけのAI旅行アシスタント。最適な旅行プランを瞬時に作成します。",
  keywords: ["旅行", "AI", "プラン作成", "観光", "日程表", "自動生成", "トラベルプランナー"],
  openGraph: {
    title: "AIトラベルプランナー Powered by ともきちの旅行日記",
    description: "AIがあなたの好みに合わせて旅行プランを自動作成。面倒な計画作りから解放されましょう。",
    url: "https://ai-travel-planner.netlify.app",
    siteName: "AIトラベルプランナー",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIトラベルプランナー Powered by ともきちの旅行日記",
    description: "AIがあなたの好みに合わせて旅行プランを自動作成。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} antialiased font-[family-name:var(--font-noto-sans-jp)]`}
      >
        {children}
        <FloatingLink />
      </body>
    </html>
  );
}
