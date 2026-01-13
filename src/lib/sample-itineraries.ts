/**
 * 事前生成済みサンプルプラン旅程データ
 *
 * これらの旅程はAIを使用して事前に生成されています。
 * 新しい旅程を生成するには以下のコマンドを実行:
 * npx tsx src/scripts/generate-sample-itineraries.ts <sample-id>
 */

import { Itinerary } from "./types";

// 自動生成されたJSONデータをインポート
import sampleItinerariesData from "../data/sample-itineraries.json";

/**
 * サンプルIDから事前生成済み旅程を取得
 */
export function getSampleItinerary(sampleId: string): Itinerary | undefined {
  const data = sampleItinerariesData as Record<string, Itinerary>;
  return data[sampleId];
}

/**
 * 全ての事前生成済み旅程を取得
 */
export function getAllSampleItineraries(): Record<string, Itinerary> {
  return sampleItinerariesData as Record<string, Itinerary>;
}

/**
 * 事前生成済み旅程があるサンプルIDのリストを取得
 */
export function getAvailableSampleIds(): string[] {
  return Object.keys(sampleItinerariesData);
}
