import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google"; // Import Japanese font
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "AIトラベルプランナー - あなただけの旅を計画",
  description: "高度なAIアルゴリズムを使用した、あなただけのAI旅行アシスタント。",
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
      </body>
    </html>
  );
}
