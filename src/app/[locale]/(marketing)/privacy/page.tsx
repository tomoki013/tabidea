import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PolicyLink from "@/components/ui/PolicyLink";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.privacyLegal");
  return { title: t("metaTitle") };
}

export default async function PrivacyPolicy() {
  const t = await getTranslations("pages.marketing.privacyLegal");

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
            <p>{t("full.section1.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section2.title")}
            </h2>
            <p>{t("full.section2.intro")}</p>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section2.subsections.directProvided.title")}
                </h3>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    <strong>
                      {t("full.section2.subsections.directProvided.items.account.label")}
                    </strong>
                    {t("full.section2.subsections.directProvided.items.account.body")}
                  </li>
                  <li>
                    {t("full.section2.subsections.directProvided.items.tripInfo")}
                  </li>
                  <li>
                    {t("full.section2.subsections.directProvided.items.contactInfo")}
                  </li>
                  <li>
                    {t("full.section2.subsections.directProvided.items.feedback")}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section2.subsections.autoCollected.title")}
                </h3>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>{t("full.section2.subsections.autoCollected.items.device")}</li>
                  <li>{t("full.section2.subsections.autoCollected.items.log")}</li>
                  <li>{t("full.section2.subsections.autoCollected.items.cookie")}</li>
                  <li>{t("full.section2.subsections.autoCollected.items.location")}</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section3.title")}
            </h2>
            <p>{t("full.section3.intro")}</p>
            <ol className="list-decimal pl-6 mt-3 space-y-2">
              <li>
                <strong>{t("full.section3.items.authentication.label")}</strong>
                {t("full.section3.items.authentication.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.operations.label")}</strong>
                {t("full.section3.items.operations.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.improvement.label")}</strong>
                {t("full.section3.items.improvement.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.support.label")}</strong>
                {t("full.section3.items.support.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.security.label")}</strong>
                {t("full.section3.items.security.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.notifications.label")}</strong>
                {t("full.section3.items.notifications.body")}
              </li>
              <li>
                <strong>{t("full.section3.items.other.label")}</strong>
                {t("full.section3.items.other.body")}
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section4.title")}
            </h2>
            <p>{t("full.section4.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>{t("full.section4.items.item1")}</li>
              <li>{t("full.section4.items.item2")}</li>
              <li>{t("full.section4.items.item3")}</li>
              <li>{t("full.section4.items.item4")}</li>
              <li>
                <strong>{t("full.section4.items.merger.label")}</strong>
                {t("full.section4.items.merger.body")}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section5.title")}
            </h2>
            <p>{t("full.section5.intro")}</p>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section5.subsections.ai.title")}
                </h3>
                <p className="mt-1">
                  {t.rich("full.section5.subsections.ai.bodyWithLink", {
                    aiPolicy: (chunks) => (
                      <PolicyLink href="/ai-policy">{chunks}</PolicyLink>
                    ),
                  })}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section5.subsections.analytics.title")}
                </h3>
                <p className="mt-1">{t("full.section5.subsections.analytics.body")}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section5.subsections.payment.title")}
                </h3>
                <p className="mt-1">{t("full.section5.subsections.payment.body")}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section5.subsections.affiliate.title")}
                </h3>
                <p className="mt-1">{t("full.section5.subsections.affiliate.body")}</p>
              </div>
            </div>
            <p className="mt-4">
              {t.rich("full.section5.cookieNoticeWithLink", {
                cookiePolicy: (chunks) => (
                  <PolicyLink href="/cookie-policy">{chunks}</PolicyLink>
                ),
              })}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section6.title")}
            </h2>
            <p>{t("full.section6.intro")}</p>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section6.subsections.encryption.title")}
                </h3>
                <p className="mt-1">{t("full.section6.subsections.encryption.body")}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {t("full.section6.subsections.adminAccess.title")}
                </h3>
                <p className="mt-1">{t("full.section6.subsections.adminAccess.body")}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 border-b pb-2">
              {t("full.section7.title")}
            </h2>
            <p>{t("full.section7.body")}</p>
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
