import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PolicyLink from "@/components/ui/PolicyLink";
import { getRequestLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.cookiePolicyLegal");
  return { title: t("metaTitle") };
}

export default async function CookiePolicy() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.marketing.cookiePolicyLegal");

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
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-4 border-b border-stone-200 pb-2">
              {t("full.section1.title")}
            </h2>
            <p>{t("full.section1.body")}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-4 border-b border-stone-200 pb-2">
              {t("full.section2.title")}
            </h2>
            <p>{t("full.section2.intro")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong className="text-stone-700">
                  {t("full.section2.items.convenience.label")}
                </strong>{" "}
                {t("full.section2.items.convenience.body")}
              </li>
              <li>
                <strong className="text-stone-700">
                  {t("full.section2.items.analytics.label")}
                </strong>{" "}
                {t("full.section2.items.analytics.body")}
              </li>
              <li>
                <strong className="text-stone-700">
                  {t("full.section2.items.security.label")}
                </strong>{" "}
                {t("full.section2.items.security.body")}
              </li>
            </ul>
            <p className="mt-3">
              {t("full.section2.notice")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-4 border-b border-stone-200 pb-2">
              {t("full.section3.title")}
            </h2>
            <p>{t("full.section3.body1")}</p>
            <p className="mt-2">
              {t("full.section3.body2")}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <a
                  href="https://policies.google.com/technologies/partner-sites?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#e67e22] hover:underline"
                >
                  {t("full.section3.partnerSitesLinkLabel")}
                </a>
              </li>
              <li>
                <a
                  href="https://policies.google.com/privacy?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#e67e22] hover:underline"
                >
                  {t("full.section3.googlePrivacyLinkLabel")}
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-4 border-b border-stone-200 pb-2">
              {t("full.section4.title")}
            </h2>
            <p>{t("full.section4.body")}</p>

            <h3 className="text-lg font-bold text-stone-700 mt-6 mb-2">
              {t("full.section4.browserSettingsTitle")}
            </h3>
            <p>{t("full.section4.browserSettingsBody")}</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <a href="https://support.google.com/chrome/answer/95647?hl=ja" target="_blank" rel="noopener noreferrer" className="text-[#e67e22] hover:underline">{t("full.section4.browserLinks.chrome")}</a>
              </li>
              <li>
                <a href="https://support.apple.com/ja-jp/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#e67e22] hover:underline">{t("full.section4.browserLinks.safariMac")}</a> / <a href="https://support.apple.com/ja-jp/HT201265" target="_blank" rel="noopener noreferrer" className="text-[#e67e22] hover:underline">{t("full.section4.browserLinks.iphoneIpad")}</a>
              </li>
              <li>
                <a href="https://support.mozilla.org/ja/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-[#e67e22] hover:underline">{t("full.section4.browserLinks.firefox")}</a>
              </li>
              <li>
                <a href="https://support.microsoft.com/ja-jp/microsoft-edge/microsoft-edge-%E3%81%A7-cookie-%E3%82%92%E5%89%8A%E9%99%A4%E3%81%99%E3%82%8B-63947406-40ac-c2b9-25b4-935471955f0e" target="_blank" rel="noopener noreferrer" className="text-[#e67e22] hover:underline">{t("full.section4.browserLinks.edge")}</a>
              </li>
            </ul>

             <h3 className="text-lg font-bold text-stone-700 mt-6 mb-2">
              {t("full.section4.googleOptOutTitle")}
            </h3>
            <p>{t("full.section4.googleOptOutBody")}</p>
             <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noopener noreferrer" className="text-[#e67e22] hover:underline">{t("full.section4.googleOptOutAddonLabel")}</a>
              </li>
             </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2c2c2c] mb-4 border-b border-stone-200 pb-2">
              {t("full.section5.title")}
            </h2>
            <p>
              {t.rich("full.section5.bodyWithContact", {
                contact: () => (
                  <PolicyLink href="/contact">
                    {t("full.section5.contactFormLabel")}
                  </PolicyLink>
                ),
              })}
            </p>
          </section>

          <div className="text-right text-sm text-stone-500 mt-12">
            {t("full.establishedDateLabel")}
            <br />
            {t("full.updatedDateLabel")}
          </div>
        </div>
      </main>
    </div>
  );
}
