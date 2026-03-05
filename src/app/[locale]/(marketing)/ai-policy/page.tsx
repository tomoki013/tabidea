import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PolicyLink from "@/components/ui/PolicyLink";
import HighlightBox from "@/components/ui/HighlightBox";
import { getRequestLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.aiPolicyLegal");
  return { title: t("metaTitle") };
}

export default async function AiPolicy() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.marketing.aiPolicyLegal");

  if (language === "en") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] pt-32 pb-20 px-4 font-sans">
        <main className="max-w-4xl mx-auto bg-white p-6 sm:p-12 rounded-3xl border-2 border-dashed border-stone-200 shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2c2c2c] mb-12 text-center">
            {t("title")}
          </h1>
          <p className="text-sm text-stone-500 mb-8 text-center">
            {t("legalNotice")}
          </p>
          <section className="space-y-4 text-stone-600 leading-relaxed">
            <h2 className="text-xl font-semibold text-foreground border-b pb-2">
              {t("englishSummaryHeading")}
            </h2>
            <p>{t("englishSummaryBody1")}</p>
            <p>{t("englishSummaryBody2")}</p>
            <p>{t("englishSummaryBody3")}</p>
            <p>
              <PolicyLink href="/contact">{t("contactLabel")}</PolicyLink>
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-[#fcfbf9] pt-32 pb-20 px-4 font-sans">
      <main className="max-w-4xl mx-auto bg-white p-6 sm:p-12 rounded-3xl border-2 border-dashed border-stone-200 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#2c2c2c] mb-12 text-center">
          {t("title")}
        </h1>
        <p className="text-sm text-stone-500 mb-8 text-center">
          {t("legalNotice")}
        </p>

        <div className="space-y-8 text-stone-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section1.title")}
            </h2>
            <p>
              {t.rich("full.section1.bodyWithLinks", {
                terms: () => (
                  <PolicyLink href="/terms">
                    {t("full.section1.termsLabel")}
                  </PolicyLink>
                ),
                privacy: () => (
                  <PolicyLink href="/privacy">
                    {t("full.section1.privacyLabel")}
                  </PolicyLink>
                ),
              })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section2.title")}
            </h2>
            <p>{t("full.section2.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section3.title")}
            </h2>
            <p>{t("full.section3.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>{t("full.section3.items.google.label")}</strong>{" "}
                {t("full.section3.items.google.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.openai.label")}</strong>{" "}
                {t("full.section3.items.openai.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.retention.label")}</strong>{" "}
                {t("full.section3.items.retention.body")}
              </li>
            </ul>
            <p className="mt-2">
              {t("full.section3.detailsIntro")}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
               <li>
                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {t("full.section3.geminiTermsLinkLabel")}
                </a>
              </li>
              <li>
                <a
                  href="https://openai.com/policies/business-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {t("full.section3.openaiTermsLinkLabel")}
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section4.title")}
            </h2>
            <HighlightBox
              variant="warning"
              title={t("full.section4.warningTitle")}
            >
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>{t("full.section4.items.hallucination.label")}</strong>{" "}
                  {t("full.section4.items.hallucination.body")}
                </li>
                <li>
                  <strong>{t("full.section4.items.staleness.label")}</strong>{" "}
                  {t("full.section4.items.staleness.body")}
                </li>
                <li>
                  <strong>{t("full.section4.items.bias.label")}</strong>{" "}
                  {t("full.section4.items.bias.body")}
                </li>
              </ul>
            </HighlightBox>
            <p className="mt-4">
              {t("full.section4.conclusion")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section5.title")}
            </h2>
            <p>{t("full.section5.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>{t("full.section5.items.primarySources.label")}</strong>{" "}
                {t("full.section5.items.primarySources.body")}
              </li>
              <li>
                <strong>{t("full.section5.items.selfDecision.label")}</strong>{" "}
                {t("full.section5.items.selfDecision.body")}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section6.title")}
            </h2>
            <p>{t("full.section6.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>{t("full.section6.items.item1")}</li>
              <li>{t("full.section6.items.item2")}</li>
              <li>{t("full.section6.items.item3")}</li>
              <li>{t("full.section6.items.item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section7.title")}
            </h2>
            <p>{t("full.section7.body")}</p>
          </section>

          <div className="text-right text-sm text-muted-foreground mt-12">
            {t("full.establishedDateLabel")}
            <br />
            {t("full.updatedDateLabel")}
          </div>
        </div>
      </main>
    </div>
  );
}
