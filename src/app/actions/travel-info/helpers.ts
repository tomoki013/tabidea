/**
 * travel-info用ヘルパー関数
 */

import { createTranslator } from "next-intl";
import type {
  TravelInfoCategory,
  TravelInfoSource,
  SourceType,
} from '@/types';
import type { ParsedSource } from '@/lib/services/ai/schemas/travel-info-schemas';
import type { LanguageCode } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/actions/travel-info.json";
import jaMessages from "@/messages/ja/actions/travel-info.json";

const TRAVEL_INFO_HELPER_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

type TravelInfoLocale = keyof typeof TRAVEL_INFO_HELPER_MESSAGES;
type TravelInfoTranslator = (
  key: string,
  values?: Record<string, unknown>
) => string;

function resolveTravelInfoLocale(locale?: string): TravelInfoLocale {
  return locale === "en" ? "en" : "ja";
}

function createTravelInfoTranslator(locale?: string) {
  const resolvedLocale = resolveTravelInfoLocale(locale);
  const rawT = createTranslator({
    locale: resolvedLocale as LanguageCode,
    messages: TRAVEL_INFO_HELPER_MESSAGES[resolvedLocale],
    namespace: "actions.travelInfo",
  });

  const t: TravelInfoTranslator = (key, values) => {
    if (values) {
      return rawT(key as never, values as never);
    }
    return rawT(key as never);
  };

  return t;
}

// ============================================
// ソース関連
// ============================================

/**
 * Get source display label by locale
 */
export function getSourceName(type: SourceType, locale?: string): string {
  const t = createTravelInfoTranslator(locale);

  switch (type) {
    case 'official_api':
      return t("sourceNames.official_api");
    case 'web_search':
      return t("sourceNames.web_search");
    case 'ai_generated':
      return t("sourceNames.ai_generated");
    case 'blog':
      return t("sourceNames.blog");
    default:
      return t("sourceNames.unknown");
  }
}

/**
 * パースされたソースタイプをSourceTypeにマッピング
 */
export function mapParsedSourceTypeToSourceType(
  parsedType: 'official' | 'news' | 'commercial' | 'personal',
  fetchSourceType: SourceType
): SourceType {
  // AI生成の場合はそのままfetchSourceTypeを使用
  if (fetchSourceType === 'ai_generated') {
    return 'ai_generated';
  }

  // それ以外はパースされたタイプに基づいて判断
  switch (parsedType) {
    case 'official':
      return 'official_api';
    case 'news':
    case 'commercial':
      return 'web_search';
    case 'personal':
      return 'blog';
    default:
      return fetchSourceType;
  }
}

/**
 * ソースタイプに基づく信頼性スコア
 */
export function getReliabilityScoreByType(
  type: 'official' | 'news' | 'commercial' | 'personal'
): number {
  switch (type) {
    case 'official':
      return 95;
    case 'news':
      return 80;
    case 'commercial':
      return 70;
    case 'personal':
      return 50;
    default:
      return 60;
  }
}

/**
 * ParsedSourceをTravelInfoSourceに変換
 */
export function convertParsedSourcesToTravelInfoSources(
  parsedSources: ParsedSource[],
  fetchSourceType: SourceType
): TravelInfoSource[] {
  return parsedSources.map((source) => ({
    sourceType: mapParsedSourceTypeToSourceType(source.type, fetchSourceType),
    sourceName: source.name,
    sourceUrl: source.url || undefined,
    retrievedAt: new Date(),
    reliabilityScore: getReliabilityScoreByType(source.type),
  }));
}

/**
 * 複数ソースからの情報をマージ・重複排除
 */
export function mergeInfoSources(sources: TravelInfoSource[]): TravelInfoSource[] {
  const uniqueSources = new Map<string, TravelInfoSource>();

  for (const source of sources) {
    const key = source.sourceUrl || source.sourceName;
    const existing = uniqueSources.get(key);

    if (!existing || source.reliabilityScore > existing.reliabilityScore) {
      uniqueSources.set(key, source);
    }
  }

  // 信頼性スコア順にソート
  return Array.from(uniqueSources.values()).sort(
    (a, b) => b.reliabilityScore - a.reliabilityScore
  );
}

// ============================================
// 信頼性関連
// ============================================

/**
 * 総合信頼性スコアを計算
 */
export function calculateOverallReliability(
  confidenceScores: number[]
): number {
  if (confidenceScores.length === 0) {
    return 0;
  }

  const totalScore = confidenceScores.reduce((sum, score) => sum + score, 0);
  return Math.round(totalScore / confidenceScores.length);
}

// ============================================
// 免責事項
// ============================================

/**
 * 免責事項を生成
 */
export function generateDisclaimer(
  reliability: number,
  categories: TravelInfoCategory[],
  locale?: string
): string {
  const t = createTravelInfoTranslator(locale);
  const hasSafetyInfo = categories.includes('safety');
  const hasVisaInfo = categories.includes('visa');

  let disclaimer = t("disclaimer.base");

  if (reliability < 50) {
    disclaimer += t("disclaimer.lowReliability");
  }

  if (hasSafetyInfo) {
    disclaimer += t("disclaimer.safety");
  }

  if (hasVisaInfo) {
    disclaimer += t("disclaimer.visa");
  }

  disclaimer += t("disclaimer.final");

  return disclaimer;
}

// ============================================
// ユーティリティ
// ============================================

/**
 * スリープ関数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
