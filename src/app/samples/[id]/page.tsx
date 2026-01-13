import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSamplePlanById,
  samplePlans,
  getNights,
  getDays,
} from "@/lib/sample-plans";
import { getSampleItinerary } from "@/lib/sample-itineraries";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaPalette,
  FaWallet,
  FaWalking,
  FaComments,
  FaArrowLeft,
  FaClock,
} from "react-icons/fa";
import { UserInput } from "@/lib/types";
import Image from "next/image";
import ShareButtons from "@/components/ShareButtons";
import SamplePlanActions from "@/components/SamplePlanActions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return samplePlans.map((plan) => ({
    id: plan.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const plan = getSamplePlanById(id);

  if (!plan) {
    return {
      title: "プランが見つかりません - Tabidea (タビデア)",
    };
  }

  return {
    title: `${plan.title} - サンプルプラン - Tabidea (タビデア)`,
    description: plan.description,
  };
}

export default async function SamplePlanDetailPage({ params }: Props) {
  const { id } = await params;
  const plan = getSamplePlanById(id);

  if (!plan) {
    notFound();
  }

  const { input } = plan;
  const nights = getNights(input.dates);
  const days = getDays(input.dates);

  // 事前生成済みの旅程を取得
  const itinerary = getSampleItinerary(id);

  // プラン編集用のUserInput
  const fullInput: UserInput = {
    ...input,
    hasMustVisitPlaces: input.hasMustVisitPlaces ?? false,
    mustVisitPlaces: input.mustVisitPlaces ?? [],
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      {/* Header Section */}
      <div className="relative w-full py-12 md:py-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#e67e22_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Back Link */}
          <Link
            href="/samples"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-[#e67e22] transition-colors mb-6 text-sm font-medium"
          >
            <FaArrowLeft />
            <span>サンプルプラン一覧に戻る</span>
          </Link>

          {/* Badge */}
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#e67e22]/30 bg-[#e67e22]/5 text-[#e67e22] text-sm font-bold tracking-wider mb-4">
            SAMPLE PLAN
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-[#2c2c2c] tracking-tight mb-4">
            {plan.title}
          </h1>

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
          {/* Conditions Section */}
          <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-8">
            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e67e22] to-[#f39c12]" />
              <div className="p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-[#2c2c2c] mb-6">
                  このプランの希望条件
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Destination */}
                  <ConditionCard
                    icon={<FaMapMarkerAlt />}
                    label="目的地"
                    value={input.destination}
                  />

                  {/* Dates */}
                  <ConditionCard
                    icon={<FaCalendarAlt />}
                    label="日程"
                    value={input.dates}
                    subtext={nights > 0 ? `${nights}泊${days}日` : undefined}
                  />

                  {/* Companions */}
                  <ConditionCard
                    icon={<FaUsers />}
                    label="同行者"
                    value={input.companions}
                  />

                  {/* Themes */}
                  <ConditionCard
                    icon={<FaPalette />}
                    label="テーマ"
                    value={input.theme.join("、")}
                  />

                  {/* Budget */}
                  <ConditionCard
                    icon={<FaWallet />}
                    label="予算感"
                    value={input.budget}
                  />

                  {/* Pace */}
                  <ConditionCard
                    icon={<FaWalking />}
                    label="旅のペース"
                    value={input.pace}
                  />

                  {/* Free Text (full width) */}
                  {input.freeText && (
                    <div className="md:col-span-2">
                      <ConditionCard
                        icon={<FaComments />}
                        label="その他の希望"
                        value={input.freeText}
                        fullWidth
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 mb-2 pt-6 px-4 border-t border-stone-100">
                <SamplePlanActions sampleInput={fullInput} />
              </div>
            </div>
          </section>

          {/* AI Generated Itinerary Section */}
          {itinerary && (
            <section className="mb-8">
              {/* Hero Image */}
              {itinerary.heroImage && (
                <div className="relative mb-8">
                  <div className="relative aspect-video sm:aspect-21/9 w-full rounded-sm overflow-hidden shadow-xl border-8 border-white bg-white rotate-1">
                    <Image
                      src={itinerary.heroImage}
                      alt={itinerary.destination}
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Unsplash Credit */}
                    {itinerary.heroImagePhotographer &&
                      itinerary.heroImagePhotographerUrl && (
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                          Photo by{" "}
                          <a
                            href={itinerary.heroImagePhotographerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-stone-300 transition-colors"
                          >
                            {itinerary.heroImagePhotographer}
                          </a>{" "}
                          on{" "}
                          <a
                            href="https://unsplash.com/?utm_source=Tabidea&utm_medium=referral"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-stone-300 transition-colors"
                          >
                            Unsplash
                          </a>
                        </div>
                      )}
                    {/* Tape Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-100/80 -rotate-2 shadow-sm backdrop-blur-sm"></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#e67e22]/10 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-[#2c2c2c]">
                  AIが作成した旅程
                </h2>
              </div>

              {/* Itinerary Description */}
              <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm mb-8">
                <p className="text-stone-600 leading-relaxed">
                  {itinerary.description}
                </p>
              </div>

              {/* AI Disclaimer Notice */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-6 rounded-lg shadow-sm mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 mb-2 text-lg">
                      AI生成プランに関する重要なお知らせ
                    </h3>
                    <div className="text-amber-800 text-sm leading-relaxed space-y-2">
                      <p>
                        このプランはAIによって自動生成されています。以下の点にご注意ください：
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>
                          施設の営業時間、料金、住所などの情報は必ず公式サイトで最新情報をご確認ください
                        </li>
                        <li>
                          AIは時に事実と異なる情報を生成する可能性があります（ハルシネーション）
                        </li>
                        <li>
                          季節や天候、予約の必要性など、実際の旅行計画では追加の確認が必要です
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-12">
                {itinerary.days.map((day) => (
                  <div key={day.day} className="relative">
                    {/* Day Header */}
                    <div className="sticky top-0 z-30 mb-8 flex items-center gap-4">
                      <div className="inline-flex items-center gap-4 bg-white py-3 px-6 rounded-r-full shadow-md border border-stone-200 border-l-4 border-l-primary">
                        <span className="text-4xl font-serif text-primary">
                          {day.day}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs text-stone-400 uppercase tracking-widest font-bold">
                            Day
                          </span>
                          <span className="text-stone-600 font-serif italic text-lg leading-none">
                            {day.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="border-l-2 border-stone-200 ml-8 space-y-8 pb-8 relative">
                      {day.activities.map((act, actIndex) => (
                        <div key={actIndex} className="relative pl-10 group">
                          {/* Dot on timeline */}
                          <div className="absolute left-[-9px] top-6 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm z-10"></div>

                          {/* Activity Card */}
                          <div className="bg-white border rounded-xl p-6 shadow-sm transition-all duration-300 hover:bg-stone-50 border-stone-100 hover:shadow-md group-hover:-translate-y-1 relative overflow-hidden">
                            {/* Decorative background stripe */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-stone-200 group-hover:bg-primary transition-colors"></div>

                            <div className="flex items-center gap-2 mb-2 text-stone-500 text-sm font-mono bg-stone-100 inline-block px-2 py-1 rounded-md">
                              <FaClock className="text-primary/70" />
                              {act.time}
                            </div>

                            <h4 className="text-xl font-bold text-stone-800 mb-2 font-serif">
                              {act.activity}
                            </h4>
                            <p className="text-stone-600 leading-relaxed text-sm">
                              {act.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Share Buttons */}
              <div className="mt-8 pt-8 border-t border-stone-200">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                  <ShareButtons input={fullInput} result={itinerary} />
                </div>
              </div>
            </section>
          )}

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
  );
}

interface ConditionCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  fullWidth?: boolean;
}

function ConditionCard({
  icon,
  label,
  value,
  subtext,
  fullWidth,
}: ConditionCardProps) {
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg bg-stone-50 border border-stone-100 ${
        fullWidth ? "flex-col items-stretch" : ""
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#e67e22]/10 text-[#e67e22]">
        {icon}
      </div>
      <div className={`flex-1 min-w-0 ${fullWidth ? "mt-0" : ""}`}>
        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-[#2c2c2c] font-medium leading-relaxed">{value}</p>
        {subtext && <p className="text-xs text-stone-500 mt-1">{subtext}</p>}
      </div>
    </div>
  );
}
