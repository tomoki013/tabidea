import {
  getHomeBaseCityRecordsForRegion,
  type HomeBaseCityRecord,
} from "@/lib/i18n/home-base-cities";
import type { RegionCode, UiLanguage } from "@/lib/i18n/regions";

export type HomeBaseCitySearchOption = {
  value: string;
  label: string;
};

export const INITIAL_HOME_BASE_CITY_OPTION_LIMIT = 24;
export const SEARCH_HOME_BASE_CITY_OPTION_LIMIT = 60;

type IndexedHomeBaseCityOption = {
  value: string;
  label: string;
  defaultOrder: number;
  normalizedValue: string;
  normalizedLabel: string;
  normalizedJaName: string;
  normalizedEnName: string;
  normalizedAreaJa: string;
  normalizedAreaEn: string;
  jaTokens: string[];
  enTokens: string[];
};

const cityIndexCache = new Map<string, IndexedHomeBaseCityOption[]>();

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[\s\-_/(),.]+/)
    .filter(Boolean);
}

function getLocalizedCityName(record: HomeBaseCityRecord, language: UiLanguage): string {
  return language === "en" ? record.nameEn : record.nameJa;
}

function getLocalizedAreaName(record: HomeBaseCityRecord, language: UiLanguage): string {
  return language === "en" ? record.areaEn ?? "" : record.areaJa ?? "";
}

function buildCityLabel(record: HomeBaseCityRecord, language: UiLanguage): string {
  const cityName = getLocalizedCityName(record, language);
  const areaName = getLocalizedAreaName(record, language);

  return areaName ? `${cityName} (${areaName})` : cityName;
}

function buildCityIndex(region: RegionCode, language: UiLanguage): IndexedHomeBaseCityOption[] {
  const records = getHomeBaseCityRecordsForRegion(region);

  return records.map((record, index) => {
    const value = getLocalizedCityName(record, language);
    const label = buildCityLabel(record, language);
    const jaTerms = [
      record.nameJa,
      record.areaJa ?? "",
      ...(record.aliasesJa ?? []),
      ...(record.aliasesEn ?? []),
    ].join(" ");
    const enTerms = [
      record.nameEn,
      record.areaEn ?? "",
      ...(record.aliasesEn ?? []),
      ...(record.aliasesJa ?? []),
    ].join(" ");

    return {
      value,
      label,
      defaultOrder: index,
      normalizedValue: normalizeText(value),
      normalizedLabel: normalizeText(label),
      normalizedJaName: normalizeText(record.nameJa),
      normalizedEnName: normalizeText(record.nameEn),
      normalizedAreaJa: normalizeText(record.areaJa ?? ""),
      normalizedAreaEn: normalizeText(record.areaEn ?? ""),
      jaTokens: tokenize(jaTerms),
      enTokens: tokenize(enTerms),
    };
  });
}

function getCityIndex(region: RegionCode, language: UiLanguage): IndexedHomeBaseCityOption[] {
  const cacheKey = `${region}:${language}`;
  const cached = cityIndexCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const built = buildCityIndex(region, language);
  cityIndexCache.set(cacheKey, built);
  return built;
}

function hasTokenPrefix(tokens: string[], query: string): boolean {
  return tokens.some((token) => token.startsWith(query));
}

function scoreCity(option: IndexedHomeBaseCityOption, query: string): number {
  if (option.normalizedValue === query) {
    return 1000;
  }
  if (option.normalizedLabel.startsWith(query)) {
    return 930;
  }
  if (
    option.normalizedJaName.startsWith(query) ||
    option.normalizedEnName.startsWith(query)
  ) {
    return 900;
  }
  if (
    option.normalizedAreaJa.startsWith(query) ||
    option.normalizedAreaEn.startsWith(query)
  ) {
    return 850;
  }
  if (hasTokenPrefix(option.jaTokens, query) || hasTokenPrefix(option.enTokens, query)) {
    return 760;
  }
  if (
    option.normalizedLabel.includes(query) ||
    option.normalizedJaName.includes(query) ||
    option.normalizedEnName.includes(query)
  ) {
    return 620;
  }
  if (
    option.normalizedAreaJa.includes(query) ||
    option.normalizedAreaEn.includes(query)
  ) {
    return 560;
  }

  return 0;
}

function toSearchOption(option: IndexedHomeBaseCityOption): HomeBaseCitySearchOption {
  return {
    value: option.value,
    label: option.label,
  };
}

export function getInitialHomeBaseCityOptions(
  region: RegionCode,
  language: UiLanguage,
  limit = INITIAL_HOME_BASE_CITY_OPTION_LIMIT
): HomeBaseCitySearchOption[] {
  if (limit <= 0) {
    return [];
  }

  return getCityIndex(region, language).slice(0, limit).map(toSearchOption);
}

export function searchHomeBaseCityOptions(
  region: RegionCode,
  language: UiLanguage,
  query: string,
  limit = SEARCH_HOME_BASE_CITY_OPTION_LIMIT
): HomeBaseCitySearchOption[] {
  if (limit <= 0) {
    return [];
  }

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return getInitialHomeBaseCityOptions(region, language, limit);
  }

  return getCityIndex(region, language)
    .map((option) => ({
      option,
      score: scoreCity(option, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return left.option.defaultOrder - right.option.defaultOrder;
    })
    .slice(0, limit)
    .map((entry) => toSearchOption(entry.option));
}
