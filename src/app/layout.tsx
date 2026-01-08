import type { Metadata } from "next";
import { Noto_Sans_JP, Kaisei_Decol, Yomogi } from "next/font/google";
import Script from "next/script";
import Footer from "@/components/landing/Footer";
import CookieBanner from "@/components/ui/CookieBanner";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
});

const kaiseiDecol = Kaisei_Decol({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-kaisei-decol",
});

const yomogi = Yomogi({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-yomogi",
});

export const metadata: Metadata = {
  title: "Tabidea - Powered by ともきちの旅行日記",
  description: "AIと一緒に、あなただけの旅の計画を。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* Google Adsense */}
        <meta name="google-adsense-account" content="ca-pub-8687520805381056" />

        {/* 自動広告 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8687520805381056"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        ></Script>

        {/* Google tag (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-S35FPGY6NW"
        ></Script>
      </head>
      <body
        className={`${notoSansJP.variable} ${kaiseiDecol.variable} ${yomogi.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <CookieBanner />
        <Footer />
      </body>
    </html>
  );
}
