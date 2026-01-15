import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Kaisei_Decol, Yomogi } from "next/font/google";
import Script from "next/script";
import Header from "@/components/layout/Header";
import Footer from "@/components/landing/Footer";
import CookieBanner from "@/components/ui/CookieBanner";
import FloatingPlanButton from "@/components/ui/FloatingPlanButton";
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
  title: {
    default: "Tabidea - Powered by ともきちの旅行日記",
    template: "%s - Tabidea",
  },
  description:
    "Tabideaは、AIの力とリアルな旅行体験をかけ合わせた、新しい旅行プランニングサービスです。",
  authors: [{ name: "ともきち" }],
  openGraph: {
    title: "Tabidea - Powered by ともきちの旅行日記",
    description:
      "日本と世界の美しい風景、文化、食べ物を通じて、新しい旅の発見をお届けする旅行ブログ。",
    url: "https://ai.tomokichidiary.com/",
    siteName: "Tabidea",
    type: "website",
    images: [
      {
        url: "favicon.ico",
        width: 1200,
        height: 630,
        alt: "Tabidea",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tabidea - Powered by ともきちの旅行日記",
    description:
      "Tabideaは、AIの力とリアルな旅行体験をかけ合わせた、新しい旅行プランニングサービスです。",
    images: ["favicon.ico"],
  },
  metadataBase: new URL("https://ai.tomokichidiary.com"),
  // manifest: "/manifest.json",
  // appleWebApp: {
  //   capable: true,
  //   statusBarStyle: "default",
  //   title: "Tabidea",
  // },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
        className={`${notoSansJP.variable} ${kaiseiDecol.variable} ${yomogi.variable} font-sans antialiased bg-background text-foreground pt-4`}
      >
        <Header />
        {children}
        <FloatingPlanButton />
        <CookieBanner />
        <Footer />
      </body>
    </html>
  );
}
