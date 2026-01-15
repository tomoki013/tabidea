import { Itinerary } from "./types";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * IDでサンプルプランの旅程を取得 (Async)
 * Server Componentでのみ使用可能
 */
export async function getSampleItinerary(sampleId: string): Promise<Itinerary | undefined> {
  try {
    const filePath = path.join(process.cwd(), "src/data/itineraries", `${sampleId}.json`);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as Itinerary;
  } catch (error) {
    // ファイルが存在しない場合やパースエラーの場合はundefinedを返す
    // console.warn(`Itinerary not found for ${sampleId}`);
    return undefined;
  }
}
