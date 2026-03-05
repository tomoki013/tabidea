"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { Itinerary } from '@/types';
import { generatePdfFilename, downloadBlob } from "@/lib/utils";
import { FaFilePdf, FaSpinner } from "react-icons/fa";
import PDFPreviewModal from "./PDFPreviewModal";
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from "@/lib/i18n/locales";
import enFeatureMessages from "@/messages/en/components/features-ui.json";
import jaFeatureMessages from "@/messages/ja/components/features-ui.json";

interface PDFDownloadButtonProps {
  itinerary: Itinerary;
  className?: string;
}

export default function PDFDownloadButton({
  itinerary,
  className = "",
}: PDFDownloadButtonProps) {
  const t = useTranslations("components.features.planner.pdfDownloadButton");
  const pathname = usePathname();
  const locale = getLanguageFromPathname(pathname) ?? DEFAULT_LANGUAGE;
  const messages = (locale === "en" ? enFeatureMessages : jaFeatureMessages) as unknown as AbstractIntlMessages;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const filename = generatePdfFilename(itinerary);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const handlePreviewPDF = async () => {
    try {
      setIsGenerating(true);
      console.log("Starting PDF generation for preview...");

      const { pdf, Font } = await import("@react-pdf/renderer");
      const React = await import("react");

      // Register font if not already registered (checking not strictly needed as it's idempotent or handled)
      try {
        Font.register({
            family: "Noto Sans JP",
            src: "/fonts/NotoSansJP-Regular.ttf",
        });
      } catch (e) {
         // ignore
      }

      const ItineraryPDFModule = await import("./ItineraryPDF");
      const ItineraryPDF = ItineraryPDFModule.default;

      const pdfElement = React.createElement(ItineraryPDF, {
        itinerary,
        locale,
        messages,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(pdfElement as any).toBlob();
      console.log("PDF blob generated successfully", blob.size, "bytes");

      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setPdfBlob(blob);
      setIsModalOpen(true);

    } catch (error) {
      console.error("PDF generation failed:", error);
      const errorMessage =
        error instanceof Error
          ? t("generateFailedWithMessage", { message: error.message })
          : t("generateFailed");
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      downloadBlob(pdfBlob, filename);
    }
  };

  return (
    <>
      <div className={className}>
        <h4 className="text-sm font-bold text-stone-600 mb-3 text-center sm:text-left flex items-center gap-2">
          <FaFilePdf /> {t("heading")}
        </h4>
        <button
          onClick={handlePreviewPDF}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          aria-label={t("ariaLabel")}
        >
          {isGenerating ? (
            <>
              <FaSpinner className="animate-spin" size={18} />
              <span className="text-sm">{t("generating")}</span>
            </>
          ) : (
            <>
              <FaFilePdf size={18} />
              <span className="text-sm">{t("label")}</span>
            </>
          )}
        </button>
      </div>

      <PDFPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfBlobUrl={pdfBlobUrl}
        filename={filename}
        onDownload={handleDownload}
      />
    </>
  );
}
