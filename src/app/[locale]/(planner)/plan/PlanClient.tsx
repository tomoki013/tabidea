"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { UserInput } from "@/types";
import { getSamplePlanById } from "@/lib/sample-plans";
import { usePlanGeneration } from "@/lib/hooks/usePlanGeneration";
import ComposeLoadingAnimation from "@/components/features/planner/ComposeLoadingAnimation";
import StreamingResultView from "@/components/features/planner/StreamingResultView";
import { PlanModal } from "@/components/common";
import { FAQSection, ExampleSection } from "@/components/features/landing";
import HighlightBox from "@/components/ui/HighlightBox/HighlightBox";
import { FaPlus } from "react-icons/fa6";
import { localizeHref, resolveLanguageFromPathname } from "@/lib/i18n/navigation";

function PlanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const language = resolveLanguageFromPathname(pathname);
  const t = useTranslations("app.planner.plan");
  const tCompose = useTranslations("lib.planGeneration.compose");
  const sampleId = searchParams.get("sample");
  const legacyQ = searchParams.get("q");
  const mode = searchParams.get("mode");

  const compose = usePlanGeneration();
  const hasStartedGeneration = useRef(false);
  const [sampleInput, setSampleInput] = useState<UserInput | null>(null);

  const fallbackInput: UserInput = sampleInput || {
    destinations: [],
    region: "",
    dates: "",
    companions: "",
    theme: [],
    budget: "",
    pace: "",
    freeText: "",
    travelVibe: "",
    mustVisitPlaces: [],
    hasMustVisitPlaces: false,
    preferredTransport: [],
    fixedSchedule: [],
  };

  // Generate plan from sample using compose pipeline
  const generateFromSample = useCallback(async (sampleInput: UserInput) => {
    await compose.generate(sampleInput);
  }, [compose]);

  useEffect(() => {
    // Handle legacy outline mode — redirect to home (no longer supported)
    if (mode === 'outline') {
      localStorage.removeItem("tabidea_outline_state");
      router.replace(localizeHref("/", language));
      return;
    }

    // Handle legacy q parameter - redirect to home
    if (legacyQ && !sampleId) {
      router.replace(localizeHref("/", language));
      return;
    }

    // Handle sample generation
    if (sampleId && !hasStartedGeneration.current) {
      hasStartedGeneration.current = true;
      const samplePlan = getSamplePlanById(sampleId);
      if (samplePlan) {
        const sampleInput: UserInput = {
          ...samplePlan.input,
          hasMustVisitPlaces: samplePlan.input.hasMustVisitPlaces ?? false,
          mustVisitPlaces: samplePlan.input.mustVisitPlaces ?? [],
        };
        setSampleInput(sampleInput);
        generateFromSample(sampleInput);
      } else {
        compose.reset();
      }
    } else if (!sampleId && !legacyQ && !mode) {
      router.replace(localizeHref("/", language));
    }
  }, [sampleId, legacyQ, mode, router, generateFromSample, language, compose]);

  const warningBox = compose.warnings.length > 0 ? (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0 mt-4">
      <HighlightBox variant="warning" title={tCompose("warnings.title")}>
        <div className="space-y-2 text-sm">
          {compose.warnings.map((warning, index) => (
            <p key={`${warning}-${index}`}>{warning}</p>
          ))}
        </div>
      </HighlightBox>
    </div>
  ) : null;

  // Show streaming day cards during narrative_render
  if (compose.isGenerating && compose.currentStep === 'narrative_render' && compose.partialDays.size > 0) {
    return (
      <div className="w-full">
        {warningBox}
        <StreamingResultView
          composeMode
          composeSteps={compose.steps}
          composeCurrentStep={compose.currentStep}
          partialComposeDays={compose.partialDays}
          totalDays={compose.totalDays}
          previewDestination={compose.previewDestination}
          previewDescription={compose.previewDescription}
          input={fallbackInput}
        />
      </div>
    );
  }

  // Show compose loading animation
  if (compose.isGenerating) {
    return (
      <div className="w-full">
        {warningBox}
        <ComposeLoadingAnimation
          steps={compose.steps}
          currentStep={compose.currentStep}
          previewDestination={compose.previewDestination}
          previewDescription={compose.previewDescription}
          totalDays={compose.totalDays}
        />
      </div>
    );
  }

  // Error state
  if (compose.errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive font-medium text-lg">
          {compose.errorMessage}
        </p>
        {sampleId && (
          <button
            onClick={() => {
              hasStartedGeneration.current = false;
              compose.reset();
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-bold"
          >
            {t("retry")}
          </button>
        )}
        <Link
          href={localizeHref("/", language)}
          className="px-4 py-2 text-stone-600 hover:text-primary transition-colors"
        >
          {t("backHome")}
        </Link>
        <p className="text-stone-600 text-sm mt-2">
          {t("contactPrefix")}
          <a
            href={localizeHref("/contact", language)}
            className="text-primary hover:underline font-medium ml-1"
          >
            {t("contact")}
          </a>
          {t("contactSuffix")}
        </p>
      </div>
    );
  }

  // Loading state (initial)
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    </div>
  );
}

export default function PlanClient() {
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const t = useTranslations("app.planner.plan");

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbf9] overflow-x-clip">
      <main className="flex-1 w-full flex flex-col items-center overflow-x-clip pt-24 md:pt-28">

        <Suspense
          fallback={
            <div className="w-full max-w-2xl h-[500px] bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            </div>
          }
        >
          <PlanContent />
        </Suspense>

        {/* Call to Action - Create New Plan */}
        <div className="w-full flex justify-center pb-16 pt-8">
          <button
            onClick={() => setIsNewPlanModalOpen(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-primary font-serif rounded-full hover:bg-primary/90 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <FaPlus className="mr-2 relative z-10" />
            <span className="relative z-10">
              {t("createNewPlan")}
            </span>
          </button>
        </div>

        <ExampleSection />
        <FAQSection limit={5} />

        {/* New Plan Modal */}
        <PlanModal
          isOpen={isNewPlanModalOpen}
          onClose={() => setIsNewPlanModalOpen(false)}
          initialInput={null}
          initialStep={0}
        />
      </main>
    </div>
  );
}
