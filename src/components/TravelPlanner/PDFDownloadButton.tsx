"use client";

import { useState } from "react";
import { Itinerary } from "@/lib/types";
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

      // Dynamically import PDF libraries to avoid SSR issues
      console.log("Importing PDF libraries...");
      const { pdf, Font } = await import("@react-pdf/renderer");
      const React = await import("react");

      // Register Japanese font
      console.log("Registering Japanese font...");
      Font.register({
        family: "Noto Sans JP",
        src: "/fonts/NotoSansJP-Regular.ttf",
      });
      console.log("Font registered successfully");

      const ItineraryPDFModule = await import("./ItineraryPDF");
      const ItineraryPDF = ItineraryPDFModule.default;
      console.log("PDF libraries imported successfully");

      // Generate PDF blob using createElement to avoid JSX typing issues
      console.log("Creating PDF element...");
      const pdfElement = React.createElement(ItineraryPDF, { itinerary });
      console.log("Generating PDF blob...");
      const blob = await pdf(pdfElement as any).toBlob();
      console.log("PDF blob generated successfully", blob.size, "bytes");

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Create filename from destination and date
      const filename = `${itinerary.destination.replace(/[/\\?%*:|"<>]/g, "-")}_旅程.pdf`;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
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
