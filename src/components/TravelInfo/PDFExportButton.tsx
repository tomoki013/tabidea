"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";
import { TravelInfoCategory, CategoryState } from "./types";
import { downloadBlob } from "@/lib/pdfUtils";
import PDFPreviewModal from "@/components/TravelPlanner/PDFPreviewModal";

interface PDFExportButtonProps {
  destination: string;
  country: string;
  categoryStates: Map<TravelInfoCategory, CategoryState>;
  className?: string;
}

export default function PDFExportButton({
  destination,
  country,
  categoryStates,
  className = "",
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate filename: destination_travel_info_YYYYMMDD.pdf
  const generateFilename = useCallback(() => {
    const sanitizedDestination = destination.replace(/[/\\?%*:|"<>]/g, "-");
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    return `${sanitizedDestination}_travel_info_${dateStr}.pdf`;
  }, [destination]);

  const filename = generateFilename();

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const generatePDF = async () => {
    // Dynamic import to avoid SSR issues
    const { pdf, Font } = await import("@react-pdf/renderer");
    const React = await import("react");

    // Register font (same as in pdfUtils)
    // Note: If Font is already registered globally by other components, this might be redundant but safe
    try {
      Font.register({
        family: "Noto Sans JP",
        src: "/fonts/NotoSansJP-Regular.ttf",
      });
    } catch (e) {
      // Ignore if already registered
      console.warn("Font registration warning:", e);
    }

    const TravelInfoPDFModule = await import("./TravelInfoPDF");
    const TravelInfoPDF = TravelInfoPDFModule.default;

    const pdfElement = React.createElement(TravelInfoPDF, {
      destination,
      country,
      categoryStates,
    });

    // @ts-expect-error - complex type mismatch often happens with dynamic react-pdf imports
    return await pdf(pdfElement).toBlob();
  };

  const handleExportPDF = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const blob = await generatePDF();

      // Explicitly removed Web Share API logic here based on user feedback.
      // Always show preview modal.

      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setPdfBlob(blob);
      setIsModalOpen(true);

    } catch (err) {
      console.error("PDF Generation Error:", err);
      setError(err instanceof Error ? err.message : "PDF生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      downloadBlob(pdfBlob, filename);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isGenerating}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold ${className}`}
          aria-label="PDFとして出力"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span className="text-sm">PDF出力</span>
        </button>
        {error && (
          <p className="mt-1 text-xs text-red-600 font-medium">
            {error}
          </p>
        )}
      </div>

      <PDFPreviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        pdfBlobUrl={pdfBlobUrl}
        filename={filename}
        onDownload={handleDownload}
      />
    </>
  );
}
