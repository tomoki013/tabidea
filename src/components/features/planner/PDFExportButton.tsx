"use client";

import { useState, useCallback, useEffect } from "react";
import { Itinerary } from '@/types';
import {
  generateTravelPlanPdf,
  generatePdfFilename,
  downloadBlob,
} from "@/lib/utils";
import { FaFilePdf, FaSpinner } from "react-icons/fa";
import PDFPreviewModal from "./PDFPreviewModal";

interface PDFExportButtonProps {
  itinerary: Itinerary;
  className?: string;
}

/**
 * PDF Export Button with responsive behavior:
 * - Mobile (Web Share API supported): Opens native share sheet
 * - Desktop/Tablet: Shows modal with PDF preview and download option
 */
export default function PDFExportButton({
  itinerary,
  className = "",
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filename = generatePdfFilename(itinerary);

  // Cleanup blob URL when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Check if Web Share API is available and supports file sharing
  const canUseWebShare = useCallback((): boolean => {
    if (typeof navigator === "undefined" || !navigator.share) {
      return false;
    }

    // Check if canShare is available (indicates file sharing support)
    if (typeof navigator.canShare === "function") {
      // Create a test file to check if sharing files is supported
      const testFile = new File(["test"], "test.pdf", {
        type: "application/pdf",
      });
      return navigator.canShare({ files: [testFile] });
    }

    return false;
  }, []);

  // Handle mobile share via Web Share API
  const handleMobileShare = useCallback(
    async (blob: Blob) => {
      try {
        const file = new File([blob], filename, { type: "application/pdf" });

        await navigator.share({
          files: [file],
          title: `${itinerary.destination} 旅程表`,
        });
      } catch (shareError) {
        // User cancelled share or share failed
        if (shareError instanceof Error) {
          // AbortError means user cancelled - this is not an error
          if (shareError.name === "AbortError") {
            console.log("Share cancelled by user");
            return;
          }
          console.error("Share failed:", shareError.message);
        }
      }
    },
    [filename, itinerary.destination]
  );

  // Handle desktop modal preview
  const handleDesktopPreview = useCallback((blob: Blob) => {
    // Revoke previous URL if exists
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }

    // Create blob URL for preview (use original PDF MIME type for iframe display)
    const url = URL.createObjectURL(blob);
    setPdfBlobUrl(url);
    setPdfBlob(blob);
    setIsModalOpen(true);
  }, [pdfBlobUrl]);

  // Main export handler
  const handleExportPDF = useCallback(async () => {
    setError(null);
    setIsGenerating(true);

    try {
      console.log("Starting PDF generation...");
      const blob = await generateTravelPlanPdf(itinerary);
      console.log("PDF generated successfully:", blob.size, "bytes");

      if (canUseWebShare()) {
        // Mobile: Use Web Share API
        await handleMobileShare(blob);
      } else {
        // Desktop/Tablet: Show modal with preview
        handleDesktopPreview(blob);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      const errorMessage =
        err instanceof Error
          ? `PDFの生成に失敗しました: ${err.message}`
          : "PDFの生成に失敗しました。もう一度お試しください。";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [itinerary, canUseWebShare, handleMobileShare, handleDesktopPreview]);

  // Handle download from modal
  const handleDownload = useCallback(() => {
    if (pdfBlob) {
      downloadBlob(pdfBlob, filename);
    }
  }, [pdfBlob, filename]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Cleanup blob URL after a short delay to allow animation
    setTimeout(() => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
        setPdfBlob(null);
      }
    }, 300);
  }, [pdfBlobUrl]);

  return (
    <>
      <div className={className}>
        <h4 className="text-sm font-bold text-stone-600 mb-3 text-center sm:text-left flex items-center gap-2">
          <FaFilePdf /> Download
        </h4>
        <button
          onClick={handleExportPDF}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          aria-label="PDFとして出力"
          aria-busy={isGenerating}
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
        {error && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* PDF Preview Modal for Desktop/Tablet */}
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
