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

      // IMPORTANT: Open window IMMEDIATELY on user click to avoid popup blocker
      // We'll load the PDF content into it after generation
      const newWindow = window.open('about:blank', '_blank');

      if (!newWindow) {
        // If popup was blocked even on immediate open, fall back to download
        console.log("Popup blocked, falling back to download");
        await generateAndDownloadPDF();
        return;
      }

      // Show loading message in the new window
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>PDF生成中...</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .loader {
                text-align: center;
                color: white;
              }
              .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <h2>PDFを生成しています...</h2>
              <p>しばらくお待ちください</p>
            </div>
          </body>
        </html>
      `);

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

      // Create URL and load it into the already-open window
      const url = URL.createObjectURL(blob);

      // Navigate the opened window to the PDF
      newWindow.location.href = url;

      // Clean up URL after a delay to ensure the window loads
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
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

  // Fallback function for when popup is blocked
  const generateAndDownloadPDF = async () => {
    try {
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
      const blob = await pdf(pdfElement as any).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = `${itinerary.destination.replace(/[/\\?%*:|"<>]/g, "-")}_旅程.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("ポップアップがブロックされたため、ダウンロードを開始しました。");
    } catch (error) {
      console.error("PDF download failed:", error);
      throw error;
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
