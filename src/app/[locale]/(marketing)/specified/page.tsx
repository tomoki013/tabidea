import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import PolicyLink from "@/components/ui/PolicyLink";
import { getRequestLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.marketing.specifiedLegal");
  return { title: t("metaTitle") };
}

export default async function SpecifiedPage() {
  const language = await getRequestLanguage();
  const t = await getTranslations("pages.marketing.specifiedLegal");

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

        <div className="space-y-6 text-stone-600 leading-relaxed">
          <dl className="divide-y divide-stone-100">
            <InfoRow
              label={t("full.rows.businessLabel")}
              value={t("full.rows.businessValue")}
            />
            <InfoRow
              label={t("full.rows.addressLabel")}
              value={t("full.rows.addressValue")}
            />
            <InfoRow
              label={t("full.rows.operatorLabel")}
              value={t("full.rows.operatorValue")}
            />
            <InfoRow
              label={t("full.rows.contactLabel")}
              value={
                <div className="space-y-1">
                  <p>{t("full.rows.phoneValue")}</p>
                  <p className="text-sm text-stone-500">
                    {t("full.rows.phoneNote")}
                  </p>
                  <p>{t("full.rows.emailValue")}</p>
                  <p>
                    <PolicyLink href="/contact">
                      {t("full.rows.contactFormLabel")}
                    </PolicyLink>
                  </p>
                </div>
              }
            />
            <InfoRow
              label={t("full.rows.salesAndFeesLabel")}
              value={
                <div className="space-y-2">
                  <p>{t("full.rows.salesAndFeesLine1")}</p>
                  <p>{t("full.rows.salesAndFeesLine2")}</p>
                  <p>{t("full.rows.salesAndFeesLine3")}</p>
                </div>
              }
            />
            <InfoRow
              label={t("full.rows.deliveryTimingLabel")}
              value={t("full.rows.deliveryTimingValue")}
            />
            <InfoRow
              label={t("full.rows.paymentMethodLabel")}
              value={t("full.rows.paymentMethodValue")}
            />
            <InfoRow
              label={t("full.rows.paymentTimingLabel")}
              value={
                <div className="space-y-2">
                  <p>{t("full.rows.paymentTimingLine1")}</p>
                  <p>{t("full.rows.paymentTimingLine2")}</p>
                  <p>{t("full.rows.paymentTimingLine3")}</p>
                </div>
              }
            />
            <InfoRow
              label={t("full.rows.refundLabel")}
              value={
                <div className="space-y-2">
                  <p>{t("full.rows.refundLine1")}</p>
                  <p>{t("full.rows.refundLine2")}</p>
                  <p>{t("full.rows.refundLine3")}</p>
                </div>
              }
            />
            <InfoRow
              label={t("full.rows.environmentLabel")}
              value={
                <div className="space-y-2">
                  <p>{t("full.rows.environmentLine1")}</p>
                  <p>{t("full.rows.environmentLine2")}</p>
                  <div className="mt-2">
                    <p className="font-semibold text-stone-800">{t("full.rows.webLabel")}</p>
                    <ul className="list-disc list-inside ml-1 space-y-1">
                      <li>{t("full.rows.webItemMac")}</li>
                      <li>{t("full.rows.webItemWindows")}</li>
                      <li>{t("full.rows.webItemIos")}</li>
                      <li>{t("full.rows.webItemAndroid")}</li>
                    </ul>
                  </div>
                </div>
              }
            />
          </dl>

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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
      <dt className="text-sm font-bold leading-6 text-[#2c2c2c] sm:col-span-1">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-stone-600 sm:col-span-2 sm:mt-0">
        {value}
      </dd>
    </div>
  );
}
