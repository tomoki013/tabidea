import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import StartPlanningButton from "@/components/common/StartPlanningButton";
import { SamplePlanList } from "@/components/features/samples";
import { getRequestLanguage } from "@/lib/i18n/server";
import { loadAllSamplePlans } from "@/lib/sample-plans-loader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.planner.samples.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function SamplesPage() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.planner.samples");
  const plans = await loadAllSamplePlans(language);

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9]">
      {/* Header Section */}
      <div className="relative w-full pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#e67e22_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#e67e22]/30 bg-[#e67e22]/5 text-[#e67e22] text-sm font-bold tracking-wider mb-4">
            {t("badge")}
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#2c2c2c] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-stone-600 font-hand text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {t("leadLine1")}
            <br className="hidden md:block" />
            {t("leadLine2")}
            <br />
            {t("leadLine3")}
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
            {t("ctaTitle")}
          </h3>
          <p className="text-stone-600 leading-relaxed">
            {t("ctaLine1")}
            <br className="md:hidden" />
            {t("ctaLine2")}
            <br />
            {t("ctaLine3")}
          </p>
          <StartPlanningButton className="inline-flex items-center justify-center px-8 py-3 bg-[#e67e22] text-white font-bold rounded-full hover:bg-[#d35400] transition-all hover:scale-105 shadow-md group" />
        </div>
      </main>
    </div>
  );
}
