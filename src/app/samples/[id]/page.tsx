import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSamplePlanById, samplePlans, getNights, getDays } from "@/lib/sample-plans";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaPalette,
  FaWallet,
  FaWalking,
  FaComments,
  FaArrowLeft,
} from "react-icons/fa";
import { FaWandMagicSparkles, FaPenToSquare } from "react-icons/fa6";

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
            </div>
          </section>

          {/* Action Buttons */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Generate Button */}
              <Link
                href={`/plan?sample=${plan.id}`}
                className="group flex items-center justify-center gap-3 px-6 py-4 bg-[#e67e22] text-white font-bold rounded-xl hover:bg-[#d35400] transition-all hover:scale-[1.02] shadow-md hover:shadow-lg"
              >
                <FaWandMagicSparkles className="text-lg group-hover:rotate-12 transition-transform" />
                <span>この条件でプランを生成する</span>
              </Link>

              {/* Customize Button */}
              <Link
                href={`/?sample=${plan.id}`}
                className="group flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#e67e22] font-bold rounded-xl border-2 border-[#e67e22] hover:bg-[#e67e22]/5 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
              >
                <FaPenToSquare className="text-lg group-hover:rotate-12 transition-transform" />
                <span>条件をカスタマイズする</span>
              </Link>
            </div>

            <p className="text-center text-stone-500 text-sm">
              「プランを生成する」をクリックすると、AIがこの条件を元に詳細な旅行プランを作成します。
              <br className="hidden md:block" />
              カスタマイズを選ぶと、条件を自由に変更してからプランを作成できます。
            </p>
          </section>

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

function ConditionCard({ icon, label, value, subtext, fullWidth }: ConditionCardProps) {
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
        {subtext && (
          <p className="text-xs text-stone-500 mt-1">{subtext}</p>
        )}
      </div>
    </div>
  );
}
