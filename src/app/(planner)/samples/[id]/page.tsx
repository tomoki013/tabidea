import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSamplePlanByIdDynamic, loadAllSamplePlans } from "@/lib/sample-plans-loader";
import { getSampleItinerary } from "@/lib/sample-itineraries";
import { FaArrowLeft } from "react-icons/fa";
import { UserInput } from '@/types';
import AIPromotionBanner, {
  AIPromotionBannerCompact,
} from "@/components/AIPromotionBanner";
import SampleDetailClient from "@/components/SampleDetailClient";

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
  const { id } = await params;
  const plan = await getSamplePlanByIdDynamic(id);
  const itinerary = await getSampleItinerary(id);

  if (!plan) {
    return {
      title: "プランが見つかりません - Tabidea (タビデア)",
    };
  }

  const siteUrl = "https://ai.tomokichidiary.com";
  const pageUrl = `${siteUrl}/samples/${id}`;
  const ogImage = itinerary?.heroImage || `${siteUrl}/og-default.png`;

  // キーワードとしてタグとテーマを活用
  const destinationsStr = plan.input.destinations.join("、");
  const keywords = [
    ...plan.input.destinations,
    ...plan.input.theme,
    plan.input.companions,
    plan.input.dates,
    "AI旅行プラン",
    "旅程作成",
    "旅行計画",
    "Tabidea",
    ...plan.tags,
  ];

  const enhancedDescription = `${
    plan.description
  } Tabidea(タビデア)のAIが作成した${plan.input.dates}の旅行プラン。${
    destinationsStr
  }で${plan.input.theme.join("・")}を楽しむ${
    plan.input.companions
  }向けプラン。`;

  return {
    title: `【AI作成】${plan.title} | Tabidea - AIトラベルプランナー`,
    description: enhancedDescription,
    keywords: keywords,
    openGraph: {
      title: `【AI作成】${plan.title}`,
      description: plan.description,
      url: pageUrl,
      siteName: "Tabidea (タビデア)",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${destinationsStr}の旅行プラン`,
        },
      ],
      type: "article",
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title: `【AI作成】${plan.title}`,
      description: plan.description,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function SamplePlanDetailPage({ params }: Props) {
  const { id } = await params;
  const plan = await getSamplePlanByIdDynamic(id);

  if (!plan) {
    notFound();
  }

  const { input } = plan;

  // 事前生成済みの旅程を取得
  const itinerary = await getSampleItinerary(id);

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
      url: "https://tabidea.tomokichidiary.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Tabidea",
      logo: {
        "@type": "ImageObject",
        url: "https://tabidea.tomokichidiary.com/icon-512x512.png",
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
              name: `Day ${day.day}: ${day.title}`,
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
      <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
        {/* Header Section */}
        <div className="relative w-full py-12 md:py-20 px-4 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#e67e22_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="max-w-4xl mx-auto relative z-10">
            {/* Nav Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <Link
                href="/samples"
                className="group inline-flex items-center gap-3 text-stone-500 hover:text-stone-800 transition-colors"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 group-hover:border-primary/50 group-hover:text-primary shadow-sm transition-all duration-300">
                  <FaArrowLeft size={14} />
                </div>
                <span className="text-sm font-bold font-serif tracking-wide">
                  Back to List
                </span>
              </Link>

              {/* Desktop Badge */}
              <div className="hidden md:block px-4 py-1.5 border-2 border-stone-300/50 text-stone-400 font-mono text-xs font-bold tracking-[0.2em] uppercase rotate-[-2deg] bg-white/50 backdrop-blur-sm">
                Sample Plan
              </div>
            </div>

            {/* Title Block */}
            <div className="text-left relative">
              {/* Mobile Badge */}
              <div className="md:hidden inline-block mb-4 px-3 py-1 border-2 border-stone-300/50 text-stone-400 font-mono text-xs font-bold tracking-[0.2em] uppercase rotate-[-2deg] bg-white/50 backdrop-blur-sm">
                Sample Plan
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2c2c] tracking-tight mb-6 leading-tight">
                {plan.title}
              </h1>
            </div>

            {/* Description */}
            <p className="text-stone-600 text-base md:text-lg leading-relaxed mb-6">
              {plan.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {plan.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-3 py-1.5 text-sm font-medium rounded-full bg-[#e67e22]/10 text-[#e67e22] border border-[#e67e22]/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 w-full px-4 md:px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* AI Promotion Banner - Top */}
            <AIPromotionBanner />

            {itinerary && (
              <SampleDetailClient
                sampleInput={fullInput}
                sampleItinerary={itinerary}
              />
            )}

            {/* AI Promotion Banner - Bottom CTA */}
            <AIPromotionBannerCompact />

            {/* Back Link */}
            <div className="mt-12 pt-8 border-t border-stone-200 text-center">
              <Link
                href="/samples"
                className="inline-flex items-center gap-2 text-stone-500 hover:text-[#e67e22] transition-colors font-medium"
              >
                <FaArrowLeft />
                <span>他のサンプルプランを見る</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
