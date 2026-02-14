"use client";

import { useEffect, useCallback } from "react";
import { FaDownload, FaTimes, FaShareAlt, FaFilePdf, FaCheckCircle } from "react-icons/fa";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlobUrl: string | null;
  filename: string;
  onDownload: () => void;
  onShare?: () => void;
  enablePreview?: boolean;
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  pdfBlobUrl,
  filename,
  onDownload,
  onShare,
  enablePreview = true,
}: PDFPreviewModalProps) {
  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`relative z-10 w-full ${enablePreview ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300 transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2
            id="pdf-preview-title"
            className="text-lg font-bold text-stone-800 truncate pr-4"
          >
            {enablePreview ? filename : "PDF生成完了"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors"
            aria-label="閉じる"
          >
            <FaTimes className="text-stone-600" size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-4 bg-stone-100 overflow-y-auto">
          {enablePreview ? (
            pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full min-h-[60vh] rounded-lg border border-stone-200 bg-white"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[60vh] text-stone-500">
                PDFを読み込み中...
              </div>
            )
          ) : (
             <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                 <FaCheckCircle className="text-green-600" size={40} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">PDFの準備ができました</h3>
              <p className="text-stone-600 mb-8 max-w-xs mx-auto">
                旅程表のPDFファイルが正常に生成されました。以下のボタンから共有または保存してください。
              </p>

              <div className="bg-white p-4 rounded-xl border border-stone-200 w-full max-w-xs flex items-center gap-3 shadow-sm mb-4">
                 <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaFilePdf className="text-red-600" size={20} />
                 </div>
                 <div className="text-left overflow-hidden">
                    <p className="font-bold text-stone-800 truncate text-sm">{filename}</p>
                    <p className="text-xs text-stone-500">PDF Document</p>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex-wrap">
           <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full border-2 border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
          >
            閉じる
          </button>

           {/* Download Button - Secondary if Share is available */}
           <button
            onClick={onDownload}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-colors font-bold ${
               onShare
               ? "bg-stone-200 hover:bg-stone-300 text-stone-700"
               : "bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md hover:shadow-lg"
            }`}
          >
            <FaDownload size={16} />
            <span>保存</span>
          </button>

          {/* Share Button - Primary if available */}
          {onShare && (
             <button
              onClick={onShare}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors shadow-md hover:shadow-lg font-bold"
            >
              <FaShareAlt size={16} />
              <span>共有</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
