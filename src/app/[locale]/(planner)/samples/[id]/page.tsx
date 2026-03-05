import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSamplePlanByIdDynamic, loadAllSamplePlans } from "@/lib/sample-plans-loader";
import { getSampleItinerary } from "@/lib/sample-itineraries";
import { UserInput } from '@/types';
import { getRequestLanguage } from "@/lib/i18n/server";
import { resolveOpenGraphLocale, resolveRegionalLocale } from "@/lib/i18n/locales";
import SampleDetailClient from "./SampleDetailClient";
import SampleCollectionPromotionSection from "@/components/features/samples/SampleCollectionPromotionSection";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const plans = await loadAllSamplePlans();
  return plans.map((plan) => ({
    id: plan.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.planner.sampleDetail");
  const { id } = await params;
  const plan = await getSamplePlanByIdDynamic(id);
  const itinerary = await getSampleItinerary(id);

  if (!plan) {
    return {
      title: t("meta.notFoundTitle"),
    };
  }

  const siteUrl = "https://tabide.ai";
  const pageUrl = `${siteUrl}/${language}/samples/${id}`;
  const ogImage = itinerary?.heroImage || `${siteUrl}/og-default.png`;
  const listFormatter = new Intl.ListFormat(resolveRegionalLocale(language), {
    style: "long",
    type: "conjunction",
  });

  const destinationsStr = listFormatter.format(plan.input.destinations);
  const themesStr = listFormatter.format(plan.input.theme);
  const keywordSeeds = t.raw("meta.keywordSeeds") as string[];
  const keywords = [
    ...plan.input.destinations,
    ...plan.input.theme,
    plan.input.companions,
    plan.input.dates,
    ...keywordSeeds,
    ...plan.tags,
  ];

  const enhancedDescription = t("meta.enhancedDescription", {
    description: plan.description,
    dates: plan.input.dates,
    destinations: destinationsStr,
    themes: themesStr,
    companions: plan.input.companions,
  });

  return {
    title: t("meta.title", { title: plan.title }),
    description: enhancedDescription,
    keywords: keywords,
    openGraph: {
      title: t("meta.shortTitle", { title: plan.title }),
      description: plan.description,
      url: pageUrl,
      siteName: t("meta.siteName"),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: t("meta.imageAlt", { destinations: destinationsStr }),
        },
      ],
      type: "article",
      locale: resolveOpenGraphLocale(language),
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta.shortTitle", { title: plan.title }),
      description: plan.description,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function SamplePlanDetailPage({ params }: Props) {
  const t = await getTranslations("pages.planner.sampleDetail");
  const { id } = await params;
  const plan = await getSamplePlanByIdDynamic(id);

  if (!plan) {
    notFound();
  }

  const { input } = plan;

  // 事前生成済みの旅程を取得
  const itinerary = await getSampleItinerary(id);

  if (!itinerary) {
     return notFound();
  }

  // プラン編集用のUserInput
  const fullInput: UserInput = {
    ...input,
    hasMustVisitPlaces: input.hasMustVisitPlaces ?? false,
    mustVisitPlaces: input.mustVisitPlaces ?? [],
  };

  // JSON-LD構造化データを生成
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: plan.title,
    description: plan.description,
    author: {
      "@type": "Organization",
      name: "Tabidea",
      url: "https://tabide.ai",
    },
    publisher: {
      "@type": "Organization",
      name: "Tabidea",
      logo: {
        "@type": "ImageObject",
        url: "https://tabide.ai/icon-512x512.png",
      },
    },
    image: itinerary?.heroImage,
    datePublished: plan.createdAt,
    about: {
      "@type": "TouristTrip",
      name: plan.title,
      description: plan.description,
      touristType: input.companions,
      itinerary: itinerary
        ? {
            "@type": "ItemList",
            numberOfItems: itinerary.days.length,
            itemListElement: itinerary.days.map((day, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: t("meta.dayLabel", { day: day.day, title: day.title }),
            })),
          }
        : undefined,
    },
  };

  return (
    <>
      {/* JSON-LD構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
        {/* Main Content */}
        <main className="flex-1 w-full flex flex-col items-center overflow-x-clip">

           {/* Title Section (Simulating PlanCodeClient style) */}
            <div className="w-full pt-32 pb-8 text-center px-4 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="inline-block mb-4 px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-xs font-bold tracking-wider uppercase border border-stone-200">
                {t("badge")}
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-800 tracking-tight">
                {plan.title}
              </h1>
              <p className="text-stone-500 mt-3 font-hand text-lg max-w-2xl mx-auto">
                {plan.description}
              </p>
            </div>

            <SampleDetailClient
              sampleInput={fullInput}
              sampleItinerary={itinerary}
            />

            <SampleCollectionPromotionSection />
        </main>
      </div>
    </>
  );
}
