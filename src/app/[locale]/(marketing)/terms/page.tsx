import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PolicyLink from "@/components/ui/PolicyLink";
import HighlightBox from "@/components/ui/HighlightBox";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.termsLegal");
  return { title: t("metaTitle") };
}

export default async function TermsOfService() {
  const t = await getTranslations("pages.marketing.termsLegal");

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
            <p>{t("full.section1.body1")}</p>
            <p className="mt-2">
              {t.rich("full.section1.body2WithLinks", {
                privacy: (chunks) => <PolicyLink href="/privacy">{chunks}</PolicyLink>,
                cookie: (chunks) => (
                  <PolicyLink href="/cookie-policy">{chunks}</PolicyLink>
                ),
                ai: (chunks) => <PolicyLink href="/ai-policy">{chunks}</PolicyLink>,
              })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section2.title")}
            </h2>
            <p>{t("full.section2.intro")}</p>
            <HighlightBox
              variant="info"
              title={t("full.section2.importantTitle")}
              className="mt-3"
            >
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>{t("full.section2.items.infoOnly.label")}</strong>
                  {t("full.section2.items.infoOnly.body")}
                </li>
                <li>
                  <strong>{t("full.section2.items.aiNature.label")}</strong>
                  {t("full.section2.items.aiNature.body")}
                </li>
              </ul>
            </HighlightBox>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section3.title")}
            </h2>
            <p>{t("full.section3.body1")}</p>
            <p className="mt-2">{t("full.section3.body2")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section4.title")}
            </h2>
            <p>{t("full.section4.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>{t("full.section4.items.management.label")}</strong>
                {t("full.section4.items.management.body")}
              </li>
              <li>
                <strong>{t("full.section4.items.transferBan.label")}</strong>
                {t("full.section4.items.transferBan.body")}
              </li>
              <li>
                <strong>{t("full.section4.items.deletion.label")}</strong>
                {t("full.section4.items.deletion.body")}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section5.title")}
            </h2>
            <p>{t("full.section5.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>{t("full.section5.items.item1")}</li>
              <li>{t("full.section5.items.item2")}</li>
              <li>{t("full.section5.items.item3")}</li>
              <li>{t("full.section5.items.item4")}</li>
              <li>{t("full.section5.items.item5")}</li>
              <li>{t("full.section5.items.item6")}</li>
              <li>{t("full.section5.items.item7")}</li>
              <li>{t("full.section5.items.item8")}</li>
              <li>{t("full.section5.items.item9")}</li>
              <li>{t("full.section5.items.item10")}</li>
              <li>{t("full.section5.items.item11")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section6.title")}
            </h2>
            <p className="mb-4">{t("full.section6.intro")}</p>
            <HighlightBox
              variant="danger"
              title={t("full.section6.disclaimerTitle")}
            >
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>{t("full.section6.items.aiErrors.label")}</strong>
                  {t("full.section6.items.aiErrors.body")}
                </li>
                <li>
                  <strong>{t("full.section6.items.travelIssues.label")}</strong>
                  {t("full.section6.items.travelIssues.body")}
                </li>
                <li>
                  <strong>
                    {t("full.section6.items.linkedTransactions.label")}
                  </strong>
                  {t("full.section6.items.linkedTransactions.body")}
                </li>
                <li>
                  <strong>{t("full.section6.items.systemFailure.label")}</strong>
                  {t("full.section6.items.systemFailure.body")}
                </li>
              </ul>
            </HighlightBox>
            <p className="mt-4">{t("full.section6.conclusion")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section7.title")}
            </h2>
            <p className="mb-4">{t("full.section7.intro")}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>{t("full.section7.items.pricing.label")}</strong>
                {t("full.section7.items.pricing.body")}
              </li>
              <li>
                <strong>{t("full.section7.items.payment.label")}</strong>
                {t("full.section7.items.payment.body")}
              </li>
              <li>
                <strong>{t("full.section7.items.renewal.label")}</strong>
                {t("full.section7.items.renewal.body")}
              </li>
              <li>
                <strong>{t("full.section7.items.cancellation.label")}</strong>
                {t("full.section7.items.cancellation.body")}
              </li>
              <li>
                <strong>{t("full.section7.items.refund.label")}</strong>
                {t("full.section7.items.refund.body")}
              </li>
            </ul>
            <p>
              {t.rich("full.section7.outroWithSpecifiedLink", {
                specified: (chunks) => (
                  <PolicyLink href="/specified">{chunks}</PolicyLink>
                ),
              })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section8.title")}
            </h2>
            <p>{t("full.section8.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section9.title")}
            </h2>
            <p>{t("full.section9.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section10.title")}
            </h2>
            <p>{t("full.section10.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section11.title")}
            </h2>
            <p>{t("full.section11.body")}</p>
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
