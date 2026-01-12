"use client";

import { useState } from "react";
import { Itinerary } from "@/lib/types";
import { generatePdfFilename } from "@/lib/pdfUtils";
import { FaFilePdf, FaSpinner } from "react-icons/fa";

interface PDFDownloadButtonProps {
  itinerary: Itinerary;
  className?: string;
}

export default function PDFDownloadButton({
  itinerary,
  className = "",
}: PDFDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      console.log("Starting PDF generation...");

      // Always download PDF directly to ensure it's accessible after refresh/sharing
      // Blob URLs in new windows are lost on refresh, so we use direct download instead
      await generateAndDownloadPDF();
    } catch (error) {
      console.error("PDF generation failed:", error);

      // Provide more detailed error message
      const errorMessage =
        error instanceof Error
          ? `PDFの生成に失敗しました: ${error.message}`
          : "PDFの生成に失敗しました。もう一度お試しください。";

      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate and download PDF file directly
  const generateAndDownloadPDF = async () => {
    console.log("Generating PDF for download...");
    const { pdf, Font } = await import("@react-pdf/renderer");
    const React = await import("react");

    Font.register({
      family: "Noto Sans JP",
      src: "/fonts/NotoSansJP-Regular.ttf",
    });

    const ItineraryPDFModule = await import("./ItineraryPDF");
    const ItineraryPDF = ItineraryPDFModule.default;

    const pdfElement = React.createElement(ItineraryPDF, { itinerary });
    const pdfBlob = await pdf(pdfElement as any).toBlob();
    console.log("PDF blob generated successfully", pdfBlob.size, "bytes");

    // Force download by changing MIME type to octet-stream
    // This prevents browsers from opening PDF inline instead of downloading
    const downloadBlob = new Blob([pdfBlob], { type: "application/octet-stream" });
    const url = URL.createObjectURL(downloadBlob);
    const link = document.createElement("a");
    link.href = url;
    const filename = generatePdfFilename(itinerary);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={className}>
      <h4 className="text-sm font-bold text-stone-600 mb-3 text-center sm:text-left flex items-center gap-2">
        <FaFilePdf /> Download
      </h4>
      <button
        onClick={handleDownloadPDF}
        disabled={isGenerating}
        className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        aria-label="Download PDF"
      >
        {isGenerating ? (
          <>
            <FaSpinner className="animate-spin" size={18} />
            <span className="text-sm">生成中...</span>
          </>
        ) : (
          <>
            <FaFilePdf size={18} />
            <span className="text-sm">PDF出力</span>
          </>
        )}
      </button>
    </div>
  );
}
