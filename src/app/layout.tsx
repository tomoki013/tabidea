import type { Metadata, Viewport } from "next";
import Script from "next/script";
import {
  Header,
  Footer,
  CookieBanner,
  FloatingPlanButton,
  GlobalAuthUI,
} from "@/components/common";
import { PlanModalProvider } from "@/context/PlanModalContext";
import { AuthProvider } from "@/context/AuthContext";
import { UserPlansProvider } from "@/context/UserPlansContext";
import { FlagsProvider } from "@/context/FlagsContext";
import "./globals.css";

// Fonts are now loaded via fontsource CSS imports in globals.css
// This avoids Turbopack's issues with fetching Google Fonts during development

export const metadata: Metadata = {
  title: {
    default: "Tabidea - AI Travel Planner",
    template: "%s - Tabidea",
  },
  description:
    "Tabideaは、AIの力とリアルな旅行体験をかけ合わせた、新しい旅行プランニングサービスです。",
  authors: [{ name: "ともきち" }],
  openGraph: {
    title: "Tabidea - AI Travel Planner",
    description:
      "日本と世界の美しい風景、文化、食べ物を通じて、新しい旅の発見をお届けする旅行ブログ。",
    url: "https://tabide.ai",
    siteName: "Tabidea",
    type: "website",
    images: [
      {
        url: "/favicon.ico",
        width: 32,
        height: 32,
        alt: "Tabidea - AI Travel Planner",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Tabidea - AI Travel Planner",
    description:
      "Tabideaは、AIの力とリアルな旅行体験をかけ合わせた、新しい旅行プランニングサービスです。",
    images: ["/favicon.ico"],
  },
  metadataBase: new URL("https://tabide.ai"),
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
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <FlagsProvider>
            <UserPlansProvider>
              <PlanModalProvider>
                <Header />
                {children}
                <FloatingPlanButton />
                <CookieBanner />
                <GlobalAuthUI />
                <Footer />
              </PlanModalProvider>
            </UserPlansProvider>
          </FlagsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
