/**
 * 渡航情報ユーティリティ関数
 */

import type {
  TravelInfoCategory,
  TravelInfoResponse,
  TravelInfoSource,
  CategoryDataEntry,
  SourceType,
} from '@/lib/types/travel-info';

/**
 * カテゴリデータをシリアライズ可能な形式に変換
 * （MapはJSONシリアライズできないため）
 */
export function serializeTravelInfoResponse(
  response: TravelInfoResponse
): Record<string, unknown> {
  const categoriesObj: Record<string, CategoryDataEntry> = {};
  response.categories.forEach((value, key) => {
    categoriesObj[key] = value;
  });

  return {
    ...response,
    categories: categoriesObj,
    generatedAt: response.generatedAt.toISOString(),
    sources: response.sources.map((s) => ({
      ...s,
      retrievedAt: s.retrievedAt.toISOString(),
    })),
  };
}

/**
 * シリアライズされたレスポンスをTravelInfoResponseに復元
 */
export function deserializeTravelInfoResponse(
  data: Record<string, unknown>
): TravelInfoResponse {
  const categoriesMap = new Map<TravelInfoCategory, CategoryDataEntry>();
  const categoriesObj = data.categories as Record<string, CategoryDataEntry>;

  for (const [key, value] of Object.entries(categoriesObj)) {
    categoriesMap.set(key as TravelInfoCategory, {
      ...value,
      source: {
        ...value.source,
        retrievedAt: new Date(value.source.retrievedAt as unknown as string),
      },
    });
  }

  const sources = (data.sources as Array<Record<string, unknown>>).map((s) => ({
    sourceType: s.sourceType as SourceType,
    sourceName: s.sourceName as string,
    sourceUrl: s.sourceUrl as string | undefined,
    retrievedAt: new Date(s.retrievedAt as string),
    reliabilityScore: s.reliabilityScore as number,
  }));

  return {
    destination: data.destination as string,
    country: data.country as string,
    categories: categoriesMap,
    sources,
    generatedAt: new Date(data.generatedAt as string),
    disclaimer: data.disclaimer as string,
  };
}
