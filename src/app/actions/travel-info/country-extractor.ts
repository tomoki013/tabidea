/**
 * 目的地から国名を抽出するモジュール
 */

import { createTranslator } from "next-intl";
import { getTravelInfoGenerator } from '@/lib/services/ai/travel-info-generator';
import type { LanguageCode } from "@/lib/i18n/locales";
import enMessages from "@/messages/en/actions/travel-info-country-extractor.json";
import jaMessages from "@/messages/ja/actions/travel-info-country-extractor.json";
import { logInfo, logWarn } from './logger';

// ============================================
// 定数
// ============================================

const COUNTRY_EXTRACTOR_MESSAGES = {
  en: enMessages,
  ja: jaMessages,
} as const;

type CountryExtractorLocale = keyof typeof COUNTRY_EXTRACTOR_MESSAGES;
type CountryExtractorDictionary = {
  knownCityToCountry: Record<string, string>;
  commonCountries: string[];
};

const dictionaryCache = new Map<CountryExtractorLocale, CountryExtractorDictionary>();

function resolveLocaleFromDestination(destination: string): CountryExtractorLocale {
  return /[ぁ-んァ-ン一-龯]/.test(destination) ? "ja" : "en";
}

function getCountryExtractorDictionary(
  locale: CountryExtractorLocale
): CountryExtractorDictionary {
  const cached = dictionaryCache.get(locale);
  if (cached) {
    return cached;
  }

  const t = createTranslator({
    locale: locale as LanguageCode,
    messages: COUNTRY_EXTRACTOR_MESSAGES[locale],
    namespace: "actions.travelInfoCountryExtractor",
  });

  const dictionary: CountryExtractorDictionary = {
    knownCityToCountry: t.raw("knownCityToCountry") as Record<string, string>,
    commonCountries: t.raw("commonCountries") as string[],
  };

  dictionaryCache.set(locale, dictionary);
  return dictionary;
}

// インフライトリクエスト用キャッシュ
const countryExtractionCache = new Map<string, Promise<string>>();

// ============================================
// 関数
// ============================================

/**
 * 目的地から国名を抽出
 *
 * 1. 既知のマッピングをチェック
 * 2. 国名リストと照合
 * 3. AIで抽出
 */
export async function extractCountryFromDestination(
  destination: string
): Promise<string> {
  const normalized = destination.trim();
  const locale = resolveLocaleFromDestination(normalized);
  const { knownCityToCountry, commonCountries } = getCountryExtractorDictionary(locale);

  // 既知のマッピングをチェック
  if (knownCityToCountry[normalized]) {
    logInfo('extractCountry', 'resolved_from_known_mapping', {
      destination: normalized,
      country: knownCityToCountry[normalized],
    });
    return knownCityToCountry[normalized];
  }

  // 国名リストと照合
  if (commonCountries.includes(normalized)) {
    logInfo('extractCountry', 'recognized_as_country_name', { destination: normalized });
    return normalized;
  }

  // インフライトリクエストのキャッシュをチェック
  if (countryExtractionCache.has(normalized)) {
    logInfo('extractCountry', 'reused_inflight_promise_from_cache', {
      destination: normalized,
    });
    return countryExtractionCache.get(normalized)!;
  }

  // AIで抽出
  const extractionPromise = (async () => {
    try {
      logInfo('extractCountry', 'ai_country_extraction_started', { destination: normalized });
      const generator = getTravelInfoGenerator();
      return await generator.extractCountry(normalized);
    } catch (error) {
      logWarn('extractCountry', 'ai_country_extraction_failed_fallback', {
        destination: normalized,
        error: String(error),
      });
      return normalized; // フォールバック
    } finally {
      // 完了後はキャッシュから削除
      countryExtractionCache.delete(normalized);
    }
  })();

  // キャッシュに保存
  countryExtractionCache.set(normalized, extractionPromise);

  return extractionPromise;
}

/**
 * 既知の国名マッピングを取得（テスト用）
 */
export function getKnownMappings(): Record<string, string> {
  const { knownCityToCountry } = getCountryExtractorDictionary("ja");
  return { ...knownCityToCountry };
}

/**
 * 既知の国名リストを取得（テスト用）
 */
export function getCommonCountries(): string[] {
  const { commonCountries } = getCountryExtractorDictionary("ja");
  return [...commonCountries];
}
