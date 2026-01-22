import { Metadata } from "next";
import StartPlanningButton from "@/components/common/StartPlanningButton";
import SamplePlanList from "@/components/samples/SamplePlanList";
import { loadAllSamplePlans } from "@/lib/sample-plans-loader";

export const metadata: Metadata = {
  title: "サンプルプラン集",
  description:
    "AIが作成した旅行プランのサンプル集。家族旅行、カップル旅行、一人旅など、様々なシチュエーションに合わせたプラン例をご覧いただけます。",
};

export default async function SamplesPage() {
  const plans = await loadAllSamplePlans();

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      {/* Header Section */}
      <div className="relative w-full pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#e67e22_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#e67e22]/30 bg-[#e67e22]/5 text-[#e67e22] text-sm font-bold tracking-wider mb-4">
            SAMPLE PLANS
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2c2c] tracking-tight">
            サンプルプラン集
          </h1>
          <p className="text-stone-600 font-hand text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            AIが作成した旅行プランの例をご紹介。
            <br className="hidden md:block" />
            あなたの旅のインスピレーションに。
            <br />
            気になるプランを参考に、オリジナルの旅を計画しましょう。
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 md:px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <SamplePlanList plans={plans} />
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto mt-16 p-8 md:p-12 bg-white rounded-xl border border-stone-200 shadow-sm text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e67e22] to-[#f39c12]" />
          <h3 className="text-2xl font-serif font-bold text-[#2c2c2c]">
            オリジナルプランを作成しませんか？
          </h3>
          <p className="text-stone-600 leading-relaxed">
            サンプルを参考にしたら、
            <br className="md:hidden" />
            あなただけの旅行プランをAIに作ってもらいましょう。
            <br />
            目的地、日程、同行者に合わせて最適なプランを提案します。
          </p>
          <StartPlanningButton className="inline-flex items-center justify-center px-8 py-3 bg-[#e67e22] text-white font-bold rounded-full hover:bg-[#d35400] transition-all hover:scale-105 shadow-md group" />
        </div>
      </main>
    </div>
  );
}
