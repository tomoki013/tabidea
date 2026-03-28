import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  Header,
  Footer,
  CookieBanner,
  FloatingPlanButton,
  GlobalAuthUI,
} from "@/components/common";
import ThemeProvider from "@/components/common/ThemeProvider";
import { PlanGenerationOverlayProvider } from "@/context/PlanGenerationOverlayContext";
import { PlanModalProvider } from "@/context/PlanModalContext";
import { AuthProvider } from "@/context/AuthContext";
import { UserPlansProvider } from "@/context/UserPlansContext";
import { FlagsProvider } from "@/context/FlagsContext";
import { getRequestLanguage, getRequestRegion } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { resolveRegionalLocale } from "@/lib/i18n/locales";
import "./globals.css";

// Request-bound locale resolution and streaming planner routes must stay dynamic.
export const dynamic = "force-dynamic";

// Fonts are now loaded via fontsource CSS imports in globals.css
// This avoids Turbopack's issues with fetching Google Fonts during development

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const messages = getMessages(language) as {
    app?: {
      rootLayout?: {
        meta?: {
          defaultTitle?: string;
          titleTemplate?: string;
          siteName?: string;
          authorName?: string;
          description?: string;
          openGraphDescription?: string;
          ogImageAlt?: string;
          twitterDescription?: string;
        };
      };
    };
  };

  const meta = messages.app?.rootLayout?.meta;
  const defaultTitle = meta?.defaultTitle ?? "";
  const titleTemplate = meta?.titleTemplate ?? "%s";
  const siteName = meta?.siteName ?? defaultTitle;
  const authorName = meta?.authorName ?? siteName;
  const description = meta?.description ?? "";
  const openGraphDescription = meta?.openGraphDescription ?? description;
  const ogImageAlt = meta?.ogImageAlt ?? defaultTitle;
  const twitterDescription = meta?.twitterDescription ?? description;

  return {
    title: {
      default: defaultTitle,
      template: titleTemplate,
    },
    description,
    authors: [{ name: authorName }],
    openGraph: {
      title: defaultTitle,
      description: openGraphDescription,
      url: "https://tabide.ai",
      siteName,
      type: "website",
      images: [
        {
          url: "/favicon.ico",
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: defaultTitle,
      description: twitterDescription,
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
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getRequestLanguage();
  const region = await getRequestRegion(language);
  const regionalLocale = resolveRegionalLocale(language, region);
  const messages = getMessages(language);

  return (
    <html lang={regionalLocale} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <NextIntlClientProvider locale={language} messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <FlagsProvider>
                <UserPlansProvider>
                  <PlanGenerationOverlayProvider>
                    <PlanModalProvider>
                      <Header />
                      {children}
                      <FloatingPlanButton />
                      <CookieBanner />
                      <GlobalAuthUI />
                      <Footer />
                    </PlanModalProvider>
                  </PlanGenerationOverlayProvider>
                </UserPlansProvider>
              </FlagsProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
