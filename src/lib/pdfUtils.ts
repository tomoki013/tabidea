import type { Itinerary } from "@/lib/types";

/**
 * Generate a PDF blob from an itinerary using @react-pdf/renderer
 * This function dynamically imports the renderer to avoid SSR issues
 */
export async function generateTravelPlanPdf(
  itinerary: Itinerary
): Promise<Blob> {
  const { pdf, Font } = await import("@react-pdf/renderer");
  const React = await import("react");

  // Register Japanese font
  Font.register({
    family: "Noto Sans JP",
    src: "/fonts/NotoSansJP-Regular.ttf",
  });

  // Dynamically import the PDF document component
  const ItineraryPDFModule = await import(
    "@/components/TravelPlanner/ItineraryPDF"
  );
  const ItineraryPDF = ItineraryPDFModule.default;

  // Create React element and generate PDF blob
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement = React.createElement(ItineraryPDF, { itinerary }) as any;
  const pdfBlob = await pdf(pdfElement).toBlob();

  return pdfBlob;
}

/**
 * Generate a filename for the PDF based on the itinerary destination and current timestamp
 */
export function generatePdfFilename(itinerary: Itinerary): string {
  const sanitizedDestination = itinerary.destination.replace(
    /[/\\?%*:|"<>]/g,
    "-"
  );

  // Generate timestamp in YYYYMMDD_HHMMSS format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

  return `${sanitizedDestination}_${timestamp}.pdf`;
}

/**
 * Trigger a file download from a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Force download by changing MIME type to octet-stream
  const downloadBlob = new Blob([blob], { type: "application/octet-stream" });
  const url = URL.createObjectURL(downloadBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
