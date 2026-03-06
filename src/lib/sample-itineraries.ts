import { Itinerary } from "@/types";
import * as fs from "fs/promises";
import * as path from "path";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/i18n/locales";

/**
 * IDでサンプルプランの旅程を取得 (Async)
 * Server Componentでのみ使用可能
 */
export async function getSampleItinerary(sampleId: string): Promise<Itinerary | undefined> {
  return getSampleItineraryByLanguage(sampleId, DEFAULT_LANGUAGE);
}

export async function getSampleItineraryByLanguage(
  sampleId: string,
  language: LanguageCode = DEFAULT_LANGUAGE
): Promise<Itinerary | undefined> {
  const candidates = [
    path.join(process.cwd(), "src/data/itineraries", language, `${sampleId}.json`),
    path.join(process.cwd(), "src/data/itineraries", `${sampleId}.json`),
  ];

  for (const filePath of candidates) {
    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      return JSON.parse(fileContent) as Itinerary;
    } catch {
      // Try next candidate.
    }
  }

  return undefined;
}
